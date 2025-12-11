module.exports = (sequelize, Sequelize) => {
    const Holiday = sequelize.define("holidays", {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name:{
            type:Sequelize.STRING
        },
        date:{
            type:Sequelize.DATE
        },
        is_active:{
            type:Sequelize.BOOLEAN
        }
    });

    return Holiday;
  };