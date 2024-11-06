module.exports = (sequelize, Sequelize) => {
    const Item = sequelize.define("items", {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        brand: {
            type: Sequelize.STRING(250)
        },
        model:{
            type:Sequelize.STRING(250)
        },
        warranty_duration:{
            type:Sequelize.INTEGER
        },
        is_active: {
            type: Sequelize.BOOLEAN
        },
    });
    return Item;
  };