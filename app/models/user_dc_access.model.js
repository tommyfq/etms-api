module.exports = (sequelize, Sequelize) => {
    const UserDCAccess = sequelize.define("user_dc_access", {
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
            type: Sequelize.INTEGER,
            allowNull: true
        }
    });
  
    return UserDCAccess;
  };