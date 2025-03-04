const moment = require('moment');
const xlsx = require('xlsx');
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
const { createPagination, createPaginationNoData } = require("../helpers/pagination");

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

  var page = parseInt(req.body.page, 10);
  var page_length = parseInt(req.body.items_per_page, 10); //default 20
  var column_sort = "t.id";
  var order = "desc"

  console.log(req.body);
  if(req.body.hasOwnProperty("sort")){
    column_sort = req.body.sort
    if(req.body.sort == "sla"){
        column_sort = "11"
    }else if(req.body.sort == 'created_at'){
         column_sort = 't."createdAt"'
    }  
    
  }

  if(req.body.hasOwnProperty("order")){
    order = req.body.order
  }

  let where_query = `1 = 1`;
  let params = [];

  if (req.dcs && req.dcs.length > 0) {
    const dcPlaceholders = req.dcs.map((_, index) => `$${params.length + index + 1}`).join(', ');
    where_query += ` AND a.dc_id IN (${dcPlaceholders})`; // Add filter for dc_id
    params = [...params, ...req.dcs];
  }

  if(req.role_name != "admin"){
    where_query += ` AND d.is_active = true`
  }

  if(req.body.hasOwnProperty("filter_status")){
    if(typeof req.body.filter_status === "string"){
      if(req.body.filter_status != ""){
        where_query += ` AND t.status = '${req.body.filter_status.toLowerCase()}'` 
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

  if(req.body.hasOwnProperty("filter_year")){
    if(typeof req.body.filter_year === "string"){
      if(req.body.filter_year != ""){
        where_query += ` AND EXTRACT(YEAR FROM t."createdAt") = ${req.body.filter_year}` 
      }
    }
  }

  if(req.body.hasOwnProperty("filter_month")){
    if(typeof req.body.filter_month === "string"){
      if(req.body.filter_month != ""){
        where_query += ` AND EXTRACT(MONTH FROM t."createdAt") = ${req.body.filter_month}` 
      }
    }
  }

  const countQuery = `
    SELECT COUNT(*) AS total
    from tickets t 
    LEFT JOIN assets a ON a.id = t.asset_id 
    LEFT JOIN dcs d ON d.id = a.dc_id 
    LEFT JOIN stores s ON s.id = a.store_id 
    LEFT JOIN items i ON i.id = a.item_id 
    LEFT JOIN "diagnostics" d2 ON d2.id = t.diagnostic_id 
    LEFT JOIN parts p ON p.id = t.part_id 
    WHERE ${where_query} 
`;

  const rawQuery = `
    SELECT d.dc_code, d.dc_name, s.store_code, s.store_name,
    i.brand, i.model, a.serial_number, t."createdAt" as created_at, t.in_progress_at, t.closed_at,
    (t.closed_at::date - t."createdAt"::date) AS sla,
    t.status, t.description, d2.diagnostic_name, p.part_name, 
    t.comment_client, t.ticket_no
    FROM tickets t 
    LEFT JOIN assets a ON a.id = t.asset_id 
    LEFT JOIN dcs d ON d.id = a.dc_id 
    LEFT JOIN stores s ON s.id = a.store_id 
    LEFT JOIN items i ON i.id = a.item_id 
    LEFT JOIN "diagnostics" d2 ON d2.id = t.diagnostic_id 
    LEFT JOIN parts p ON p.id = t.part_id 
    WHERE ${where_query}
    ORDER BY ${column_sort} ${order}
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
        message: "No Data Found in Report",
        data: result,
        payload: createPaginationNoData(page, total_pages, page_length, 0)
      });
    } else {
      console.log(page)
      console.log(total_pages)
      
      const formattedRows = result.map((r) => {
        return {
          ...r,
          created_at: r.created_at ? moment(r.created_at).utcOffset(7).format('YYYY-MM-DD') : "",
          closed_at: r.closed_at ? moment(r.closed_at).utcOffset(7).format('YYYY-MM-DD') : ""
        };
      });

      console.log(formattedRows);

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
};

const download = async(req, res) => {

  var column_sort = "t.id";
  var order = "desc"

  if(req.body.hasOwnProperty("sort")){
    column_sort = req.body.sort
    if(req.body.sort == "sla"){
        column_sort = "11"
    }else if(req.body.sort == 'created_at'){
         column_sort = 't."createdAt"'
    }  
  }

  if(req.body.hasOwnProperty("order")){
    order = req.body.order
  }

  let where_query = `1 = 1`;
  let params = [];

  if (req.dcs && req.dcs.length > 0) {
    const dcPlaceholders = req.dcs.map((_, index) => `$${params.length + index + 1}`).join(', ');
    where_query += ` AND a.dc_id IN (${dcPlaceholders})`; // Add filter for dc_id
    params = [...params, ...req.dcs];
  }

  if(req.role_name != "admin"){
    where_query += ` AND d.is_active = true`
  }

  if(req.body.hasOwnProperty("filter_year")){
    if(typeof req.body.filter_year === "string"){
      if(req.body.filter_year != ""){
        where_query += ` AND EXTRACT(YEAR FROM t."createdAt") = ${req.body.filter_year}` 
      }
    }
  }

  if(req.body.hasOwnProperty("filter_month")){
    if(typeof req.body.filter_month === "string"){
      if(req.body.filter_month != ""){
        where_query += ` AND EXTRACT(MONTH FROM t."createdAt") = ${req.body.filter_month}` 
      }
    }
  }

  const rawQuery = `
    SELECT d.dc_code, d.dc_name, 
    s.store_code, s.store_name,
    i.brand, i.model, a.serial_number, 
    t."createdAt" as created_at, t.in_progress_at, t.closed_at,
    (t.closed_at::date - t."createdAt"::date) AS sla,
    t.status, t.description, 
    t.comment_client, t.ticket_no,
    d2.diagnostic_name, p.part_name
    FROM tickets t 
    LEFT JOIN assets a ON a.id = t.asset_id 
    LEFT JOIN dcs d ON d.id = a.dc_id 
    LEFT JOIN stores s ON s.id = a.store_id 
    LEFT JOIN items i ON i.id = a.item_id 
    LEFT JOIN "diagnostics" d2 ON d2.id = t.diagnostic_id 
    LEFT JOIN parts p ON p.id = t.part_id 
    WHERE ${where_query}
    ORDER BY ${column_sort} ${order}
  `;

  try {
    // Now execute the rawQuery to fetch the paginated data
    const result = await sequelize.query(rawQuery, {
      type: sequelize.QueryTypes.SELECT,
    });

    if (result.length === 0) {

      return res.status(200).send({
        message: "No Data Found in Report"
      });
    } else {
      
      const formattedResult = result.map((item, index) => {
        const complainAt = item.created_at ? moment(item.created_at).utcOffset(7).format('YYYY-MM-DD') : ""
        const repairAt = item.in_progress_at ? moment(item.in_progress_at).utcOffset(7).format('YYYY-MM-DD') : ""
        const solvedAt = item.closed_at ? moment(item.closed_at).utcOffset(7).format('YYYY-MM-DD') : ""
        
        return {
          No: index + 1, // Incremental number
          'DC Name': item.dc_name,
          'Store Name': item.store_name,
          'Serial Number':item.serial_number,
          'Brand':item.brand ?? null,
          'Model': item.model ?? null, // Use the alias for dc_name
          'Complain At': complainAt,
          'Repair At': repairAt,
          'Solved At': solvedAt,
          'SLA':item.sla,
          'Status':item.status,
          'Description':item.description,
          'Case Category':item.diagnostic_name,
          'Part':item.part_name,
          'Comment':item.comment_client
        }
      });

       // Create a new workbook
        const workbook = xlsx.utils.book_new();

        // Convert data to a worksheet
        const worksheet = xlsx.utils.json_to_sheet(formattedResult);

        // Append the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, 'report');

        // Create a buffer to write the workbook
        const excelBuffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });

        const timestamp = moment().format("YYYYMMDDHHmmss");

        // Set the response headers for file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="report_'+timestamp+'.xlsx"');

        // Send the Excel buffer as a response
        res.send(excelBuffer);
    }
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return res.status(200).send({
      message: "error",
      data: error
    });
    
  }
}

const listYear = async (req,res) => {
    const years = await Ticket.findAll({
    attributes: [
        [sequelize.fn('DISTINCT', sequelize.fn('DATE_PART', 'YEAR', sequelize.col('createdAt'))), 'year'],
    ],
    order: [[sequelize.fn('DATE_PART', 'YEAR', sequelize.col('createdAt')), 'DESC']],
    raw: true, // Return plain objects instead of Sequelize instances
    });

    const yearList = years.map((entry) => entry.year);
    yearList.unshift("");

    // const months = await Ticket.findAll({
    // attributes: [
    //     [sequelize.fn('DISTINCT', sequelize.fn('DATE_PART', 'MONTH', sequelize.col('createdAt'))), 'month'],
    // ],
    // where: {
    //     [sequelize.Op.and]: [
    //         sequelize.where(sequelize.fn('DATE_PART', 'YEAR', sequelize.col('createdAt')), req.body?.year ?? yearList[0])
    //     ]
    // },
    // order: [[sequelize.fn('DATE_PART', 'MONTH', sequelize.col('createdAt')), 'DESC']],
    // raw: true, // Return plain objects instead of Sequelize instances
    // });

    // const monthList = months.map((entry) => entry.month);
    // monthList.unshift("");

    return res.status(200).send({
        is_ok:true,
        message:"Successfully saved",
        data: yearList, 
          //monthList:monthList
    });

}

const listMonth = async (req,res) => {

  if(req.body.hasOwnProperty("year")){
    const monthNames = [
      { value: 1, label: "Jan" }, { value: 2, label: "Feb" }, { value: 3, label: "Mar" },
      { value: 4, label: "Apr" }, { value: 5, label: "May" }, { value: 6, label: "Jun" },
      { value: 7, label: "Jul" }, { value: 8, label: "Aug" }, { value: 9, label: "Sep" },
      { value: 10, label: "Oct" }, { value: 11, label: "Nov" }, { value: 12, label: "Dec" }
    ];
  
    const months = await Ticket.findAll({
    attributes: [
        [sequelize.fn('DISTINCT', sequelize.fn('DATE_PART', 'MONTH', sequelize.col('createdAt'))), 'month'],
    ],
    where: sequelize.where(
      sequelize.fn("DATE_PART", "YEAR", sequelize.col("createdAt")),
      req.body.year
    ),
    order: [[sequelize.fn('DATE_PART', 'MONTH', sequelize.col('createdAt')), 'ASC']],
    raw: true, // Return plain objects instead of Sequelize instances
    });
  
    const existingMonths = new Set(months.map((entry) => entry.month));
  
    const monthList = [
      { value: 0, label: "" }, // Add blank option at the beginning
      ...monthNames.filter((month) => existingMonths.has(month.value)) // Only include months that exist
    ];
  
    return res.status(200).send({
        is_ok:true,
        message:"Successfully load",
        data: monthList
    });
  }

  return res.status(200).send({
    is_ok:false,
    message:"No year was selected"
});

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
    list,
    listParts,
    listDiagnostics,
    listStatus,
    listDC,
    listStoreOption,
    overview,
    listYear,
    listMonth,
    download
}