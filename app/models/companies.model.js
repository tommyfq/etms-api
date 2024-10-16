module.exports = (sequelize, Sequelize) => {
    const Company = sequelize.define("companies", {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        company_code:{
            type:Sequelize.STRING(32)
        },
        company_name: {
            type: Sequelize.STRING(250)
        },
        is_active: {
            type: Sequelize.BOOLEAN
        },
        contact_name: {
            type: Sequelize.STRING(64)
        },
        contact_number: {
            type: Sequelize.STRING(32)
        },
        default_agent_id: {
            type: Sequelize.INTEGER
        }
    });
  
    return Company;
  };