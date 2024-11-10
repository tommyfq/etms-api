module.exports = (sequelize, Sequelize) => {
    const TicketLog = sequelize.define("ticket_log", {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        ticket_id: {
            type: Sequelize.INTEGER
        },
        asset_id: {
            type: Sequelize.INTEGER
        },
        user_id: {
            type: Sequelize.INTEGER
        },
        status: {
            type: Sequelize.STRING(32)
        },
        text: {
            type: Sequelize.STRING(4000)
        }
    });
  
    return TicketLog;
  };