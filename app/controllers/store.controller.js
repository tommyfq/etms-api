const db = require("../models");
const DC = db.dcs;
const Store = db.stores;
const Company = db.companies;
const Op = db.Sequelize.Op;
const fs = require("fs");
const path = require("path");
const xlsx = require('xlsx');
const { sequelize, Sequelize } = require("../models");
const { createPagination, createPaginationNoData } = require("../helpers/pagination");
const { validateHeaders } = require('../helpers/general')

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

  let page = parseInt(req.body.page, 10);
  var page_length = parseInt(req.body.items_per_page); //default 20
  var column_sort = "stores.id";
  var order = "asc"

  if(req.body.hasOwnProperty("sort")){
    column_sort = req.body.sort
  }

  if(req.body.hasOwnProperty("order")){
    order = req.body.order
  }

  //var where_query = {};
  
  var param_order = [];

  console.log(column_sort);
  
  if(req.body.hasOwnProperty("sort")){
    if(req.body.sort == 'dc_name'){
      column_sort = `dcs.dc_name`
    }else if(req.body.sort == 'company_name'){
      column_sort = `companies.company_name`
    }else{
      column_sort = `stores.${req.body.sort}`
    }
  }

  // if(req.body.hasOwnProperty("filter_dc")){
  //   if(req.body.filter_dc != ""){
  //       const arrDC = req.body.filter_dc.split(',').map(Number);
  //       where_query = {
  //           ...where_query,
  //           id: {
  //               [Op.in]: arrDC
  //           }
  //       }
  //   }
  // }

  // if(req.body.hasOwnProperty("search_store_name")){
  //   if(req.body.search_dc_name != ""){
  //       where_query = {
  //           ...where_query,
  //           store_name: {
  //               [Op.iLike]: '%'+req.body.search_store_name+'%'
  //           }
  //       }
  //   }
  // }

  // if(req.body.hasOwnProperty("search")){
  //   if(req.body.search != ""){
  //       where_query = {
  //           ...where_query,
  //           [Op.or]: [
  //             {
  //                 '$dc.dc_name$': {
  //                     [Op.iLike]: `%${req.body.search}%`
  //                 }
  //             },
  //             {
  //                 '$dc.company.company_name$': {
  //                     [Op.iLike]: `%${req.body.search}%`
  //                 }
  //             },
  //             {
  //               store_name: {
  //                   [Op.iLike]: `%${req.body.search}%`
  //               }
  //             },
  //             {
  //               store_code: {
  //                   [Op.iLike]: `%${req.body.search}%`
  //               }
  //             },
  //         ]
  //       }
  //   }
  // }

  // if(req.dcs.length > 0){
  //   where_query = {
  //     ...where_query,
  //     dc_id : {
  //       [Op.in] : req.dcs
  //     }
  //   }
  // }

  // Store.findAndCountAll({
  //     include: [
  //       { 
  //         model: DC, 
  //         as : 'dc',
  //         attributes: [],
  //         include:[
  //           {
  //             model: Company, 
  //             as : 'company',
  //             attributes: [],
  //           }
  //         ]
  //       },
  //     ],
  //     attributes:[
  //       'id',
  //       'store_code',
  //       'store_name',
  //       'address',
  //       'createdAt',
  //       'updatedAt',
  //       'is_active',
  //       [Sequelize.col('dc.dc_name'), 'dc_name'],
  //       [Sequelize.col('dc.company.company_name'), 'company_name']
  //     ],
  //     where: where_query,
  //     offset: (page-1)*page_length,
  //     limit: page_length,
  //     order: [param_order],
  //     raw:true
  // })
  // .then(result => {

  let where_query = `1 = 1`;
  let params = [];

  if (req.dcs && req.dcs.length > 0) {
    const dcPlaceholders = req.dcs.map((_, index) => `$${params.length + index + 1}`).join(', ');
    where_query += ` AND stores.dc_id IN (${dcPlaceholders})`; // Add filter for dc_id
    params = [...params, ...req.dcs];
  }

  if (req.body.hasOwnProperty("search") && req.body.search) {
    const searchParamIndex = params.length + 1;
    const searchValue = `%${req.body.search}%`;
  
    where_query += ` AND (
      dcs.dc_name ILIKE $${searchParamIndex} OR 
      stores.store_name ILIKE $${searchParamIndex} OR 
      stores.store_code ILIKE $${searchParamIndex} OR 
      companies.company_name ILIKE $${searchParamIndex}
      )`;
    params.push(searchValue); // Bind the same search value for both brand and model
  }

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM stores
    LEFT JOIN dcs ON stores.dc_id = dcs.id
    LEFT JOIN companies ON companies.id = dcs.company_id
    WHERE ${where_query} 
    AND dcs.is_active = true
  `;

  const rawQuery = `
    SELECT 
      stores.id,
      stores.store_code,
      stores.store_name,
      stores.address,
      stores."createdAt",
      stores."updatedAt",
      stores.is_active,
      dcs.dc_name,
      companies.company_name
    FROM stores
    LEFT JOIN dcs ON stores.dc_id = dcs.id
    LEFT JOIN companies ON companies.id = dcs.company_id
    WHERE ${where_query} 
      AND dcs.is_active = true
    ORDER BY ${column_sort} ${order}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

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

  if (result.count === 0) {

    res.status(200).send({
      message: "No Data Found in Store",
      data: result,
      payload: createPaginationNoData(page, total_pages, page_length, 0)
    });
  } else {
    res.status(200).send({
      message: "Success",
      data: result,
      payload: {
        pagination: createPagination(page, total_pages, page_length, result.count)
      }
    });
  }
  //});
};

const detail = (req,res) => {
  var id = req.params.id;
  
  Store.findOne({
      include: [
        { 
          model: DC, 
          as : 'dc',
          attributes: []
        },
      ],
      attributes:[
        'id',
        'store_code',
        'store_name',
        'is_active',
        'address',
        'createdAt',
        'updatedAt',
        'dc_id',
        [Sequelize.col('dc.dc_name'), 'dc_name']
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

  const existStoreName = await Store.findOne({
      where:{
          store_name: {
            [Op.iLike]: req.body.store_name // Use Op.iLike for case-insensitive matching
          },
          id: { [Op.ne]: req.body.id }
      }
  });

  if(existStoreName){
      return res.status(200).send({
          is_ok:false,
          message:"Store Name is already exist"
      });
  }

  const existStoreCode = await Store.findOne({
    where:{
        store_code: {
          [Op.iLike] : req.body.dc_code
        },
        id: { [Op.ne]: req.body.id }
    }
  });

  if(existStoreCode){
      return res.status(200).send({
          is_ok:false,
          message:"Store Code is already exist"
      });
  }

  const dcId = await DC.findOne({
      where:{
          id: req.body.dc_id,
          is_active:true
      }
  });

  if(!dcId){
      return res.status(200).send({
          is_ok:false,
          message:"DC is not found"
      });
  }

  const t = await sequelize.transaction();
  try{
      var data = {
        store_code:req.body.store_code,
        store_name:req.body.store_name,
        is_active:req.body.is_active,
        address:req.body.address,
        dc_id:req.body.dc_id
      }
      
      const store = await Store.update(data,{
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

  const existStoreName = await Store.findOne({
      where:{
          store_name: {
            [Op.iLike]: req.body.store_name // Use Op.iLike for case-insensitive matching
          }
      }
  });

  if(existStoreName){
      return res.status(200).send({
          is_ok:false,
          message:"Store Name Already Exist"
      });
  }

  const existStoreCOde = await Store.findOne({
    where:{
        store_code: {
          [Op.iLike] : req.body.dc_code
        }
    }
});

if(existStoreCOde){
    return res.status(200).send({
        is_ok:false,
        message:"Store Code is already Exist"
    });
}

  const dcId = await DC.findOne({
      where:{
          id: req.body.dc_id,
          is_active:true
      }
  });

  if(!dcId){
      return res.status(200).send({
          is_ok:false,
          message:"DC is not found"
      });
  }

  const t = await sequelize.transaction();
  try{
      
        var storeData = {
          store_code:req.body.store_code,
          store_name:req.body.store_name,
          is_active:req.body.is_active,
          address:req.body.address,
          dc_id : req.body.dc_id
        }
        console.log(storeData);
        await Store.create(storeData,{transaction: t});
      
      
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

    var result = [];

    console.log(sheets)
    
  
    // for(let i = 0; i < sheets.length; i++)
    // {
      let temp = xlsx.utils.sheet_to_json(file.Sheets['store'])
      let sheet = file.Sheets['store']
      
      if(temp.length > 200){
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
          message: "Maximum upload limit is 200 rows."
        });
      }

      if(temp.length < 1){
        return res.status(200).send({
          is_ok: false,
          message: "The uploaded file is empty"
        });
      }

      const requiredColumns = ["No","Store Code","Store Name","Address","Is Active","DC Code","Company Code"];

      const resValid = validateHeaders(sheet,requiredColumns)
      console.log(resValid);

      if(!resValid.isValid){
        return res.status(200).send({
          is_ok: false,
          message: "Wrong file template for column "+ resValid.missingHeaders.join(", ")
        });
      }

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

const updateOrCreateStore = async(i,row,t)=>{

  if(!row.hasOwnProperty('Company Code')) {
    return {is_ok:false,message:"Company Code is blank at row "+(i+1)}
  }

  if(!row.hasOwnProperty('DC Code')) {
    return {is_ok:false,message:"DC Code is blank at row "+(i+1)}
  }

  if(!row.hasOwnProperty('Store Code')) {
    return {is_ok:false,message:"Store Code is blank at row "+(i+1)}
  }

  if(!row.hasOwnProperty('Store Name')) {
    return {is_ok:false,message:"Store Name is blank at row "+(i+1)}
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
    address:row["Address"],
    is_active:row["Is Active"] == "TRUE" ? true : false,
    store_code:row["Store Code"]
  }

  try{
    if(existStore){

      let hasChanged = Object.keys(storeData).some(key => {
        // Ensure to handle the case where the key may not exist on existDC
        return storeData[key] !== existStore[key];
      });
  
      if (!hasChanged) {
        return { is_ok:false, message: 'No changes detected at row '+(i+1) };
      }

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

const download = async(req, res) => {

  try {
    // Fetch all data from your data collection
    const result = await Store.findAll({
      include: [
        { 
          model: DC, 
          as : 'dc',
          attributes: ['dc_code','dc_name'],
          include: [
            {
              model: Company, 
              as : 'company',
              attributes: ['company_code','company_name'],
            }
            
          ]
        },
      ],
      attributes:[
        'store_code',
        'store_name',
        'address',
        'is_active',
        //[Sequelize.col('company.company_code'), 'company_code']
      ],
      // You can specify any options here if needed
    });

    console.log(result)

    const formattedResult = result.map((item, index) => {

      return {
        No: index + 1, // Incremental number
        'Store Code':item.store_code,
        'Store Name': item.store_name, // Use the alias for dc_name
        'Address': item.address,
        'Is Active': item.is_active ? 'TRUE' : 'FALSE',
        'DC Code':item.dc.dc_code,
        'DC Name':item.dc.dc_name,
        'Company Code':item.dc.company.company_code,
        'Company Name': item.dc.company.company_name // Use the alias for company code
      }
    });

    // Create a new workbook
    const workbook = xlsx.utils.book_new();

    // Convert data to a worksheet
    const worksheet = xlsx.utils.json_to_sheet(formattedResult);

    // Append the worksheet to the workbook
    xlsx.utils.book_append_sheet(workbook, worksheet, 'store');

    // Create a buffer to write the workbook
    const excelBuffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    // Set the response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="store_data.xlsx"');

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
    listStoreOption,
    upload,
    download
}