const db = require("../models");
const Op = db.Sequelize.Op;
const { sequelize, Sequelize } = require("../models");
const Ticket = db.tickets;

const slaLimits = {
    Low: 1,     // Low priority should be resolved within 1 day
    Medium: 3,  // Medium priority should be resolved within 3 days
    High: 5,    // High priority should be resolved within 5 days
};

const getTicketCountByStatus = async (req, res) => {
  
    const predefinedStatuses = ['Open', 'In Progress', 'Cancel', 'On Hold', 'Closed', 'Rejected'];

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
        AND dcs.is_active = true
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

      const years = await Ticket.findAll({
        attributes: [
          [sequelize.fn('DISTINCT', sequelize.fn('DATE_PART', 'YEAR', sequelize.col('createdAt'))), 'year'],
        ],
        order: [[sequelize.fn('DATE_PART', 'YEAR', sequelize.col('createdAt')), 'DESC']],
        raw: true, // Return plain objects instead of Sequelize instances
      });
  
      const yearList = years.map((entry) => entry.year);
  
      // Transform data into the desired structure
      const chartData = rawData.map(item => {
        console.log(item);
        return [item.jan, item.feb, item.mar, item.apr, item.may, item.jun, item.jul, item.aug, item.sep, item.oct, item.nov, item.dec]
    });
  
    return res.status(200).send({
        is_ok:true,
        message:"Successfully saved",
        data: {chartData : chartData[0], yearList:yearList}
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
                        WHEN "closed_at" > "due_date" THEN 1
                        ELSE 0
                    END
                ) AS INT) AS sla_performed,
                CAST(SUM(
                    CASE 
                        WHEN "closed_at" <= "due_date" OR "closed_at" IS NULL THEN 1
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

  module.exports = {
    getTicketCountByStatus,
    getTicketChartByYear,
    getSlaTicketCounts
}