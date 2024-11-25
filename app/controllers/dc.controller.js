const db = require("../models");
const DC = db.dcs;
const Store = db.stores;
const Company = db.companies;
const Op = db.Sequelize.Op;
const fs = require("fs");
const path = require("path");
const xlsx = require('xlsx');
const { sequelize, Sequelize } = require("../models");
const {fn,where,col} = db.Sequelize
const { createPagination, createPaginationNoData } = require("../helpers/pagination");
const { validateHeaders } = require("../helpers/general")

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

  let page = parseInt(req.body.page, 10);
  var page_length = req.body.items_per_page;
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
  
  if(column_sort == 'agent'){
    param_order = ['user','name', order];
  }else{
    param_order = [column_sort,order];
  }

  if(req.body.hasOwnProperty("search")){
    if(req.body.search != ""){
        where_query = {
            ...where_query,
            [Op.or]: [
              {
                  dc_name: {
                      [Op.iLike]: `%${req.body.search}%`
                  }
              },
              {
                  '$company.company_name$': {
                      [Op.iLike]: `%${req.body.search}%`
                  }
              }
          ]
        }
    }
  }

  if(req.role_name != "admin"){
    where_query = {
      ...where_query,
      is_active : true
    }
  }

  if(req.dcs.length > 0){
    where_query = {
      ...where_query,
      id : {
        [Op.in] : req.dcs
      }
    }
  }

  DC.findAndCountAll({
      include: [
        { 
          model: Company, 
          as : 'company',
          attributes: []
        },
      ],
      attributes:[
        'id',
        'dc_name',
        'address',
        'createdAt',
        'updatedAt',
        'is_active',
        [Sequelize.col('company.company_name'), 'company_name']
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
  
  DC.findOne({
      include: [
        { 
          model: Company, 
          as : 'company',
          attributes: []
        },
      ],
      attributes:[
        'id',
        'dc_name',
        'is_active',
        'address',
        'createdAt',
        'updatedAt',
        'company_id',
        'dc_code',
        [Sequelize.col('company.company_name'), 'company_name']
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

  const existDCCode = await DC.findOne({
    where:{
        dc_code: {
          [Op.iLike] : req.body.dc_code
        },
        id: { [Op.ne]: req.body.id }
    }
});

if(existDCCode){
    return res.status(200).send({
        is_ok:false,
        message:"DC Code is already Exist"
    });
}

  const existDC = await DC.findOne({
      where:{
          dc_name: { [Op.iLike]: req.body.dc_name },
          id: { [Op.ne]: req.body.id }
      }
  });

  if(existDC){
      return res.status(200).send({
          is_ok:false,
          message:"DC Name Already Exist"
      });
  }

  const companyId = await Company.findOne({
      where:{
          id: req.body.company_id
      }
  });

  if(!companyId){
      return res.status(200).send({
          is_ok:false,
          message:"Company not found"
      });
  }

  const t = await sequelize.transaction();
  try{
      var data = {
        dc_name:req.body.dc_name,
        is_active:req.body.is_active,
        address:req.body.address,
        company_id:req.body.company_id,
        dc_code:req.body.dc_code
      }
      
      const dc = await DC.update(data,{
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

async function create (req,res){

  const existDCCode = await DC.findOne({
    where:{
        dc_code: {
          [Op.iLike] : req.body.dc_code
        }
    }
  });

  if(existDCCode){
      return res.status(200).send({
          is_ok:false,
          message:"DC Code is already exist"
      });
  }

  const existDC = await DC.findOne({
      where:{
          dc_name: {
            [Op.iLike]: req.body.dc_name // Use Op.iLike for case-insensitive matching
          }
      }
  });

  if(existDC){
      return res.status(200).send({
          is_ok:false,
          message:"DC Name Already Exist"
      });
  }

  const companyId = await Company.findOne({
      where:{
          id: req.body.company_id
      }
  });

  if(!companyId){
      return res.status(200).send({
          is_ok:false,
          message:"Company not found"
      });
  }

  const t = await sequelize.transaction();
  try{
      var data = {
        dc_name:req.body.dc_name,
        is_active:req.body.is_active,
        address:req.body.address,
        company_id:req.body.company_id,
        dc_code:req.body.dc_code
      }
      
      const dc = await DC.create(data,{transaction: t});
      
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

  var param_order = ['dc_name', "asc"];
  var where_query = {'is_active':true}

  var company_id = req.params.company_id;

  if(company_id != 0){
    where_query = {
      ...where_query,
      company_id:company_id
    }
  }

  DC.findAll({
      attributes:[
        ['id','dc_id'],
        'dc_name',
      ],
      where: where_query,
      order: [param_order],
      raw:true
  })
  .then(result => {
      if(result.count == 0){
          res.status(200).send({
              message:"No Data Found in DC",
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

    const sheet = file.Sheets[sheets[0]];

    var result = [];
  
    let temp = xlsx.utils.sheet_to_json(file.Sheets['dc'])
    
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

    const requiredColumns = ["No","DC Code","DC Name","Address","Is Active","Company Code"]

    const resValid = validateHeaders(sheet,requiredColumns)
    console.log(resValid);

    if(!resValid.isValid){
      return res.status(200).send({
        is_ok: false,
        message: "Wrong file template for column "+ resValid.missingHeaders.join(", ")
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
    if(!row.hasOwnProperty('DC Code')) {
      return {is_ok:false,message:"DC Code is blank at row "+(i+1)}
    }

    if(!row.hasOwnProperty('DC Name')) {
      return {is_ok:false,message:"DC Name is blank at row "+(i+1)}
    }

    if(!row.hasOwnProperty('Address')) {
      row['Address'] = ''
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

    if(!row.hasOwnProperty('Company Code')) {
      return {is_ok:false,message:"Company Code is blank at row "+(i+1)}
    }

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
        dc_code:where(fn('LOWER', col('dc_code')), fn('LOWER', row["DC Code"]))
      },
      transaction: t
    })

    var storeData = {
      company_id:existCompany.id,
      dc_name:row["DC Name"],
      dc_code:row["DC Code"],
      is_active:row["Is Active"] == 'TRUE' ? true : false,
      address:row["Address"]
    }

  
    if(existDC){

      let hasChanged = Object.keys(storeData).some(key => {
        // Ensure to handle the case where the key may not exist on existDC
        return storeData[key] !== existDC[key];
      });
  
      if (!hasChanged) {
        return { is_ok:false, message: 'No changes data at row '+(i+1) };
      }

      const existDCName = await DC.findOne({
        where:{
          dc_code:where(fn('LOWER', col('dc_name')), fn('LOWER', row["DC Name"])),
          id: { [Op.ne]: existDC.id}
        },
        transaction: t
      })
  
      if(existDCName){
        return {is_ok:false,message:"DC Name is already exist at row "+(i+1)}
      }
      
      await DC.update(storeData,
        {
          where:{
            id:existDC.id
          },
          transaction:t
        }
      )
      return {is_ok:true,message:`Successfully update at row ${(i+1)}`}
    }else{
      const existDCName = await DC.findOne({
        where:{
          dc_code:where(fn('LOWER', col('dc_name')), fn('LOWER', row["DC Name"]))
        },
        transaction: t
      })
  
      if(existDCName){
        return {is_ok:false,message:"DC Name is already exist at row "+(i+1)}
      }

      await DC.create(storeData,{transaction:t})
      return {is_ok:true,message:`Successfully insert at row ${(i+1)}`}
    }
  
  }catch(error){
    return {is_ok:false,message:error.toString()};
  }
}

const download = async(req, res) => {

  try {
    // Fetch all data from your data collection
    const result = await DC.findAll({
      include: [
        { 
          model: Company, 
          as : 'company',
          attributes: ['company_code']
        },
      ],
      attributes:[
        'dc_code',
        'dc_name',
        'address',
        'is_active',
        //[Sequelize.col('company.company_code'), 'company_code']
      ],
      // You can specify any options here if needed
    });

    const formattedResult = result.map((item, index) => {

      return {
      No: index + 1, // Incremental number
      'DC Code':item.dc_code,
      'DC Name': item.dc_name, // Use the alias for dc_name
      'Address': item.address,
      'Is Active': item.is_active ? 'TRUE' : 'FALSE',
      'Company Code': item.company.company_code // Use the alias for company code
      }
    });

    // Create a new workbook
    const workbook = xlsx.utils.book_new();

    // Convert data to a worksheet
    const worksheet = xlsx.utils.json_to_sheet(formattedResult);

    // Append the worksheet to the workbook
    xlsx.utils.book_append_sheet(workbook, worksheet, 'dc');

    // Create a buffer to write the workbook
    const excelBuffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    // Set the response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="dc_data.xlsx"');

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
    listStoreOption,
    upload,
    download
}