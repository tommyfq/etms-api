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
const { createPagination, createPaginationNoData } = require("../helpers/pagination");

const list = (req,res) => {
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

  
  if(column_sort == 'dc'){
    param_order = ['dc','name', order];
  }else if(column_sort == 'store'){
    param_order = ['store','name', order];
  }else{
    param_order = [column_sort,order];
  }

  if(req.body.hasOwnProperty("search_serial_number")){
    if(req.body.search_serial_number){
      where_query = {
        ...where_query,
        serial_number: {
          [Op.iLike]: '%'+req.body.search_serial_number+'%'
        }
      }
    }
  }


  if(req.body.hasOwnProperty("search_dc_name")){
    if(req.body.search_dc_name != ""){
      where_query = {
        ...where_query,
          '$dc.name$': {
            [Op.iLike]: '%'+req.body.search_dc_name+'%'
          }
      }
    }
  }

  if(req.body.hasOwnProperty("search_store_name")){
    if(req.body.search_store_name != ""){
      where_query = {
        ...where_query,
          '$store.name$': {
            [Op.iLike]: '%'+req.body.search_store_name+'%'
          }
      }
    }
  }

  if(req.dcs.length > 0){
    where_query = {
      ...where_query,
      dc_id : {
        [Op.in] : req.dcs
      }
    }
  }

  Asset.findAndCountAll({
      include: [
        { 
          model: DC, 
          as : 'dc',
          attributes: []
        },
        { 
            model: Store, 
            as : 'store',
            attributes: []
          },
      ],
      attributes:[
        'id',
        'serial_number',
        'waranty_status',
        'warranty_expired',
        'delivery_date',
        'createdAt',
        'updatedAt',
        'is_active',
        [Sequelize.col('dc.dc_name'), 'dc_name'],
        [Sequelize.col('store.store_name'), 'store_name']
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
        message: "No Data Found in Assets",
        data: result.rows,
        payload: createPaginationNoData(page, total_pages, page_length, 0)
      });
    } else {
      
      const formattedRows = result.rows.map((r) => {
        return {
          ...r,
          delivery_date: r.delivery_date ? moment(r.delivery_date).format('YYYY-MM-DD') : "",
          warranty_expired: r.warranty_expired ? moment(r.warranty_expired).format('YYYY-MM-DD') : ""
        };
      });
      
      res.status(200).send({
        message: "Success",
        data: formattedRows,
        payload: {
          pagination: createPagination(page, total_pages, page_length, result.count)
        }
      });
    }
  });
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
        'waranty_status',
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
      delivery_date: result.delivery_date ? moment(result.delivery_date).format('YYYY-MM-DD') : "",
      warranty_expired: result.warranty_expired ? moment(result.warranty_expired).format('YYYY-MM-DD') : ""
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
      serial_number: req.body.serial_number,
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

  const expirationDate = moment(deliveryDate).add(warrantyDuration, 'years').format('YYYY-MM-DD');

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
      serial_number: req.body.serial_number
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

  const expirationDate = moment(deliveryDate).add(warrantyDuration, 'years').format('YYYY-MM-DD');

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

  try{
    if (req.file == undefined) {
      return res.status(200).send({
        is_ok: false,
        message: "Please upload a excel file!"});
    }
    let dir = __basedir + "/uploads/excel/" + req.file.filename;
    const file = xlsx.readFile(dir);
    
    const sheets = file.SheetNames

    var result = [];
    
    const t = await sequelize.transaction();
  
      let temp = xlsx.utils.sheet_to_json(file.Sheets['asset'])
      
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
      return {is_ok:false,message:"DC Name is blank at row "+(i+1)}
    }

    if(!row.hasOwnProperty('Is Active')) {
      return {is_ok:false,message:"Is Active is blank at row "+(i+1)}
    }

    if(!row.hasOwnProperty('Store Code')) {
      return {is_ok:false,message:"Store Code is blank at row "+(i+1)}
    }

    if(!row.hasOwnProperty('DC Code')) {
      return {is_ok:false,message:"DC Code is blank at row "+(i+1)}
    }

    if(!row.hasOwnProperty('Warranty Status')) {
      return {is_ok:false,message:"Warranty Status is blank at row "+(i+1)}
    }

    if(!row.hasOwnProperty('Delivery Date')) {
      return {is_ok:false,message:"Delivery Date is blank at row "+(i+1)}
    }

    if(row["Delivery Date"] == ""){
      return {is_ok:false,message:"Delivery Date is blank at row "+(i+1)}
    }

    const existItems = await Item.findOne({
      where:{
        brand:row["Brand"],
        model:row["Model"]
      },
      transaction: t
    })

    if(!existItems){
      return {is_ok:false,message:"Item is not exist at row "+(i+1)}
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
      transaction: t
    })

    if(!existStore){
      return {is_ok:false,message:"Store Code is not exist at row "+(i+1)}
    }
    
    let deliveryDate = row["Delivery Date"];

      if (typeof deliveryDate === 'number') {
        // Convert Excel serial date to JavaScript date
        deliveryDate = moment('1900-01-01').add(deliveryDate - 2, 'days').format('YYYY-MM-DD');
      }else{
        let deliveryDate = moment(row["Delivery Date"], 'YYYY-MM-DD', true);
        if (!deliveryDate.isValid()) {
          // If invalid, try parsing as 'MM/DD/YYYY'
          deliveryDate = moment(deliveryDate, 'MM/DD/YYYY', true);
        }

        if (deliveryDate.isValid()) {
          row["Delivery Date"] = deliveryDate.format('YYYY-MM-DD');
        } else {
          row["Delivery Date"] = null; // or handle invalid date cases here
        }
      }

      // Convert to 'YYYY-MM-DD' format if valid
    const warrantyDuration = existItems.warranty_duration || 3;
  
    const expirationDate = moment(deliveryDate).add(warrantyDuration, 'years').format('YYYY-MM-DD');
    
    const existAsset = await Asset.findOne({
      where:{
        serial_number:row["Serial Number"]
      },
      // You can specify any options here if needed
    });

    var storeData = {
      item_id: existItems.id,
      dc_id: existDC.id,
      store_id: existStore.id,
      waranty_status: row["Warranty Status"] == "TRUE" || row["Warranty Status"] == true ? true : false,
      delivery_date: deliveryDate,
      warranty_expired: expirationDate,
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
          const formateDateAsset = moment(assetValue).format('YYYY-MM-DD');

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
        return { is_ok:false, message: 'No changes data at row '+i };
      }
      
      await Asset.update(storeData,
        {
          where:{
            id:existAsset.id
          },
          transaction:t
        }
      )
      return {is_ok:true,message:`${row["Serial Number"]} successfully update at row ${(i+1)}`}
    }else{
      storeData["serial_number"] = row["Serial Number"]
      await Asset.create(storeData,{transaction:t})
      return {is_ok:true,message:`${storeData.serial_number} successfully insert at row ${(i+1)}`}
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
      const deliveryDate = item.delivery_date ? moment(item.delivery_date).format('YYYY-MM-DD') : ""
      const warrantyExpired = item.warranty_expired ? moment(item.warranty_expired).format('YYYY-MM-DD') : ""
      
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