module.exports = (sequelize, Sequelize) => {
    const Store = sequelize.define("stores", {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        store_code:{
            type: Sequelize.STRING(32)
        },
        store_name: {
            type: Sequelize.STRING(250)
        },
        is_active: {
            type: Sequelize.BOOLEAN
        },
        address: {
            type: Sequelize.TEXT
        },
        dc_id: {
            type: Sequelize.INTEGER
        }
    });
  
    return Store;
  };