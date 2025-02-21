module.exports = (sequelize, Sequelize) => {
    const Diagnostic = sequelize.define("diagnostics", {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        diagnostic_name: {
            type: Sequelize.STRING(250)
        },
        is_active:{
            type: Sequelize.BOOLEAN
        }
    });
    return Diagnostic;
  };