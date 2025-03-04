const db = require("../models");
const Op = db.Sequelize.Op;
const { sequelize, Sequelize } = require("../models");
const Ticket = db.tickets;
const { createPagination } = require("../helpers/pagination");

const slaLimits = {
    Low: 1,     // Low priority should be resolved within 1 day
    Medium: 3,  // Medium priority should be resolved within 3 days
    High: 5,    // High priority should be resolved within 5 days
};

const getTicketCountByStatus = async (req, res) => {
  
    const predefinedStatuses = ['open', 'in progress', 'on hold'];

    let where_query = "1=1";
    let params = [];

    // Dynamically add placeholders for the predefined statuses
    const statusPlaceholders = predefinedStatuses.map((_, index) => `$${params.length + index + 1}`).join(', ');
    where_query += ` AND tickets.status IN (${statusPlaceholders})`;
    params.push(...predefinedStatuses);

    console.log(req.dcs);
    if (req.dcs && req.dcs.length > 0) {
        // Dynamically add placeholders for DCs
        const dcPlaceholders = req.dcs.map((_, index) => `$${params.length + index + 1}`).join(', ');
        where_query += ` AND assets.dc_id IN (${dcPlaceholders})`; // Add filter for dc_id
        params.push(...req.dcs);
    }

    // Build the raw SQL query to count tickets by status
    const rawQuery = `
        SELECT 
        status,
        COUNT(*) AS count
        FROM tickets
        LEFT JOIN assets on assets.id = tickets.asset_id
        LEFT JOIN dcs on dcs.id = assets.dc_id
        WHERE ${where_query}
        GROUP BY status
    `;

    // Execute the raw query with the predefined statuses as parameter
    const ticketCounts = await sequelize.query(rawQuery, {
        bind: params,
        type: Sequelize.QueryTypes.SELECT,
    });
  
    console.log(ticketCounts)
    // Convert ticket counts into an object with status as key and count as value
    const statusCountMap = ticketCounts.reduce((acc, ticket) => {
        console.log(ticket)
      acc[ticket.status] = parseInt(ticket.count, 10);
      return acc;
    }, {});
  
    // Create the final result with all predefined statuses, ensuring all have a count
    const result = predefinedStatuses.map(status => ({
      status: status,
      count: statusCountMap[status] || 0, // Set to 0 if the status is not found
    }));
  
    // Format the result and calculate the total count
    const total = result.reduce((sum, status) => sum + status.count, 0);
  
    // Return the response
    return res.status(200).send({
      is_ok: true,
      message: "Successfully retrieved ticket counts by status",
      data: {
        ticketCounts: result,
        total: total, // Add total count of tickets
      },
    });
  };

const getTicketChartByYear = async (req,res) => {
    console.log(req.params)
    const year = req.params.year

    let where_query = "1=1";
    let params = []

    where_query += ` AND EXTRACT(YEAR FROM tickets."createdAt") = $${params.length + 1}`;
    params.push(year);

    if (req.dcs && req.dcs.length > 0) {
        // Dynamically add placeholders for DCs
        const dcPlaceholders = req.dcs.map((_, index) => `$${params.length + index + 1}`).join(', ');
        where_query += ` AND assets.dc_id IN (${dcPlaceholders})`; // Add filter for dc_id
        params.push(...req.dcs);
    }

    console.log(params);

    const rawData = await sequelize.query(
        `
        SELECT 
            CAST(SUM(CASE WHEN EXTRACT(MONTH FROM tickets."createdAt") = 1 THEN 1 ELSE 0 END) AS INT) AS Jan,
            CAST(SUM(CASE WHEN EXTRACT(MONTH FROM tickets."createdAt") = 2 THEN 1 ELSE 0 END) AS INT) AS Feb,
            CAST(SUM(CASE WHEN EXTRACT(MONTH FROM tickets."createdAt") = 3 THEN 1 ELSE 0 END) AS INT) AS Mar,
            CAST(SUM(CASE WHEN EXTRACT(MONTH FROM tickets."createdAt") = 4 THEN 1 ELSE 0 END) AS INT) AS Apr,
            CAST(SUM(CASE WHEN EXTRACT(MONTH FROM tickets."createdAt") = 5 THEN 1 ELSE 0 END) AS INT) AS May,
            CAST(SUM(CASE WHEN EXTRACT(MONTH FROM tickets."createdAt") = 6 THEN 1 ELSE 0 END) AS INT) AS Jun,
            CAST(SUM(CASE WHEN EXTRACT(MONTH FROM tickets."createdAt") = 7 THEN 1 ELSE 0 END) AS INT) AS Jul,
            CAST(SUM(CASE WHEN EXTRACT(MONTH FROM tickets."createdAt") = 8 THEN 1 ELSE 0 END) AS INT) AS Aug,
            CAST(SUM(CASE WHEN EXTRACT(MONTH FROM tickets."createdAt") = 9 THEN 1 ELSE 0 END) AS INT) AS Sep,
            CAST(SUM(CASE WHEN EXTRACT(MONTH FROM tickets."createdAt") = 10 THEN 1 ELSE 0 END) AS INT) AS Oct,
            CAST(SUM(CASE WHEN EXTRACT(MONTH FROM tickets."createdAt") = 11 THEN 1 ELSE 0 END) AS INT) AS Nov,
            CAST(SUM(CASE WHEN EXTRACT(MONTH FROM tickets."createdAt") = 12 THEN 1 ELSE 0 END) AS INT) AS Dec
        FROM 
            tickets
        LEFT JOIN assets ON assets.id = tickets.asset_id
        LEFT JOIN dcs ON dcs.id = assets.dc_id
        WHERE 
            ${where_query}
        `,
        {
          bind: params, // Replaces :year with the value from the query
          type: Sequelize.QueryTypes.SELECT,
        }
      );

      // Transform data into the desired structure
      const chartData = rawData.map(item => {
          console.log(item);
          return [item.jan, item.feb, item.mar, item.apr, item.may, item.jun, item.jul, item.aug, item.sep, item.oct, item.nov, item.dec]
      });


      const rawDataSLA = await sequelize.query(
        `
        SELECT 
            CAST(SUM(CASE WHEN EXTRACT(MONTH FROM tickets."createdAt") = 1 AND (closed_at - tickets."createdAt") < INTERVAL '3 days' THEN 1 ELSE 0 END) AS INT) AS Jan,
            CAST(SUM(CASE WHEN EXTRACT(MONTH FROM tickets."createdAt") = 2 AND (closed_at - tickets."createdAt") < INTERVAL '3 days' THEN 1 ELSE 0 END) AS INT) AS Feb,
            CAST(SUM(CASE WHEN EXTRACT(MONTH FROM tickets."createdAt") = 3 AND (closed_at - tickets."createdAt") < INTERVAL '3 days' THEN 1 ELSE 0 END) AS INT) AS Mar,
            CAST(SUM(CASE WHEN EXTRACT(MONTH FROM tickets."createdAt") = 4 AND (closed_at - tickets."createdAt") < INTERVAL '3 days' THEN 1 ELSE 0 END) AS INT) AS Apr,
            CAST(SUM(CASE WHEN EXTRACT(MONTH FROM tickets."createdAt") = 5 AND (closed_at - tickets."createdAt") < INTERVAL '3 days' THEN 1 ELSE 0 END) AS INT) AS May,
            CAST(SUM(CASE WHEN EXTRACT(MONTH FROM tickets."createdAt") = 6 AND (closed_at - tickets."createdAt") < INTERVAL '3 days' THEN 1 ELSE 0 END) AS INT) AS Jun,
            CAST(SUM(CASE WHEN EXTRACT(MONTH FROM tickets."createdAt") = 7 AND (closed_at - tickets."createdAt") < INTERVAL '3 days' THEN 1 ELSE 0 END) AS INT) AS Jul,
            CAST(SUM(CASE WHEN EXTRACT(MONTH FROM tickets."createdAt") = 8 AND (closed_at - tickets."createdAt") < INTERVAL '3 days' THEN 1 ELSE 0 END) AS INT) AS Aug,
            CAST(SUM(CASE WHEN EXTRACT(MONTH FROM tickets."createdAt") = 9 AND (closed_at - tickets."createdAt") < INTERVAL '3 days' THEN 1 ELSE 0 END) AS INT) AS Sep,
            CAST(SUM(CASE WHEN EXTRACT(MONTH FROM tickets."createdAt") = 10 AND (closed_at - tickets."createdAt") < INTERVAL '3 days' THEN 1 ELSE 0 END) AS INT) AS Oct,
            CAST(SUM(CASE WHEN EXTRACT(MONTH FROM tickets."createdAt") = 11 AND (closed_at - tickets."createdAt") < INTERVAL '3 days' THEN 1 ELSE 0 END) AS INT) AS Nov,
            CAST(SUM(CASE WHEN EXTRACT(MONTH FROM tickets."createdAt") = 12 AND (closed_at - tickets."createdAt") < INTERVAL '3 days' THEN 1 ELSE 0 END) AS INT) AS Dec
        FROM tickets
        LEFT JOIN assets ON assets.id = tickets.asset_id
        LEFT JOIN dcs ON dcs.id = assets.dc_id
        WHERE 
            ${where_query}
        `,
        {
          bind: params, // Replaces :year with the value from the query
          type: Sequelize.QueryTypes.SELECT,
        }
      );

      const chartDataSLA = rawDataSLA.map(item => {
          console.log(item);
          return [item.jan, item.feb, item.mar, item.apr, item.may, item.jun, item.jul, item.aug, item.sep, item.oct, item.nov, item.dec]
      });

      const years = await Ticket.findAll({
        attributes: [
          [sequelize.fn('DISTINCT', sequelize.fn('DATE_PART', 'YEAR', sequelize.col('createdAt'))), 'year'],
        ],
        order: [[sequelize.fn('DATE_PART', 'YEAR', sequelize.col('createdAt')), 'DESC']],
        raw: true, // Return plain objects instead of Sequelize instances
      });
  
      const yearList = years.map((entry) => entry.year);

      const currentYear = new Date().getFullYear();
      if (!yearList.includes(currentYear)) {
        yearList.push(currentYear);
      }

    return res.status(200).send({
        is_ok:true,
        message:"Successfully saved",
        data: {chartData : chartData[0], yearList:yearList, chartDataSLA:chartDataSLA[0]}
    });
}

const getSlaTicketCounts = async (req,res) => {
    const year = req.params.year

    let where_query = `1=1 AND tickets."closed_at" IS NOT NULL`;
    let params = []

    // where_query += ` AND EXTRACT(YEAR FROM tickets."createdAt") = $${params.length + 1}`;
    // params.push(year);

    if (req.dcs && req.dcs.length > 0) {
        // Dynamically add placeholders for DCs
        const dcPlaceholders = req.dcs.map((_, index) => `$${params.length + index + 1}`).join(', ');
        where_query += ` AND assets.dc_id IN (${dcPlaceholders})`; // Add filter for dc_id
        params.push(...req.dcs);
    }

    try {
        const rawQuery = `
            SELECT 
                CAST(COUNT(*) AS INT) AS total_tickets,
                CAST(SUM(
                    CASE 
                        WHEN (closed_at - tickets."createdAt") < INTERVAL '3 days' THEN 1
                        ELSE 0
                    END
                ) AS INT) AS sla_performed,
                CAST(SUM(
                    CASE 
                        WHEN (closed_at - tickets."createdAt") > INTERVAL '3 days' THEN 1
                        ELSE 0
                    END
                ) AS INT) AS sla_not_performed
            FROM tickets
            LEFT JOIN assets ON assets.id = tickets.asset_id
            LEFT JOIN dcs ON dcs.id = assets.dc_id
            WHERE ${where_query}
        `;

        const tickets = await sequelize.query(rawQuery, {
            bind: params, // Replace :year with the year value
            type: Sequelize.QueryTypes.SELECT, // Use SELECT for querying data
        });
        
        // let slaPerformed = { Low: 0, Medium: 0, High: 0 };
        // let slaNotPerformed = { Low: 0, Medium: 0, High: 0 };
        
        // // Process the ticket data to count SLA performed vs. not performed
        // tickets.forEach(ticket => {
        //     const priority = ticket.priority;
        //     const inProgressAt = new Date(ticket.in_progress_at);
        //     const closedAt = new Date(ticket.closed_at);
        
        //     // Calculate the number of days between createdAt and closedAt
        //     const diffTime = Math.abs(closedAt - inProgressAt);
        //     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Convert time difference to days
        
        //     // Check if the ticket met the SLA for the priority
        //     if (diffDays <= slaLimits[priority]) {
        //         // SLA performed
        //         slaPerformed[priority] += 1;
        //     } else {
        //         // SLA not performed
        //         slaNotPerformed[priority] += 1;
        //     }
        // });
  
      return res.status(200).send({
        is_ok:true,
        message:"Successfully saved",
        data: tickets[0]
    });
    } catch (error) {
      console.error('Error fetching SLA ticket counts:', error);
      throw error;
    }
  };

const getListRepairAsset = async (req,res) => {

  let page = parseInt(req.body.page, 10);
  var page_length = req.body.items_per_page; //default 20
  var column_sort = `s.store_code`;
  var order = "asc"
  let params = [];
  let where_query = `1 = 1`;
  
  if(req.body.hasOwnProperty("sort")){
    
    if(req.body.sort == 'asset_count'){
      column_sort = `3`
    }else if(req.body.sort == 'active_asset_count'){
      column_sort = `4`
    }else if(req.body.sort == 'repaired_asset_count'){
      column_sort = `5`
    }else if(req.body.sort == 'percentage'){
      column_sort = `6`
    }else{
      column_sort = `s.${req.body.sort}`
    }
  }

  if(req.body.hasOwnProperty("order")){
    order = req.body.order
  }

  if (req.body.hasOwnProperty("search") && req.body.search) {
    const searchParamIndex = params.length + 1;
    const searchValue = `%${req.body.search}%`;
  
    where_query += ` AND (
      s.store_code ILIKE $${searchParamIndex} OR 
      s.store_name ILIKE $${searchParamIndex}
      )`;
    params.push(searchValue); // Bind the same search value for both brand and model
  }

  

  if (req.dcs && req.dcs.length > 0) {

    const dcPlaceholders = req.dcs.map((_, index) => `$${params.length + index + 1}`).join(', ');
    where_query += ` AND a.dc_id IN (${dcPlaceholders})`; // Add filter for dc_id
    params = [...params, ...req.dcs];
  }

  if(req.role_name != "admin"){
    where_query += ` AND dcs.is_active = true`
  }

  try{
    const countQuery = `
    SELECT 
          COUNT(s.store_code) as total
      FROM assets a
      LEFT JOIN stores s ON s.id = a.store_id
      LEFT JOIN dcs ON dcs.id = s.dc_id
      WHERE ${where_query}
      GROUP BY s.store_code
    `;

    const countResult = await sequelize.query(countQuery, {
      bind: params,
      type: sequelize.QueryTypes.SELECT,
    });
    
    const totalRows = countResult.length > 0 ? countResult[0].total : 0;

    if (totalRows === 0) {
      return res.status(200).send({
        is_ok: false,
        message: "No assets under repair",
        data: [],
      });
    }

    const offset = (page - 1) * page_length;
    params.push(page_length, offset);

    const result = await sequelize.query(`
      SELECT 
          s.store_code, 
          s.store_name, 
          CAST(COUNT(a.id) AS INTEGER) AS asset_count,
          CAST(SUM(CASE WHEN a.is_active = true THEN 1 ELSE 0 END) AS INTEGER) AS active_asset_count,
          CAST(
            SUM(
              CASE 
                  WHEN a.id IN (
                      SELECT asset_id 
                      FROM tickets 
                      WHERE status IN ('Open', 'In Progress', 'On Hold')
                  ) THEN 1 
                  ELSE 0 
              END
            )
          AS INTEGER) AS repaired_asset_count,
        CASE 
            WHEN SUM(CASE WHEN a.is_active = true THEN 1 ELSE 0 END) = 0 THEN 0
            ELSE 
              CAST(
                (
                CAST(
                  SUM(
                    CASE 
                        WHEN a.id IN (
                            SELECT asset_id 
                            FROM tickets 
                            WHERE status IN ('Open', 'In Progress', 'On Hold')
                        ) THEN 1 
                        ELSE 0 
                    END
                  ) AS FLOAT)
                ) /
                CAST(SUM(CASE WHEN a.is_active = true THEN 1 ELSE 0 END) AS FLOAT)
                * 100 AS INTEGER)
        END AS percentage
      FROM assets a
      LEFT JOIN stores s ON s.id = a.store_id
      LEFT JOIN dcs ON dcs.id = s.dc_id
      WHERE ${where_query}
      GROUP BY s.store_name, s.store_code
      ORDER BY ${column_sort} ${order}
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, {
      bind: params,
      type: Sequelize.QueryTypes.SELECT 
    });

    const total_count = totalRows; // Total number of items
    const total_pages = Math.ceil(total_count / page_length)

    if(result.length > 0){

      return res.status(200).send({
          message: "Success",
          data: result,
          payload: {
            pagination: createPagination(page, total_pages, page_length, result.count)
          }
        });
    }

    return res.status(200).send({
        is_ok:false,
        message:"No assets under repair",
        data: result
    })
  } catch (error) {
      console.error('Error fetching tickets:', error);
      return res.status(200).send({
        message: "error",
        data: error
      });
      
  }
  
}

  module.exports = {
    getTicketCountByStatus,
    getTicketChartByYear,
    getSlaTicketCounts,
    getListRepairAsset
}