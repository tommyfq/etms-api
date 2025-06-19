module.exports = (sequelize, Sequelize) => {
    const DC = sequelize.define("dcs", {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        dc_code:{
            type: Sequelize.STRING(32)
        },
        dc_name: {
            type: Sequelize.STRING(250)
        },
        is_active: {
            type: Sequelize.BOOLEAN
        },
        address: {
            type: Sequelize.TEXT
        },
        company_id: {
            type: Sequelize.INTEGER
        }
    });
  
    return DC;
  };