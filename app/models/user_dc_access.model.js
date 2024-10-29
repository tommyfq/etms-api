module.exports = (sequelize, Sequelize) => {
    const Store = sequelize.define("user_dc_access", {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        user_id:{
            type: Sequelize.INTEGER
        },
        company_id: {
            type: Sequelize.INTEGER
        },
        dc_id: {
            type: Sequelize.INTEGER
        }
    });
  
    return Store;
  };