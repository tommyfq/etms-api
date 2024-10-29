const moment = require('moment');

const db = require("../models");
const Asset = db.assets;
const Ticket = db.tickets;
const Item = db.items;
const DC = db.dcs;
const Store = db.stores;
const TicketAttachment = db.tickets_attachment;

const Op = db.Sequelize.Op;
const fs = require("fs");
const path = require("path");
const reader = require('xlsx');
const { sequelize, Sequelize } = require("../models");
const {storeImages} = require("../middleware/upload");

async function generateTicketNumber() {
    // Use moment to get the current date in YYMMDD format
    const datePrefix = moment().format('YYMMDD');
  
    // Get the last ticket number for today
    const lastTicket = await Ticket.findOne({
      where: {
        ticket_no: {
          [Sequelize.Op.like]: `${datePrefix}%` // Find tickets starting with the date prefix
        }
      },
      order: [['ticket_no', 'DESC']] // Get the most recent ticket
    });
  
    let nextNumber = '000001'; // Start at 000001 if no tickets exist for today
  
    if (lastTicket) {
      // Extract the last 6 digits (incrementing part)
      const lastIncrement = parseInt(lastTicket.ticket_no.slice(-6), 10);
      // Increment by 1 and pad with leading zeros
      nextNumber = String(lastIncrement + 1).padStart(6, '0');
    }
  
    // Combine date prefix and next increment number
    const newTicketNumber = `${datePrefix}${nextNumber}`;
  
    return newTicketNumber;
  }

async function create (req,res){
    console.log('Request body:', req.body); // This should contain the fields sent in the form
    console.log('Uploaded files:', req.files); // This will contain the uploaded files

    console.log(req.files);

    var userId = req.user_id
    const existAsset = await Asset.findOne({
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
            ticket_no: req.ticketNo,
            status: "Open",
            description: req.body.description,
            cc: req.body.cc,
            created_by: userId,
            due_date: req.body.due_date
          }
          console.log(storeTicket);
          const newTicket = await Ticket.create(storeTicket,{transaction: t});

          const attachments = req.files.map((file, index) => ({
            ticket_id: newTicket.id,
            url: `/uploads/ticket_${req.ticketNo}/${file.filename}`,
          }));
      
          // Save attachments to TicketAttachment table
          await TicketAttachment.bulkCreate(attachments, { transaction: t });
      
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

const list = (req,res) => {
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

  var page = req.body.page;
  var page_length = req.body.items_per_page; //default 20
  var column_sort = "id";
  var order = "asc"

  if(req.body.hasOwnProperty("sort")){
    column_sort = req.body.sort
  }

  if(req.body.hasOwnProperty("order")){
    order = req.body.order
  }

  var where_query = {};
  
  var param_order = [];

  console.log(column_sort);
  
//   if(column_sort == 'dc_name'){
//     param_order = ['dc','dc_name', order];
//   }else{
    param_order = [column_sort,order];
  //}

  if(req.body.hasOwnProperty("filter_status")){
    if(req.body.filter_status != ""){
        where_query = {
            ...where_query,
            status: {
                [Op.iLike]: '%'+req.body.filter_status+'%'
            }
        }
    }
  }


  Ticket.findAndCountAll({
    //   include: [
    //     { 
    //       model: DC, 
    //       as : 'dc',
    //       attributes: []
    //     },
    //   ],
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
    
      const total_pages = Math.ceil(result.count / page_length);
      if (result.count === 0) {

        res.status(200).send({
          message: "No Data Found in Store",
          data: result.rows,
          payload: {
            pagination: {
              page: page,
              first_page_url: "/?page=1",
              from: 0,
              last_page: total_pages,
              links: [
                { url: null, label: "&laquo; Previous", active: false, page: null },
                { url: "/?page=1", label: "1", active: true, page: 1 },
                { url: "/?page=2", label: "2", active: false, page: 2 }
              ],
              next_page_url: null,
              items_per_page: page_length,
              prev_page_url: null,
              to: 0,
              total: result.count
            }
          }
        });
      } else {
        var links = []
        if(page > 1){
          links.push({
            url: page > 1 ? `/?page=${page - 1}` : null, 
            label: "&laquo; Previous", 
            active: false, 
            page: page - 1
          })
        }

        links.push(
          ...Array.from({ length: total_pages }, (_, i) => ({
            url: `/?page=${i + 1}`,
            label: (i + 1).toString(),
            active: page === i + 1,
            page: i + 1,
          }))
        );

        if(page < total_pages){
          links.push({ 
            url: page < total_pages ? `/?page=${page + 1}` : null, 
            label: "Next &raquo;", 
            active: false, 
            page: (Number(page) + 1) 
          })
        }

        res.status(200).send({
          message: "Success",
          data: result.rows,
          payload: {
            pagination: {
              page: page,
              first_page_url: "/?page=1",
              from: (page - 1) * page_length + 1,
              last_page: total_pages,
              links: links,
              next_page_url: page < total_pages ? `/?page=${page + 1}` : null,
              items_per_page: page_length,
              prev_page_url: page > 1 ? `/?page=${page - 1}` : null,
              to: page * page_length,
              total: result.count
            }
          }
        });
      }
  });
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
            },
          ]
        },
        {
          model:TicketAttachment,
          as:"attachments",
          attributes: [
            [sequelize.fn('CONCAT', baseUrl, sequelize.col('url')), 'full_url'], // Concatenate base URL with attachment URL
          ],
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
        [Sequelize.col('asset.item.brand'), 'brand'],         // Include asset item's brand
        [Sequelize.col('asset.item.model'), 'model'],         // Include asset item's model
        [Sequelize.col('asset.store.store_name'), 'store_name'], // Include asset store's name
        [Sequelize.col('asset.dc.dc_name'), 'dc_name'],
        [Sequelize.col('asset.serial_number'), 'serial_number']
      ],
      where:{id:id}
  }).then(result=>{
        const formattedResult = {
        ...result.dataValues,
        due_date: result.due_date ? moment(result.due_date).format('YYYY-MM-DD') : ""
      }
      console.log(formattedResult)

      res.status(200).send({
          message:"Success",
          data:formattedResult
      });
  })
}

async function update (req,res) {

  const now = moment();

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
        status:req.body.status,
        on_hold:req.body.on_hold,
      }
      
      if(existTicket.comment_client != req.body.comment_client){
        data['comment_client'] = req.body.comment_client;
        data['comment_client_date'] = now
        data['comment_client_by'] = req.email;
      }
      
      if(existTicket.comment_internal != req.body.comment_internal){
        data['comment_internal'] = req.body.comment_client;
        data['comment_internal_date'] = now
        data['comment_internal_by'] = req.email;
      }

      console.log(data);

      await Ticket.update(data,{
        where:{
          id:req.body.id
        },
        transaction: t});
      
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

module.exports = {
    create,
    list,
    detail,
    update,
    listStoreOption,
    upload,
    generateTicketNumber,
    overview
}