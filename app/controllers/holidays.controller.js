const moment = require('moment')
const xlsx = require('xlsx');
const path = require("path");
const fs = require("fs");
const db = require("../models");
const Op = db.Sequelize.Op;
const { sequelize, Sequelize } = require("../models");
const {fn,where,col} = db.Sequelize
const Holidays = db.holidays;
const { createPagination, createPaginationNoData } = require("../helpers/pagination");
const { validateHeaders } = require('../helpers/general')

const list = (req,res) => {
  console.log("===HOLIDAYS_LIST===")

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
              name: {
                  [Op.iLike]: `%${req.body.search}%`
              }
          },
          {
              date: {
                  [Op.iLike]: `%${req.body.search}%`
              }
          }
      ]
      }
    }
  }

  Holidays.findAndCountAll({
      attributes:[
        'id',
        'name',
        'date',
        'is_active',
        'createdAt',
        'updatedAt'
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

    // Format date to YYYY-MM-DD
    const formattedRows = result.rows.map(row => ({
      ...row,
      date: moment(row.date).format('YYYY-MM-DD')
    }));

    if (result.count === 0) {
      res.status(200).send({
        message: "No Data Found in Holidays",
        data: formattedRows,
        payload: createPaginationNoData(page, total_pages, page_length, 0)
      });
    } else {

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

async function update (req,res) {
    const existHoliday = await Holidays.findOne({
        where:{
            [Op.or]: [
                { name: req.body.name },
                { date: req.body.date }
            ],
            id: { [Op.ne]: req.body.id }
        }
    });

    if(existHoliday){
        return res.status(200).send({
            is_ok:false,
            message:"Name or Date is already exist"
        });
    }

  const t = await sequelize.transaction();
  try{
      var data = {
        name:req.body.name,
        date:req.body.date,
        is_active:req.body.is_active
      }

      console.log(data);

      await Holidays.update(data,{
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
  const existHoliday = await Holidays.findOne({
      where:{
          [Op.or]: [
              { name: req.body.name },
              { date: req.body.date }
          ]
      }
  });

  if(existHoliday){
      return res.status(200).send({
          is_ok:false,
          message:"Name or Date is already exist"
      });
  }

  const t = await sequelize.transaction();
  try{
      var data = {
        name:req.body.name,
        date:req.body.date,
        is_active:req.body.is_active
      }

      await Holidays.create(data,{transaction: t});

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

    const sheetExists = sheets.includes('holidays');

    if(!sheetExists){
      return res.status(200).send({
        is_ok: false,
        message: `Missing 'holidays' sheet in the uploaded file`
      });
    }

    const sheet = file.Sheets[sheets[0]];

    var result = [];

      let temp = xlsx.utils.sheet_to_json(file.Sheets['holidays'])
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

      const requiredColumns = ["No","Name","Date","Is Active"]

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
    if(!row.hasOwnProperty('Name')) {
      return {is_ok:false,message:"Name is blank at row "+(i+1)}
    }

    if(!row.hasOwnProperty('Date')) {
      return {is_ok:false,message:"Date is blank at row "+(i+1)}
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

    // Parse date
    let parsedDate = moment(row["Date"], ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY'], true);
    if (!parsedDate.isValid()) {
      return {is_ok:false,message:"Invalid date format at row "+(i+1)}
    }
    row["Date"] = parsedDate.toDate();

    const existHolidayName = await Holidays.findOne({
      where: {
        name: row["Name"]
      },
      transaction: t
    })

    const existHolidayDate = await Holidays.findOne({
      where: sequelize.where(sequelize.fn('DATE', sequelize.col('date')), '=', moment(row["Date"]).format('YYYY-MM-DD')),
      transaction: t
    })

    let targetRecord = existHolidayDate || existHolidayName;

    // ----------------------------------------
    // 3. PREPARE DATA
    // ----------------------------------------
    const storeData = {
      name: row["Name"],
      date: parsedDate.toDate(),
      is_active: row["Is Active"],
    };

    if (targetRecord) {
      // ----------------------------------------
      // 4. UPDATE LOGIC
      // ----------------------------------------

      // Check for changes manually to be safe against Date object differences
      const isNameSame = targetRecord.name === storeData.name;
      const isStatusSame = targetRecord.is_active === storeData.is_active;
      const isDateSame = moment(targetRecord.date).isSame(storeData.date, 'day');

      if (isNameSame && isStatusSame && isDateSame) {
        return { is_ok: false, message: 'No changes data at row ' + (i + 1) };
      }

      await Holidays.update(storeData, {
        where: { id: targetRecord.id }, // FIX: Use the ID from the record we actually found
        transaction: t
      });
      return {is_ok:true,message:`Successfully update at row ${(i+1)}`}
    }else{
      await Holidays.create(storeData,{transaction:t})
      return {is_ok:true,message:`Successfully insert at row ${(i+1)}`}
    }

  }catch(error){
    return {is_ok:false,message:error.toString()};
  }
}

const detail = (req,res) => {
  const id = req.params.id;

  if(!id){
    return res.status(400).send({
      message: "ID is required"
    });
  }

  Holidays.findOne({
    where: { id: id },
    attributes: ['id', 'name', 'date', 'is_active', 'createdAt', 'updatedAt']
  })
  .then(holiday => {
    if (holiday) {
      res.status(200).send({
        message: "Success",
        data: {
          ...holiday.dataValues,
          date: moment(holiday.date).format('YYYY-MM-DD')
        }
      });
    } else {
      res.status(404).send({
        message: "Holiday not found"
      });
    }
  })
  .catch(error => {
    res.status(500).send({
      message: error.message || "Some error occurred while retrieving holiday."
    });
  });
};

const download = async(req, res) => {

  try {
    // Fetch all data from holidays
    const result = await Holidays.findAll({
      attributes:[
        'name',
        'date',
        'is_active'
      ],
    });

    const formattedResult = result.map((item, index) => {

      return {
      No: index + 1, // Incremental number
      'Name': item.name,
      'Date': moment(item.date).format('YYYY-MM-DD'),
      'Is Active': item.is_active ? 'TRUE' : 'FALSE'
      }
    });

    // Create a new workbook
    const workbook = xlsx.utils.book_new();

    // Convert data to a worksheet
    const worksheet = xlsx.utils.json_to_sheet(formattedResult);

    // Append the worksheet to the workbook
    xlsx.utils.book_append_sheet(workbook, worksheet, 'holidays');

    // Create a buffer to write the workbook
    const excelBuffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    // Set the response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="holidays_data.xlsx"');

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
    update,
    upload,
    detail,
    download
}