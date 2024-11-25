const moment = require('moment')
const xlsx = require('xlsx');
const path = require("path");
const fs = require("fs");
const db = require("../models");
const Asset = db.assets;
const DC = db.dcs;
const Store = db.stores;
const Item = db.items;
const Op = db.Sequelize.Op;
const { sequelize, Sequelize } = require("../models");
const {fn,where,col} = db.Sequelize
const { createPagination, createPaginationNoData } = require("../helpers/pagination");
const {validateHeaders} = require("../helpers/general")

const list = async (req,res) => {
  /* search by company name */
  /* search by agent name */

  /* 
    search_company_name
    search_agent_name
    page
    page_length
    column_sort
    order
  */
  let page = parseInt(req.body.page, 10);
  var page_length = req.body.items_per_page; //default 20
  var column_sort = `assets.id`;
  var order = "asc"

  console.log(req.body)

  if(req.body.hasOwnProperty("sort")){
    
    if(req.body.sort == 'dc_name'){
      column_sort = `dcs.dc_name`
    }else if(req.body.sort == 'store_name'){
      column_sort = `stores.store_name`
    }else{
      column_sort = `assets.${req.body.sort}`
    }

  }

  if(req.body.hasOwnProperty("order")){
    order = req.body.order
  }

  //var where_query = {};

  
  

  // if(req.body.hasOwnProperty("search_serial_number")){
  //   if(req.body.search_serial_number){
  //     where_query = {
  //       ...where_query,
  //       serial_number: {
  //         [Op.iLike]: '%'+req.body.search_serial_number+'%'
  //       }
  //     }
  //   }
  // }


  // if(req.body.hasOwnProperty("search_dc_name")){
  //   if(req.body.search_dc_name != ""){
  //     where_query = {
  //       ...where_query,
  //         '$dc.name$': {
  //           [Op.iLike]: '%'+req.body.search_dc_name+'%'
  //         }
  //     }
  //   }
  // }

  // if(req.body.hasOwnProperty("search_store_name")){
  //   if(req.body.search_store_name != ""){
  //     where_query = {
  //       ...where_query,
  //         '$store.name$': {
  //           [Op.iLike]: '%'+req.body.search_store_name+'%'
  //         }
  //     }
  //   }
  // }

  let where_query = `1 = 1`;
  let params = [];

  if (req.dcs && req.dcs.length > 0) {
    const dcPlaceholders = req.dcs.map((_, index) => `$${params.length + index + 1}`).join(', ');
    where_query += ` AND assets.dc_id IN (${dcPlaceholders})`; // Add filter for dc_id
    params = [...params, ...req.dcs];
  }

  if(req.role_name != "admin"){
    where_query += ` AND dcs.is_active = true`
  }

  if (req.body.hasOwnProperty("search") && req.body.search) {
    const searchParamIndex = params.length + 1;
    const searchValue = `%${req.body.search}%`;
  
    where_query += ` AND (
      items.brand ILIKE $${searchParamIndex} OR 
      items.model ILIKE $${searchParamIndex} OR 
      assets.serial_number ILIKE $${searchParamIndex} OR 
      dcs.dc_name ILIKE $${searchParamIndex} OR
      stores.store_name ILIKE $${searchParamIndex}
      )`;
    params.push(searchValue); // Bind the same search value for both brand and model
  }

  const countQuery = `
  SELECT COUNT(DISTINCT assets.id) AS total
  FROM assets
  LEFT JOIN dcs ON assets.dc_id = dcs.id
  LEFT JOIN stores ON assets.store_id = stores.dc_id
  LEFT JOIN items ON items.id = assets.item_id
  WHERE ${where_query} 
`;

  const rawQuery = `
    SELECT DISTINCT
      assets.id,
      assets.serial_number,
      assets.warranty_expired,
      CASE
        WHEN assets.warranty_expired >= NOW() THEN true
        ELSE false
      END as warranty_status,
      assets.delivery_date,
      assets."createdAt",
      assets."updatedAt",
      assets.is_active,
      dcs.dc_name,
      stores.store_name,
      items.brand,
      items.model
    FROM assets
    LEFT JOIN dcs ON assets.dc_id = dcs.id
    LEFT JOIN stores ON assets.store_id = stores.id
    LEFT JOIN items ON items.id = assets.item_id
    WHERE ${where_query}
    ORDER BY ${column_sort} ${order}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  // Asset.findAndCountAll({
  //     include: [
  //       { 
  //         model: DC, 
  //         as : 'dc',
  //         attributes: []
  //       },
  //       { 
  //           model: Store, 
  //           as : 'store',
  //           attributes: []
  //         },
  //     ],
  //     attributes:[
  //       'id',
  //       'serial_number',
  //       'waranty_status',
  //       'warranty_expired',
  //       'delivery_date',
  //       'createdAt',
  //       'updatedAt',
  //       'is_active',
  //       [Sequelize.col('dc.dc_name'), 'dc_name'],
  //       [Sequelize.col('store.store_name'), 'store_name']
  //     ],
  //     where: where_query,
  //     offset: (page-1)*page_length,
  //     limit: page_length,
  //     order: [param_order],
  //     raw:true
  // })
  // .then(result => {

    try {
      // Count query to get the total number of tickets
      const countResult = await sequelize.query(countQuery, {
        bind: params,
        type: sequelize.QueryTypes.SELECT,
      });
      
      // Get the total count from the query result
      const totalRows = countResult[0].total;
    
      params.push(page_length);  // Adding the limit (items per page)
      params.push((page - 1) * page_length);
  
      // Now execute the rawQuery to fetch the paginated data
      const result = await sequelize.query(rawQuery, {
        bind: params,
        type: sequelize.QueryTypes.SELECT,
      });
    
      const total_count = totalRows; // Total number of items
      const total_pages = Math.ceil(total_count / page_length)
  
      if (result.length === 0) {
        console.log(result);

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
            delivery_date: r.delivery_date ? moment(r.delivery_date).utcOffset(7).format('YYYY-MM-DD') : "",
            warranty_expired: r.warranty_expired ? moment(r.warranty_expired).utcOffset(7).format('YYYY-MM-DD') : ""
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
  //});
};

const detail = (req,res) => {
  var id = req.params.id;
  
  Asset.findOne({
    include:[
      { 
        model: Item, 
        as : 'item',
        attributes: []
      },
    ],
      attributes:[
        'id',
        'serial_number',
        'dc_id',
        'store_id',
        'is_active',
        'delivery_date',
        [
          Sequelize.literal(`
            CASE
              WHEN assets.warranty_expired >= NOW() THEN true
              ELSE false
            END
          `),
          'warranty_status'
        ],
        'warranty_expired',
        'createdAt',
        'updatedAt',
        [Sequelize.col('item.brand'), 'brand'],
        'item_id'
      ],
      where:{id:id}
  }).then(result=>{
      
    const formattedResult = {
      ...result.dataValues,
      delivery_date: result.delivery_date ? moment(result.delivery_date).utcOffset(7).format('YYYY-MM-DD') : "",
      warranty_expired: result.warranty_expired ? moment(result.warranty_expired).utcOffset(7).format('YYYY-MM-DD') : ""
    }

    res.status(200).send({
        message:"Success",
        data:formattedResult
    });
  })
}

async function update (req,res) {
  const existDC = await DC.findOne({
      where:{
          id: req.body.dc_id
      }
  });

  if(!existDC){
      return res.status(200).send({
          is_ok:false,
          message:"DC is Not found"
      });
  }

  const existStore = await Store.findOne({
    where:{
        id: req.body.store_id
      }
  });

  if(!existStore){
      return res.status(200).send({
          is_ok:false,
          message:"Store is Not found"
      });
  }

  const existSerialNumber = await Asset.findOne({
    where:{
      serial_number: where(fn('LOWER', col('serial_number')), fn('LOWER', req.body.serial_number)),
      id: { [Op.ne]: req.body.id }
    }
  });

  if(existSerialNumber){
    return res.status(200).send({
      is_ok:false,
      message:"Serial number is exist"
    });
  }

  const item = await Item.findOne({
    where:{
      id:req.body.item_id
    }
  })

  if(!item){
    return res.status(200).send({
      is_ok:false,
      message:"Brand & Model does not exist"
    });
  }
  
  const deliveryDate = req.body.delivery_date; // expecting format like 'YYYY-MM-DD'
  const warrantyDuration = item.warranty_duration || 3;

  const expirationDate = moment(deliveryDate).add(warrantyDuration, 'years').utcOffset(7).format('YYYY-MM-DD');

  const t = await sequelize.transaction();
  try{
      var data = {
        serial_number:req.body.serial_number,
        dc_id:req.body.dc_id,
        store_id:req.body.store_id,
        is_active:req.body.is_active,
        waranty_status: req.body.waranty_status,
        delivery_date: req.body.delivery_date,
        warranty_expired: expirationDate,
        item_id: req.body.item_id
      }
      
      await Asset.update(data,{
        where:{
          id:req.body.id
        },
        transaction: t
      });

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

async function create (req,res){
  const existDC = await DC.findOne({
      where:{
          id: req.body.dc_id
      }
  });

  if(!existDC){
      return res.status(200).send({
          is_ok:false,
          message:"DC is Not found"
      });
  }

  const existStore = await Store.findOne({
    where:{
        id: req.body.store_id
      }
  });

  if(!existStore){
      return res.status(200).send({
          is_ok:false,
          message:"Store is Not found"
      });
  }

  const existSerialNumber = await Asset.findOne({
    where:{
      serial_number: where(fn('LOWER', col('serial_number')), fn('LOWER', req.body.serial_number)),
    }
  });

  if(existSerialNumber){
    return res.status(200).send({
      is_ok:false,
      message:"Serial number is exist"
    });
  }

  const item = await Item.findOne({
    where:{
      id:req.body.item_id
    }
  })

  if(!item){
    return res.status(200).send({
      is_ok:false,
      message:"Brand & Model does not exist"
    });
  }
  
  const deliveryDate = req.body.delivery_date; // expecting format like 'YYYY-MM-DD'
  const warrantyDuration = item.warranty_duration || 3;

  const expirationDate = moment(deliveryDate).add(warrantyDuration, 'years').utcOffset(7).format('YYYY-MM-DD');

  const t = await sequelize.transaction();
  try{
      var data = {
        serial_number:req.body.serial_number,
        dc_id:req.body.dc_id,
        store_id:req.body.store_id,
        is_active:req.body.is_active,
        waranty_status: req.body.waranty_status,
        delivery_date: req.body.delivery_date,
        warranty_expired: expirationDate,
        item_id: req.body.item_id
      }
      
      await Asset.create(data,{transaction: t});

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

const listOption = (req,res) => {

  var param_order = [
    [Sequelize.col('item.brand'), 'ASC'],
    [Sequelize.col('item.model'), 'ASC'] 
  ];
  var where_query = {'is_active':true}

  if(req.dcs.length > 0){
    where_query = {
      ...where_query,
      dc_id : {
        [Op.in] : req.dcs
      }
    }
  }

  Asset.findAll({
      include:[
        { 
          model: Item, 
          as : 'item',
          attributes: []
        },
        { 
          model: Store, 
          as : 'store',
          attributes: []
        },
        { 
          model: DC, 
          as : 'dc',
          attributes: []
        },
      ],
      attributes:[
        ['id','asset_id'],
        'serial_number',
        [Sequelize.col('item.brand'), 'brand'],
        [Sequelize.col('item.model'), 'model'],
        [Sequelize.col('store.store_name'), 'store_name'],
        [Sequelize.col('dc.dc_name'), 'dc_name']
      ],
      where: {
        ...where_query,
        id: {
          [Op.notIn]: Sequelize.literal(`(SELECT asset_id FROM tickets where status in ('Open','In Progress','On Hold'))`) // Exclude assets that are in the tickets table
        }
      },
      order: param_order,
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

  const t = await sequelize.transaction();

  try{
    if (req.file == undefined) {
      return res.status(200).send({
        is_ok: false,
        message: "Please upload a excel file!"});
    }
    let dir = __basedir + "/uploads/excel/" + req.file.filename;
    const file = xlsx.readFile(dir);
    
    const sheets = file.SheetNames

    const sheetExists = sheets.includes('asset');

    if(!sheetExists){
      return res.status(200).send({
        is_ok: false,
        message: `Missing 'asset' sheet in the uploaded file`
      });
    }

    const sheet = file.Sheets[sheets[0]];

    var result = [];
  
    let temp = xlsx.utils.sheet_to_json(file.Sheets['asset'])
    
    if(temp.length < 1){
      return res.status(200).send({
        is_ok: false,
        message: "The uploaded file is empty"
      });
    }

    const requiredColumns = ["No","Serial Number","Brand","Model","Store Code","DC Code","Delivery Date","Is Active"]

    const resValid = validateHeaders(sheet,requiredColumns)
    console.log(resValid);

    if(!resValid.isValid){
      return res.status(200).send({
        is_ok: false,
        message: "Wrong file template for column "+ resValid.missingHeaders.join(", ")
      });
    }

    if(temp.length > 100){
      fs.readdir(__basedir + "/uploads/excel/", (err, files) => {
        if (err) throw err;
      
        for (const file of files) {
          fs.unlink(path.join(__basedir + "/uploads/excel/", file), err => {
            if (err) throw err;
          });
        }
      });

      return res.status(200).send({
        is_ok: false,
        message: "Maximum upload limit is 100 rows."
      });
    }
    
    for(let j = 0; j < temp.length; j++){
      var resp = null;
      resp = await updateOrCreate(j,temp[j],t);

      result.push(resp);
    }
    
    fs.readdir(__basedir + "/uploads/excel/", (err, files) => {
      if (err) throw err;
    
      for (const file of files) {
        fs.unlink(path.join(__basedir + "/uploads/excel/", file), err => {
          if (err) throw err;
        });
      }
    });

    await t.commit();
    return res.status(200).send({
      is_ok: true,
      message: "Successfully Upload : " + req.file.originalname,
      data:result
    });

    }catch(error){
      await t.rollback();
      return res.status(200).send({
        is_ok: false,
        message: "Could not upload the file: " + req.file.originalname,
        error:error.toString()
      });
    }
} 

const updateOrCreate = async(i,row,t)=>{
  try{
    /*
      No
      Serial Number
      Brand	
      Model	
      Store Code	
      Store Name	
      DC Code	
      DC Name	
      Warranty Status	
      Delivery Date	
      Is Active
    */

    if(!row.hasOwnProperty('Serial Number')) {
      return {is_ok:false,message:"Serial Number is blank at row "+(i+1)}
    }

    if(!row.hasOwnProperty('Brand')) {
      return {is_ok:false,message:"Brand is blank at row "+(i+1)}
    }

    if(!row.hasOwnProperty('Model')) {
      return {is_ok:false,message:"Model is blank at row "+(i+1)}
    }

    if(!row.hasOwnProperty('Is Active')) {
      return {is_ok:false,message:"Is Active is blank at row "+(i+1)}
    }

    if(typeof row["Is Active"] === 'string'){

      const value = row["Is Active"].toLowerCase();
      if(!["true", "false"].includes(value)) {
        return {is_ok:false,message:"Status is not valid at row "+(i+1)}
      }
  
      if(value == "true"){
        row["Is Active"] = true;
      }
  
      if(value == "false"){
        row["Is Active"] = false;
      }
    }

    if(!row.hasOwnProperty('Store Code')) {
      return {is_ok:false,message:"Store Code is blank at row "+(i+1)}
    }

    if(!row.hasOwnProperty('DC Code')) {
      return {is_ok:false,message:"DC Code is blank at row "+(i+1)}
    }

    if(!row.hasOwnProperty('Delivery Date')) {
      return {is_ok:false,message:"Delivery Date is blank at row "+(i+1)}
    }

    if(row["Delivery Date"] == ""){
      return {is_ok:false,message:"Delivery Date is blank at row "+(i+1)}
    }

    const existItems = await Item.findOne({
      where:{
        brand:where(fn('LOWER', col('brand')), fn('LOWER', row["Brand"])),
        model:where(fn('LOWER', col('model')), fn('LOWER', row["Model"])),
      },
      transaction: t
    })

    if(!existItems){
      return {is_ok:false,message:"Brand / Model does not exist at row "+(i+1)}
    }

    // const existStore = await Store.findOne({
    //   where:{
    //     store_code:{
    //       [Op.iLike]: row["Store Code"]
    //     }
    //   },
    //   transaction: t
    // })

    const existStore = await Store.findOne({
      where: where(fn('LOWER', col('store_code')),fn('LOWER', row["Store Code"])),
      transaction: t
    });

    if(!existStore){
      return {is_ok:false,message:"Store Code is not exist at row "+(i+1)}
    }

    // const existDC = await DC.findOne({
    //   where:{
    //     dc_code:{
    //       [Op.iLike]: row["DC Code"]
    //     }
    //   },
    //   transaction: t
    // })

    const existDC = await DC.findOne({
      where: where(fn('LOWER', col('dc_code')), fn('LOWER', row["DC Code"])),
      transaction: t
    });

    if(!existDC){
      return {is_ok:false,message:"DC Code is not exist at row "+(i+1)}
    }

    console.log("===EXIST STORE, EXIST DC===")
    console.log(existStore.dc_id, existDC.id)
    if(existStore.dc_id != existDC.id){
      return {is_ok:false,message:`${row["Store Code"]} is not under ${row["DC Code"]} at `+(i+1)}
    }
    
    let deliveryDate = row["Delivery Date"];

      if (typeof deliveryDate === 'number') {
        // Convert Excel serial date to JavaScript date
        deliveryDate = moment('1900-01-01').add(deliveryDate - 2, 'days').utcOffset(7).format('YYYY-MM-DD');
      }else{
        let deliveryDate = moment(row["Delivery Date"], 'YYYY-MM-DD', true).utcOffset(7);
        if (!deliveryDate.isValid()) {
          // If invalid, try parsing as 'MM/DD/YYYY'
          deliveryDate = moment(deliveryDate, 'MM/DD/YYYY', true).utcOffset(7);
        }

        if (deliveryDate.isValid()) {
          row["Delivery Date"] = deliveryDate.format('YYYY-MM-DD');
        } else {
          row["Delivery Date"] = null; // or handle invalid date cases here
        }
      }

      // Convert to 'YYYY-MM-DD' format if valid
    const warrantyDuration = existItems.warranty_duration || 3;
  
    const expirationDate = moment(deliveryDate).add(warrantyDuration, 'years').utcOffset(7);
    const now = moment().utcOffset(7);
    const warrantyStatus = now.isBefore(expirationDate)
    
    const existAsset = await Asset.findOne({
      where:{
        serial_number:{
          [Op.iLike]: row["Serial Number"]
        }
      },
      // You can specify any options here if needed
    });

    var storeData = {
      item_id: existItems.id,
      dc_id: existDC.id,
      store_id: existStore.id,
      waranty_status: warrantyStatus,
      delivery_date: deliveryDate,
      warranty_expired: expirationDate.format('YYYY-MM-DD'),
      is_active: row["Is Active"] == 'TRUE' || row["Is Active"] == true ? true : false,
    }
  
    
    if(existAsset){

      // if(!existAsset.delivery_date){
      //   return {is_ok:false,message:"Existing delivery date is empty at row "+(i+1)}
      // }

      let hasChanged = Object.keys(storeData).some(key => {
        // Ensure to handle the case where the key may not exist on existDC
        const storeValue = storeData[key];
        const assetValue = existAsset[key];

        // If the key is 'warranty_date', compare the ISO strings
        if (key === 'delivery_date') {
          const formateDateAsset = moment(assetValue).utcOffset(7).format('YYYY-MM-DD');

          console.log(`Comparing Delivery Dates: ${storeValue} vs ${formateDateAsset}`);
          return storeValue !== formateDateAsset;
        }
        
        if(key === 'warranty_expired'){
          const formateDateAsset = moment(assetValue).format('YYYY-MM-DD');
          console.log(`Comparing Warranty Expired Dates: ${storeValue} vs ${formateDateAsset}`);
          return storeValue !== formateDateAsset;
        }

        // Otherwise, compare the values directly
        console.log(storeValue, assetValue, storeValue !== assetValue);
        return storeValue !== assetValue;
      });
  
      if (!hasChanged) {
        return { is_ok:false, message: 'No changes data at row '+(i+1) };
      }
      
      await Asset.update(storeData,
        {
          where:{
            id:existAsset.id
          },
          transaction:t
        }
      )
      return {is_ok:true,message:`Successfully update at row ${(i+1)}`}
    }else{
      storeData["serial_number"] = row["Serial Number"]
      await Asset.create(storeData,{transaction:t})
      return {is_ok:true,message:`Successfully insert at row ${(i+1)}`}
    }
  
  }catch(error){
    return {is_ok:false,message:error.toString()};
  }
}

const download = async(req, res) => {

  try {
    // Fetch all data from your data collection
    const result = await Asset.findAll({
      include: [
        { 
          model: DC, 
          as : 'dc',
          attributes: ['dc_code','dc_name'],
        },
        { 
          model: Store, 
          as : 'store',
          attributes: ['store_code','store_name'],
        },
        { 
          model: Item, 
          as : 'item',
          attributes: ['brand','model'],
        },
      ],
      attributes:[
        'serial_number',
        'is_active',
        'waranty_status',
        'delivery_date',
        'warranty_expired'
        //[Sequelize.col('company.company_code'), 'company_code']
      ],
      // You can specify any options here if needed
    });

    const formattedResult = result.map((item, index) => {
      const deliveryDate = item.delivery_date ? moment(item.delivery_date).utcOffset(7).format('YYYY-MM-DD') : ""
      const warrantyExpired = item.warranty_expired ? moment(item.warranty_expired).utcOffset(7).format('YYYY-MM-DD') : ""
      
      return {
        No: index + 1, // Incremental number
        'Serial Number':item.serial_number,
        'Brand':item.item?.brand ?? null,
        'Model': item.item?.model ?? null, // Use the alias for dc_name
        'Store Code': item.store.store_code,
        'Store Name': item.store.store_name,
        'DC Code': item.dc.dc_code,
        'DC Name': item.dc.dc_name,
        'Warranty Status': item.waranty_status,
        'Delivery Date': deliveryDate,
        'Warranty Expired': warrantyExpired,
        'Is Active': item.is_active,
      }
    });

    // Create a new workbook
    const workbook = xlsx.utils.book_new();

    // Convert data to a worksheet
    const worksheet = xlsx.utils.json_to_sheet(formattedResult);

    // Append the worksheet to the workbook
    xlsx.utils.book_append_sheet(workbook, worksheet, 'asset');

    // Create a buffer to write the workbook
    const excelBuffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    // Set the response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="asset_data.xlsx"');

    // Send the Excel buffer as a response
    res.send(excelBuffer);
  } catch (error) {
    console.error('Error generating Excel file:', error);
    res.status(500).send('Internal Server Error');
  }
}

module.exports = {
    create,
    list,
    detail,
    update,
    listOption,
    download,
    upload
}