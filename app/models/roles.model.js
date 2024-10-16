module.exports = (sequelize, Sequelize) => {
    const Role = sequelize.define("roles", {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        role_name: {
            type: Sequelize.STRING(250)
        },
        is_active: {
            type: Sequelize.BOOLEAN
        }
    });
  
    return Role;
  };