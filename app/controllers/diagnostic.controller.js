const moment = require('moment')
const xlsx = require('xlsx');
const path = require("path");
const fs = require("fs");
const db = require("../models");
const Op = db.Sequelize.Op;
const { sequelize, Sequelize } = require("../models");
const {fn,where,col} = db.Sequelize
const Diagnostic = db.diagnostics;
const { createPagination, createPaginationNoData } = require("../helpers/pagination");
const { validateHeaders } = require('../helpers/general')

const list = (req,res) => {

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
              diagnostic_name: {
                  [Op.iLike]: `%${req.body.search}%`
              }
          }
      ]
      }
    }
  }

  Diagnostic.findAndCountAll({
      attributes:[
        'id',
        ['diagnostic_name','case_category'],
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
        message: "No Data Found in Case Category",
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
  
  Diagnostic.findOne({
      attributes:[
        'id',
        ['diagnostic_name','case_category'],
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
    const existItem = await Diagnostic.findOne({
        where:{
          diagnostic_name: {
            [Op.iLike] : req.body.case_category
          },
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
        diagnostic_name:req.body.case_category,
        is_active:req.body.is_active
      }
      
      console.log(data);
      
      await Diagnostic.update(data,{
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
  const existItem = await Diagnostic.findOne({
      where:{
          diagnostic_name: where(fn('LOWER', col('diagnostic_name')), fn('LOWER', req.body.case_category)),
      }
  });

  if(existItem){
      return res.status(200).send({
          is_ok:false,
          message:"Case Category is already exist"
      });
  }

  const t = await sequelize.transaction();
  try{
      var data = {
        diagnostic_name:req.body.case_category,
        is_active:req.body.is_active
      }
      
      await Diagnostic.create(data,{transaction: t});

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

    const sheetExists = sheets.includes('case_category');

    if(!sheetExists){
      return res.status(200).send({
        is_ok: false,
        message: `Missing 'item' sheet in the uploaded file`
      });
    }

    const sheet = file.Sheets[sheets[0]];

    var result = [];
    
      let temp = xlsx.utils.sheet_to_json(file.Sheets['case_category'])
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

      if(temp.length < 1){
        return res.status(200).send({
          is_ok: false,
          message: "The uploaded file is empty"
        });
      }

      const requiredColumns = ["No","Case Category","Is Active"]

      const resValid = validateHeaders(sheet,requiredColumns)
      console.log(resValid);

      if(!resValid.isValid){
        return res.status(200).send({
          is_ok: false,
          message: "Wrong file template for column "+ resValid.missingHeaders.join(", ")
        });
      }

      for(let j = 0; j < temp.length; j++){
        console.log(temp[j]);
        var resp = await updateOrCreate(j,temp[j],t);
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
    if(!row.hasOwnProperty('Case Category')) {
      return {is_ok:false,message:"Case Category is blank at row "+(i+1)}
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


    const existItems = await Diagnostic.findOne({
      where:{
        diagnostic_name:where(fn('LOWER', col('diagnostic_name')), fn('LOWER', row["Case Category"])),
      },
      transaction: t
    })

    var storeData = {
      diagnostic_name:row["Case Category"],
      is_active:row["Is Active"],
    }
  
    if(existItems){

      let hasChanged = Object.keys(storeData).some(key => {
        // Ensure to handle the case where the key may not exist on existDC
        return storeData[key] !== existItems[key];
      });
  
      if (!hasChanged) {
        return { is_ok:false, message: 'No changes data at row '+(i+1) };
      }
      
      await Diagnostic.update(storeData,
        {
          where:{
            id:existItems.id
          },
          transaction:t
        }
      )
      return {is_ok:true,message:`Successfully update at row ${(i+1)}`}
    }else{
      await Items.create(storeData,{transaction:t})
      return {is_ok:true,message:`Successfully insert at row ${(i+1)}`}
    }
  
  }catch(error){
    return {is_ok:false,message:error.toString()};
  }
}

const download = async(req, res) => {

  try {
    // Fetch all data from your data collection
    const result = await Diagnostic.findAll({
      attributes:[
        'diagnostic_name',
        'is_active'
        //[Sequelize.col('company.company_code'), 'company_code']
      ],
      // You can specify any options here if needed
    });

    const formattedResult = result.map((item, index) => {
      return {
      No: index + 1, // Incremental number
      'Case Category':item.diagnostic_name,
      'Is Active': item.is_active ? 'TRUE' : 'FALSE'
      }
    });

    // Create a new workbook
    const workbook = xlsx.utils.book_new();

    // Convert data to a worksheet
    const worksheet = xlsx.utils.json_to_sheet(formattedResult);

    // Append the worksheet to the workbook
    xlsx.utils.book_append_sheet(workbook, worksheet, 'case_category');

    // Create a buffer to write the workbook
    const excelBuffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    // Set the response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="case_category_data.xlsx"');

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
    download,
    upload
}