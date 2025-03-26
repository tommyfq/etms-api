const moment = require('moment');

const db = require("../models");
const Asset = db.assets;
const Ticket = db.tickets;
const Item = db.items;
const DC = db.dcs;
const Store = db.stores;
const TicketAttachment = db.tickets_attachment;
const TicketLog = db.ticket_logs;
const Company = db.ticket_logs;
const User = db.users;
const Part = db.parts;
const Diagnostic = db.diagnostics;

const Op = db.Sequelize.Op;
const fs = require("fs");
const path = require("path");
const reader = require('xlsx');
const { sequelize, Sequelize } = require("../models");
const {storeImages} = require("../middleware/upload");
const { createPagination, createPaginationNoData } = require("../helpers/pagination");

const {sendEmail} = require('../services/email.services')

const { toTitleCase } = require('../helpers/general')

async function generateTicketNumber() {
    // Use moment to get the current date in YYMMDD format
    const datePrefix = moment().utcOffset(7).format('YYMMDD');
  
    // Get the last ticket number for today
    const lastTicket = await Ticket.findOne({
      where: {
        ticket_no: {
          [Sequelize.Op.like]: `${datePrefix}%` // Find tickets starting with the date prefix
        }
      },
      order: [['ticket_no', 'DESC']] // Get the most recent ticket
    });
  
    let nextNumber = '001'; // Start at 001 if no tickets exist for today
  
    if (lastTicket) {
      // Extract the last 6 digits (incrementing part)
      const lastIncrement = parseInt(lastTicket.ticket_no.slice(-3), 10);
      // Increment by 1 and pad with leading zeros
      nextNumber = String(lastIncrement + 1).padStart(3, '0');
    }
  
    // Combine date prefix and next increment number
    const newTicketNumber = `${datePrefix}${nextNumber}`;
  
    return newTicketNumber;
  }

async function create (req,res){
    const now = moment().utcOffset(7)
    const dueDate = now.add(3, 'days');
    console.log('Request body:', req.body); // This should contain the fields sent in the form
    console.log('Uploaded files:', req.files); // This will contain the uploaded files

    console.log(req.files);

    console.log(req.body);

    var userId = req.user_id
    const existAsset = await Asset.findOne({
      include: [
          { 
            model: Item, 
            as : 'item',
            attributes:['brand','model'],
          },
          { 
            model: DC, 
            as : 'dc',
            attributes:['company_id']
          }
        ],
        where:{
            id: req.body.asset_id
        }
    });
  
    if(!existAsset){
        return res.status(200).send({
            is_ok:false,
            message:"Asset is not found"
        });
    }

    const t = await sequelize.transaction();
    try{

        //var ticketNo = req.ticketNo
        let emailArray = [];
        if(!req.body.cc.includes(",")){
          emailArray.push(req.body.cc)
        }else{
          emailArray = req.body.cc.split(',').map(email => email.trim());
        }
        console.log(emailArray)

        var storeTicket = {
            title: req.body.title,
            asset_id: existAsset.id,
            part_id: req.body.part_id,
            ticket_no: req.ticketNo,
            status: "open",
            description: req.body.description,
            cc: req.body.cc,
            created_by: userId,
            due_date: dueDate,
            customer_reference_no: req.body.customer_reference_no
          }
          console.log(storeTicket);
          const newTicket = await Ticket.create(storeTicket,{transaction: t});

          const attachments = req.files.map((file, index) => ({
            ticket_id: newTicket.id,
            url: `/uploads/ticket_${req.ticketNo}/${file.filename}`,
          }));
      
          // Save attachments to TicketAttachment table
          await TicketAttachment.bulkCreate(attachments, { transaction: t });
      
          var storeLog = {
            ticket_id : newTicket.id,
            asset_id: existAsset.id,
            user_id: req.user_id,
            status:req.body.status
          }

          await TicketLog.create(storeLog, {transaction:t})
          //Send email
          const query = `
            SELECT u.username, u.email
            FROM user_dc_accesses uda
            LEFT JOIN users u ON uda.user_id = u.id
            WHERE uda.dc_id = (SELECT dc_id FROM assets WHERE id = :asset_id)
            OR uda.company_id = :company_id
          `;

          const replacements = { asset_id: existAsset.id, company_id: existAsset.dc.company_id };

          // Execute the raw query
          const result = await sequelize.query(query, {
            replacements,
            type: Sequelize.QueryTypes.SELECT,
            transaction:t
          });
          
          const emailPromises = result.map((r) => {

            const templateData = {
              userName: r.username,
              ticketNumber: req.ticketNo,
              serialNumber: existAsset.serial_number,
              brand: existAsset.item.brand,
              model: existAsset.item.model,
              createdAt: now.format('DD-MM-YY HH:mm:ss'),
              description: req.body.description,
              link: 'https://dev-helpdesk.epsindo.co.id/apps/tickets/list',
            };

            return sendEmail(r.email, 'New Ticket Notification', 'ticket_open.ejs', templateData);
          });

          await Promise.all(emailPromises);

          await t.commit();

          return res.status(200).json({
            is_ok: true,
            message: "Ticket created successfully",
          });
  
      }catch(error){
          await t.rollback();
          return res.status(200).send({
              is_ok:false,
              message:error.toString()
          });
      } 
  }

const list = async (req,res) => {
  /* search by dc name */
  /* search by company name */

  /* 
    search_dc_name
    search_company_name
    page
    page_length
    column_sort
    order
  */
  console.log(req.dcs);

  var page = parseInt(req.body.page, 10);
  var page_length = parseInt(req.body.items_per_page, 10); //default 20
  var column_sort = "id";
  var order = "desc"


  if(req.body.hasOwnProperty("sort")){
    column_sort = req.body.sort
  }

  if(req.body.hasOwnProperty("order")){
    order = req.body.order
  }

  let where_query = `1 = 1`;
  let params = [];

  if (req.dcs && req.dcs.length > 0) {
    const dcPlaceholders = req.dcs.map((_, index) => `$${params.length + index + 1}`).join(', ');
    where_query += ` AND "asset".dc_id IN (${dcPlaceholders})`; // Add filter for dc_id
    params = [...params, ...req.dcs];
  }

  if(req.role_name != "admin"){
    where_query += ` AND dc.is_active = true`
  }

  if(req.body.hasOwnProperty("filter_status")){
    if(typeof req.body.filter_status === "string"){
      if(req.body.filter_status != ""){
        where_query += ` AND ticket.status = '${req.body.filter_status.toLowerCase()}'` 
      }
    }
  }

  if (req.body.hasOwnProperty("filter_from_date") && req.body.hasOwnProperty("filter_to_date")) {
    if (typeof req.body.filter_from_date === "string" && typeof req.body.filter_to_date === "string") {
        if (req.body.filter_from_date !== "" && req.body.filter_to_date !== "") {
            const fromDate = new Date(req.body.filter_from_date);
            const toDate = new Date(req.body.filter_to_date);

            if (fromDate > toDate) {
                return res.status(400).json({ error: "filter_from_date cannot be greater than filter_to_date" });
            }
        }
    }
}

  if(req.body.hasOwnProperty("filter_from_date")){
    if(typeof req.body.filter_from_date === "string"){
      if(req.body.filter_from_date != ""){
        where_query += ` AND ticket."createdAt" >= '${req.body.filter_from_date}'` 
      }
    }
  }

  if(req.body.hasOwnProperty("filter_to_date")){
    if(typeof req.body.filter_to_date === "string"){
      if(req.body.filter_to_date != ""){
        where_query += ` AND ticket."createdAt" <= '${req.body.filter_to_date}'` 
      }
    }
  }

  const countQuery = `
  SELECT COUNT(*) AS total
  FROM tickets AS ticket
  LEFT JOIN assets AS "asset" ON ticket.asset_id = "asset".id
  LEFT JOIN dcs AS "dc" ON "asset".dc_id = "dc".id
  WHERE ${where_query} 
`;

  const rawQuery = `
    SELECT 
      ticket.id,
      ticket.ticket_no,
      ticket.title,
      ticket.priority,
      ticket.status,
      ticket."createdAt",
      ticket.on_hold,
      "part".part_name,
      "asset".serial_number,
      "item".brand,
      "item".model,
      "store".store_name,
      "store".store_code,
      "dc".dc_name,
      "dc".dc_code,
      d.diagnostic_name as case_category,
      "part".part_name
    FROM tickets AS ticket
    LEFT JOIN assets AS "asset" ON ticket.asset_id = "asset".id
    LEFT JOIN items AS "item" ON item.id = "asset".item_id
    LEFT JOIN dcs AS "dc" ON "asset".dc_id = "dc".id
    LEFT JOIN stores AS "store" ON "store".id = "asset".store_id
    LEFT JOIN parts AS "part" ON "part".id = ticket.part_id
    LEFT JOIN diagnostics AS d ON d.id = ticket.diagnostic_id
    WHERE ${where_query}
    ORDER BY ticket."${column_sort}" ${order}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  try {
    // Count query to get the total number of tickets
    const countResult = await sequelize.query(countQuery, {
      bind: params,
      type: sequelize.QueryTypes.SELECT,
    });
    
    // Get the total count from the query result
    const totalTickets = countResult[0].total;
  
    params.push(page_length);  // Adding the limit (items per page)
    params.push((page - 1) * page_length);

    // Now execute the rawQuery to fetch the paginated data
    const result = await sequelize.query(rawQuery, {
      bind: params,
      type: sequelize.QueryTypes.SELECT,
    });
  
    const total_count = totalTickets; // Total number of items
    const total_pages = Math.ceil(total_count / page_length)

    if (result.length === 0) {

      return res.status(200).send({
        message: "No Data Found in Company",
        data: result,
        payload: createPaginationNoData(page, total_pages, page_length, 0)
      });
    } else {
      console.log(page)
      console.log(total_pages)
      
      const formattedRows = result.map((r) => {
        return {
          ...r,
          createdAt: r.createdAt ? moment(r.createdAt).utcOffset(7).format('YYYY-MM-DD') : ""
        };
      });

      return res.status(200).send({
        message: "Success",
        data: formattedRows,
        payload: {
          pagination: createPagination(page, total_pages, page_length, result.count)
        }
      });
    }
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return res.status(200).send({
      message: "error",
      data: error
    });
    
  }
  /*Ticket.findAndCountAll({
      include: [
        { 
          model: Asset, 
          as : 'asset',
          attributes: [],
        },
      ],
      attributes:[
        'id',
        'ticket_no',
        'title',
        'priority',
        'status',
        'createdAt',
        'on_hold'
      ],
      where: where_query,
      offset: (page-1)*page_length,
      limit: page_length,
      order: [param_order],
      raw:true
  })
  .then(result => {
    
    const total_count = result.count; // Total number of items
    const total_pages = Math.ceil(total_count / page_length)

    if (result.count === 0) {

      res.status(200).send({
        message: "No Data Found in Company",
        data: result.rows,
        payload: createPaginationNoData(page, total_pages, page_length, 0)
      });
    } else {
      console.log(page)
      console.log(total_pages)
      
      res.status(200).send({
        message: "Success",
        data: result.rows,
        payload: {
          pagination: createPagination(page, total_pages, page_length, result.count)
        }
      });
    }
  });*/
};

const detail = (req,res) => {
  var id = req.params.id;

  const protocol = req.protocol;

  // Get the host (hostname + port)
  const host = req.get('host');

  // Construct the base URL
  const baseUrl = `${protocol}://${host}`;
  
  /* 
    {
        id: 0,
        ticket_no: "",
        title: "",
        status: "",
        priority: "",
        createdAt: "",
        on_hold: false,
        asset_id: 0,
        brand: "",
        model: "",
        store: "",
        dc: "",
        description: "",
        cc:"",
        created_by: "",
        due_date: "",
        comment_client: "",
        comment_client_date: "",
        comment_client_by: "",
        comment_internal: "",
        comment_internal_date: "",
        comment_internal_by: ""
    }
  */
  Ticket.findOne({
      include: [
        { 
          model: Asset, 
          as : 'asset',
          attributes:[],
          include:[
            {
                model:Item,
                as: "item",
                attributes: [
                    'brand',  // Include item brand
                    'model'  // Include item model
                ]
            },
            {
                model:DC,
                as: "dc",
                attributes: [
                    'dc_name' // Include DC name
                ]
            },
            {
                model:Store,
                as: "store",
                attributes: [
                    'store_name' // Include store name
                ]
            }
          ]
        },
        {
          model:TicketAttachment,
          as:"attachments",
          attributes: [
            [sequelize.fn('CONCAT', baseUrl, sequelize.col('url')), 'full_url'], // Concatenate base URL with attachment URL
          ],
        },
        {
          model:TicketLog,
          as: "ticket_logs",
          required: false,
          include:[
            {
              model:User,
                as: "user",
                attributes: [
                    'username', 
                    'email'
                ]
            }
          ],
          attributes: [
              'status',
              'createdAt',
              'text'
          ],
        },
        {
          model: Part, 
          as : 'part',
          attributes:[],
        },
        {
          model: Diagnostic,
          as : 'diagnostic',
          attributes:[],
        }
      ],
      attributes:[
        'id',
        'ticket_no',
        'title',
        'status',
        'priority',
        'createdAt',
        'on_hold',
        'due_date',
        'comment_client',
        'comment_client_date',
        'comment_client_by',
        'comment_internal',
        'comment_internal_date',
        'comment_internal_by',
        'cc',
        'description',
        'created_by',
        'asset_id',
        'customer_reference_no',
        'part_id',
        'diagnostic_id',
        [Sequelize.col('asset.item.brand'), 'brand'],         // Include asset item's brand
        [Sequelize.col('asset.item.model'), 'model'],         // Include asset item's model
        [Sequelize.col('asset.store.store_name'), 'store_name'], // Include asset store's name
        [Sequelize.col('asset.dc.dc_name'), 'dc_name'],
        [Sequelize.col('asset.serial_number'), 'serial_number'],
        [Sequelize.col('part.part_name'), 'part_name'],
        [Sequelize.col('diagnostic.diagnostic_name'), 'diagnostic_name']
      ],
      where:{id:id},
      order: [[{ model: TicketLog, as: 'ticket_logs' }, 'createdAt', 'ASC']]
  }).then(result=>{
        const formattedResult = {
        ...result.dataValues,
        due_date: result.due_date ? moment(result.due_date).utcOffset(7).format('YYYY-MM-DD') : "",
        ticket_logs: result.ticket_logs.map(log => ({
          ...log.dataValues,
          createdAt: moment(log.createdAt).utcOffset(7).format('DD MMM YY, HH:mm:ss')
        }))
      }
      console.log(formattedResult)

      res.status(200).send({
          message:"Success",
          data:formattedResult
      });
  })
}

async function update (req,res) {

  console.log("===BODY===")
  console.log(req.body);
  const now = moment().utcOffset(7);

    const existTicket = await Ticket.findOne({
        where:{
            id: req.body.id
        }
    });
  
  if(!existTicket){
      return res.status(200).send({
          is_ok:false,
          message:"Ticket is not found"
      });
  }

  const t = await sequelize.transaction();
  try{
      var data = {
        status:req.body.status.toLowerCase(),
        on_hold:req.body.on_hold,
        priority:req.body.priority,
      }

      const existTicket = await Ticket.findOne({
        where:{
          id:req.body.id
        }
      });

      if(req.body.status == "in progress" && existTicket.in_progress_at == ""){
          data["in_progress_at"] = now
          data["repair_by"] = req.user_id
      }

      if(req.body.status == "closed"){
        data["closed_at"] = now
      }

      const existAsset = await Asset.findOne({
        include: [
            { 
              model: Item, 
              as : 'item',
              attributes:['brand','model'],
            },
            { 
              model: DC, 
              as : 'dc',
              attributes:['company_id']
            }
          ],
          where:{
              id: existTicket.asset_id
          },
          transaction:t
      });
    
      if(!existAsset){
          await t.rollback();
          return res.status(200).send({
              is_ok:false,
              message:"Asset is not found"
          });
      }

      var templateData = {
        userName: "",
        ticketNumber: existTicket.ticket_no,
        serialNumber: existAsset.serial_number,
        brand: existAsset.item.brand,
        model: existAsset.item.model,
        createdAt: now.format('DD MM YY HH:mm:ss'),
        description: existTicket.description,
        status: req.body.status,
        link: 'https://dev-helpdesk.epsindo.co.id/apps/tickets/list',
      };

      var templateFile = "ticket_update.ejs"

      var storeLog = {
        ticket_id : req.body.id,
        asset_id: existTicket.asset_id,
        user_id: req.user_id,
        status:req.body.status,
        text:now.format('DD-MM-YY, HH:mm:ss')+" "+req.username+" has updated the ticket to "+req.body.status
      }

      if(existTicket.comment_client != req.body.comment_client){
        console.log("MASUK")
        data['comment_client'] = req.body.comment_client;
        data['comment_client_date'] = now
        data['comment_client_by'] = req.email;
        storeLog.text = now.format('DD-MM-YY, HH:mm:ss')+" "+req.username+" has updated comment to client"
      }
      
      if(existTicket.comment_internal != req.body.comment_internal){
        data['comment_internal'] = req.body.comment_internal;
        data['comment_internal_date'] = now
        data['comment_internal_by'] = req.email;
        storeLog.text = now.format('DD-MM-YY, HH:mm:ss')+" "+req.username+" has updated comment to internal"
      }

      if(req.body.status == "Closed"){
        templateFile = "ticket_closed_client.ejs";
      }

      if(req.body.hasOwnProperty("swap_asset_id")){

        var swapAsset = await Asset.findOne({
          include:[
            {
              model:Item,
              as:"item"
            }
          ],
          where:{
            id: req.body.swap_asset_id,
            is_active: true
          },
          transaction:t
        });

        if(!swapAsset){
          await t.rollback();
          return res.status(200).send({
            is_ok:false,
            message:"Swap asset is not found"
          });
        }

        //deactive old asset
        await Asset.update({
          is_active:false
        },{
          where:{
            id:req.body.asset_id
          },
          transaction:t
        });

        //change swap asset to exist asset
        await Asset.update({
          dc_id:existAsset.dc_id,
          store_id:existAsset.store_id
        },{
            where:{
              id:req.body.swap_asset_id
            },
            transaction:t
          }
        )

        //set swap asset
        data["asset_id"] = req.body.swap_asset_id;
        data["old_asset_id"] = existTicket.asset_id;
        
        //change text
        storeLog.text += ", swap asset from "+existAsset.serial_number+" to "+swapAsset.serial_number

        templateFile = "ticket_closed_client_swap.ejs"

        templateData["newSerialNumber"] = swapAsset.serial_number
        templateData["newBrand"] = swapAsset.item.brand
        templateData["newModel"] = swapAsset.item.model

      }

      if(req.body.part_id != 0){
        data['part_id'] = req.body.part_id;
      }
    
      if(req.body.diagnostic_id){
        data['diagnostic_id'] = req.body.diagnostic_id;
      }

      await Ticket.update(data,{
        where:{
          id:req.body.id
        },
        transaction: t});

      console.log(storeLog);

      await TicketLog.create(storeLog,{
        transaction:t
      });  
      
      //create part
      if(req.body.part_id == 0){
        await Part.create({
          part_name:req.body.part_name,
          is_active:true 
        },{
          transaction:t
        });
      }
     
      //create diagnostic
      if(req.body.diagnostic_id == 0){
       await Diagnostic.create({
         diagnostic_name:req.body.diagnostic_name,
         is_active:true 
       },{
         transaction:t
       });
     }

      await sendEmails("Ticket Update Notification",templateData,templateFile,existAsset, t)
      
      await t.commit();

      return res.status(200).send({
          is_ok:true,
          message:"Successfully saved"
      });

    }catch(error){
        await t.rollback();
        return res.status(200).send({
            is_ok:false,
            message:error.toString()
        });
    } 
}

const listStoreOption = (req,res) => {

  var param_order = ['store_name', "asc"];
  var where_query = {'is_active':true}

  where_query = {
    ...where_query,
    dc_id:req.params.dc_id
  }

  Store.findAll({
      attributes:[
        ['id','store_id'],
        'store_name',
      ],
      where: where_query,
      order: [param_order],
      raw:true
  })
  .then(result => {
      if(result.count == 0){
          res.status(200).send({
              message:"No Data Found in Dealer",
              data:result
          })
      }else{
          res.status(200).send({
              message:"Success",
              data:result
          })
      }
  });
};

const upload = async(req, res) => {
  
  return res.status(200).send({
    is_ok: true,
    message: "Successfully Upload : ",
  });

  /*
  try{
    if (req.file == undefined) {
      return res.status(200).send({
        is_ok: false,
        message: "Please upload a excel file!"});
    }
    let dir = __basedir + "/uploads/" + req.file.filename;
    const file = reader.readFile(dir);
    
    const sheets = file.SheetNames

    var result = [];

    console.log(sheets)
    
    const t = await sequelize.transaction();
  
    // for(let i = 0; i < sheets.length; i++)
    // {
      let temp = reader.utils.sheet_to_json(file.Sheets['dc - store'])
      
      for(let j = 0; j < temp.length; j++){
        //console.log(temp)
        var resp = null;
        resp = await updateOrCreateStore(j,temp[j],t);
       
        // if(sheets[i] == "mds.mdm.DealerGroup") resp = await updateOrCreate(MdmDealerGroup,temp[j],t);
        // if(sheets[i] == "mds.mdm.DealerCompany") resp = await updateOrCreate(MdmCompany,temp[j],t);
        // if(sheets[i] == "mds.mdm.Outlet") resp = await updateOrCreate(MdmOutlet,temp[j],t);
        result.push(resp);
      }
    // }
    
    fs.readdir(__basedir + "/uploads/", (err, files) => {
      if (err) throw err;
    
      for (const file of files) {
        fs.unlink(path.join(__basedir + "/uploads/", file), err => {
          if (err) throw err;
        });
      }
    });

    await t.commit();
    return res.status(200).send({
      is_ok: true,
      message: "Successfully Upload : " + req.file.originalname,
      result:result
    });

    }catch(error){
      console.log(error.toString());
      await t.rollback();
      return res.status(200).send({
        is_ok: false,
        message: "Could not upload the file: " + req.file.originalname,
        error:error.toString()
      });
    }
      */
} 

const updateOrCreateStore = async(i,row,t)=>{

  const existCompany = await Company.findOne({
    where:{
      company_code:row["Company Code"]
    },
    transaction: t
  })

  if(!existCompany){
    return {is_ok:false,message:"Company Code is not exist at row "+(i+1)}
  }

  const existDC = await DC.findOne({
    where:{
      dc_code:row["DC Code"]
    },
    transaction: t
  })

  if(!existDC){
    return {is_ok:false,message:"DC Code is not exist at row "+(i+1)}
  }

  
  const existStore = await Store.findOne({
    where:{
      store_code:row["Store Code"]
    },
    transaction:t
  })

  var storeData = {
    dc_id:existDC.id,
    store_name:row["Store Name"],
    is_active:false
  }

  try{
    if(existStore){
      await Store.update(storeData,
        {
          where:{
            id:existStore.id
          },
          transaction:t
        }
      )
      return {is_ok:true,message:"Successfully update at row "+(i+1)}
    }else{
      await Store.create(storeData,{transaction:t})
      return {is_ok:true,message:"Successfully insert at row "+(i+1)}
    }
    
  }catch(e){
    return {is_ok:false,message:error.toString()};
  }
  
    
}

const overview = async (req,res) => {
  try {
    // Get total ticket counts grouped by status
    var data = await Ticket.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: 'status',
    });

    // Get count of tickets that are on hold
    const onHoldCount = await Ticket.count({
      where: {
        status: 'on hold', // Change this to the actual status for on hold
      },
    });

    data.push({
      status: "On Hold",
      count: onHoldCount
    });
    // Prepare the response
    return res.status(200).send({
      is_ok:false,
      message:"Successfully get data",
      data: data
    });

  } catch (error) {
    console.error('Error fetching ticket counts:', error);
    return res.status(200).send({
      is_ok:false,
      message:"Internal server error"
    });
  }
}

const sendEmails = async (subject, templateData, templateFile, existAsset, t) => {
  const query = `
            SELECT u.username, u.email
            FROM user_dc_accesses uda
            LEFT JOIN users u ON uda.user_id = u.id
            WHERE uda.dc_id = (SELECT dc_id FROM assets WHERE id = :asset_id)
            OR uda.company_id = :company_id
    `;

    const replacements = { asset_id: existAsset.id, company_id: existAsset.dc.company_id };

    // Execute the raw query
    const result = await sequelize.query(query, {
      replacements,
      type: Sequelize.QueryTypes.SELECT,
      transaction:t
    });
    
    const emailPromises = result.map((r) => {

      templateData.userName = r.username;

      return sendEmail(r.email, subject, templateFile, templateData);
    });

    await Promise.all(emailPromises);
}

const listParts = (req,res) => {

  var param_order = ['part_name', "asc"];
  var where_query = {'is_active':true}

  Part.findAll({
      attributes:[
        ['id','part_id'],
        'part_name',
      ],
      where: where_query,
      order: [param_order],
      raw:true
  })
  .then(result => {
      if(result.count == 0){
          res.status(200).send({
              message:"No Data Found in Part",
              data:result
          })
      }else{
          res.status(200).send({
              message:"Success",
              data:result
          })
      }
  });
};

const listDiagnostics = (req,res) => {

  var param_order = ['diagnostic_name', "asc"];
  var where_query = {'is_active':true}

  Diagnostic.findAll({
      attributes:[
        ['id','diagnostic_id'],
        'diagnostic_name',
      ],
      where: where_query,
      order: [param_order],
      raw:true
  })
  .then(result => {
      if(result.count == 0){
          res.status(200).send({
              message:"No Data Found in Part",
              data:result
          })
      }else{
          res.status(200).send({
              message:"Success",
              data:result
          })
      }
  });
};

const listStatus = (req,res) => {
  var param_order = ['status', "asc"];

  Ticket.findAll({
      attributes:[
        'status',
      ],
      order: [param_order],
      group: ['status'],
      raw:true
  })
  .then(result => {
      if(result.count == 0){
          res.status(200).send({
              message:"No Status Found in Tickets",
              data:result
          })
      }else{
            const statusList = result.map(item => item.status);
            statusList.unshift("");
            res.status(200).send({
                message:"Success",
                data:statusList
            })
      }
  });
}

const listDC = async (req,res) => {
  const listDC = await DC.findAll({
    attributes:[
      ['id','dc_id'],
      'dc_name'
    ],
    where:{
      id : {
        [Op.in] : req.dcs
      }
    }
  });

  if(listDC.length > 0){
    return res.status(200).send({
        message:"No DC Found in Tickets",
        data:[]
    });
  }else{
      return res.status(200).send({
        message:"Success",
        data:listDC
    })
  }
}

module.exports = {
    create,
    list,
    detail,
    update,
    listParts,
    listDiagnostics,
    listStatus,
    listDC,
    listStoreOption,
    upload,
    generateTicketNumber,
    overview
}