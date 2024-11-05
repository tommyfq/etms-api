const moment = require('moment')
const xlsx = require('xlsx');
const path = require("path");
const fs = require("fs");
const db = require("../models");
const Op = db.Sequelize.Op;
const { sequelize, Sequelize } = require("../models");
const Items = db.items;
const { createPagination, createPaginationNoData } = require("../helpers/pagination");

const list = (req,res) => {
  console.log("===ASSET_LIST===")

  /* 
    search_company_name
    search_agent_name
    page
    page_length
    column_sort
    order
  */
  console.log(req.body);
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

  console.log(column_sort);
  
  param_order = [column_sort,order];
  
  if(req.body.hasOwnProperty("search")){
    if(req.body.search != ""){
      where_query = {
        ...where_query,
        [Op.or]: [
          {
              brand: {
                  [Op.iLike]: `%${req.body.search}%`
              }
          },
          {
            model: {
                [Op.iLike]: `%${req.body.search}%`
            }
          }
      ]
      }
    }
  }

  Items.findAndCountAll({
      attributes:[
        'id',
        'brand',
        'model',
        'createdAt',
        'updatedAt',
        'is_active'
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
        message: "No Data Found in Items",
        data: result.rows,
        payload: createPaginationNoData(page, total_pages, page_length, 0)
      });
    } else {
      
      res.status(200).send({
        message: "Success",
        data: result.rows,
        payload: {
          pagination: createPagination(page, total_pages, page_length, result.count)
        }
      });
    }
  });
};

const detail = (req,res) => {
  var id = req.params.id;
  
  Items.findOne({
      attributes:[
        'id',
        'brand',
        'model',
        'is_active',
        'createdAt',
        'updatedAt'
      ],
      where:{id:id}
  }).then(result=>{

    res.status(200).send({
        message:"Success",
        data:result
    });
  })
}

async function update (req,res) {
    const existItem = await Items.findOne({
        where:{
            brand: req.body.brand,
            model: req.body.model,
            id: { [Op.ne]: req.body.id }
        }
    });

    if(existItem){
        if(existItem){
            return res.status(200).send({
                is_ok:false,
                message:"Data is already exist"
            });
        }
    }

  const t = await sequelize.transaction();
  try{
      var data = {
        brand:req.body.model,
        brand:req.body.brand,
        is_active:req.body.is_active
      }
      console.log(data);
      
      await Items.update(data,{
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
  const existItem = await Items.findOne({
      where:{
          brand: req.body.brand,
          model: req.body.model
      }
  });

  if(existItem){
      return res.status(200).send({
          is_ok:false,
          message:"Data is already exist"
      });
  }

  const t = await sequelize.transaction();
  try{
      var data = {
        brand:req.body.brand,
        model:req.body.model,
        is_active:req.body.is_active
      }
      
      await Items.create(data,{transaction: t});

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

const listBrand = (req,res) => {

  var param_order = ['brand', "asc"];
  var where_query = {'is_active':true}

  Items.findAll({
      attributes:[
        'brand',
      ],
      where: where_query,
      order: [param_order],
      group: ['brand'],
      raw:true
  })
  .then(result => {
      if(result.count == 0){
          res.status(200).send({
              message:"No Brand Found in Items",
              data:result
          })
      }else{
            const brandList = result.map(item => item.brand);
            res.status(200).send({
                message:"Success",
                data:brandList
            })
      }
  });
};

const listModel = (req,res) => {

    var param_order = ['model', "asc"];
    var where_query = {
        'is_active':true
    }

    where_query = {
        ...where_query,
        brand:req.body.brand
    }
  
    Items.findAll({
        attributes:[
          ['id','item_id'],
          'model',
        ],
        where: where_query,
        order: [param_order],
        raw:true
    })
    .then(result => {
        if(result.count == 0){
            res.status(200).send({
                message:"No Model Found in Items",
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
  
      let temp = xlsx.utils.sheet_to_json(file.Sheets['item'])
      
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
      console.log(error.toString());
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
    if(!row.hasOwnProperty('Brand')) {
      return {is_ok:false,message:"Brand is blank at row "+(i+1)}
    }

    if(!row.hasOwnProperty('Model')) {
      return {is_ok:false,message:"DC Name is blank at row "+(i+1)}
    }


    if(!row.hasOwnProperty('Is Active')) {
      return {is_ok:false,message:"Is Active is blank at row "+(i+1)}
    }


    const existItems = await Items.findOne({
      where:{
        brand:row["Brand"],
        model:row["Model"]
      },
      transaction: t
    })

    var storeData = {
      brand:row["Brand"],
      model:row["Model"],
      is_active:row["Is Active"] == 'TRUE' || row["Is Active"] == true ? true : false,
    }

    console.log(storeData, existItems)
  
    if(existItems){

      let hasChanged = Object.keys(storeData).some(key => {
        // Ensure to handle the case where the key may not exist on existDC
        return storeData[key] !== existItems[key];
      });
  
      if (!hasChanged) {
        return { is_ok:false, message: 'No changes detected, update skipped.' };
      }
      
      await Items.update(storeData,
        {
          where:{
            id:existItems.id
          },
          transaction:t
        }
      )
      return {is_ok:true,message:`${storeData.brand} ${storeData.model} successfully update at row ${(i+1)}`}
    }else{
      await Items.create(storeData,{transaction:t})
      return {is_ok:true,message:`${storeData.brand} ${storeData.model} successfully insert at row ${(i+1)}`}
    }
  
  }catch(error){
    return {is_ok:false,message:error.toString()};
  }
}

const download = async(req, res) => {

  try {
    // Fetch all data from your data collection
    const result = await Items.findAll({
      attributes:[
        'brand',
        'model',
        'is_active',
        //[Sequelize.col('company.company_code'), 'company_code']
      ],
      // You can specify any options here if needed
    });

    const formattedResult = result.map((item, index) => {

      return {
      No: index + 1, // Incremental number
      'Brand':item.brand,
      'Model': item.model, // Use the alias for dc_name
      'Is Active': item.is_active ? 'TRUE' : 'FALSE',
      }
    });

    // Create a new workbook
    const workbook = xlsx.utils.book_new();

    // Convert data to a worksheet
    const worksheet = xlsx.utils.json_to_sheet(formattedResult);

    // Append the worksheet to the workbook
    xlsx.utils.book_append_sheet(workbook, worksheet, 'item');

    // Create a buffer to write the workbook
    const excelBuffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    // Set the response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="item_data.xlsx"');

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
    listBrand,
    listModel,
    download,
    upload
}