module.exports = (sequelize, Sequelize) => {
    const User = sequelize.define("users", {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        username: {
            type: Sequelize.STRING(250)
        },
        password:{
            type: Sequelize.STRING(500)
        },
        email: {
            type: Sequelize.STRING(4000)
        },
        is_active: {
            type: Sequelize.BOOLEAN
        },
        role_id: {
            type: Sequelize.INTEGER
        },
        name: {
            type: Sequelize.STRING(300)
        },
        avatar: {
            type: Sequelize.STRING(4000)
        }
    });
  
    return User;
  };