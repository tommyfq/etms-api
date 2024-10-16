module.exports = (sequelize, Sequelize) => {
    const Asset = sequelize.define("assets", {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        serial_number: {
            type: Sequelize.STRING(250)
        },
        is_active: {
            type: Sequelize.BOOLEAN
        },
        dc_id: {
            type: Sequelize.INTEGER
        },
        store_id: {
            type: Sequelize.INTEGER
        },
        waranty_status:{
            type: Sequelize.BOOLEAN
        },
        waranty_date:{
            type:Sequelize.DATE
        },
        item_id:{
            type:Sequelize.INTEGER
        }
    });
  
    return Asset;
  };