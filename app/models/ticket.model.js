module.exports = (sequelize, Sequelize) => {
    const Ticket = sequelize.define("tickets", {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        ticket_no:{
            type: Sequelize.STRING(64),
            unique:true
        },
        title:{
            type: Sequelize.STRING(250)
        },
        asset_id: {
            type: Sequelize.INTEGER
        },
        status: {
            /* Open, Rejected, In Progress, Completed */
            type: Sequelize.STRING(32)
        },
        priority:{
            type: Sequelize.STRING(64)
        },
        on_hold:{
            type: Sequelize.BOOLEAN,
            defaultValue: false
        },
        description: {
            type: Sequelize.STRING(4000)
        },
        cc:{
            type:Sequelize.STRING(4000)
        },
        created_by:{
            type:Sequelize.INTEGER
        },
        due_date:{
            type:Sequelize.DATE
        },
        comment_client:{
            type:Sequelize.STRING(4000)
        },
        comment_client_date:{
            type:Sequelize.DATE
        },
        comment_client_by:{
            type:Sequelize.STRING(200)
        },
        comment_internal:{
            type:Sequelize.STRING(4000)
        },
        comment_internal_date:{
            type:Sequelize.DATE
        },
        comment_internal_by:{
            type:Sequelize.STRING(200)
        }
    });
  
    return Ticket;
  };