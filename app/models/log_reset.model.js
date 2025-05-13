module.exports = (sequelize, Sequelize) => {
    const LogReset = sequelize.define("log_resets", {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        token: {
            type: Sequelize.STRING(250)
        },
        user_id:{
            type:Sequelize.INTEGER
        }
    });
    return LogReset;
  };