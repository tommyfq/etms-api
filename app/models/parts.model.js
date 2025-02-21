module.exports = (sequelize, Sequelize) => {
    const Parts = sequelize.define("parts", {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        part_name: {
            type: Sequelize.STRING(250)
        },
        is_active:{
            type: Sequelize.BOOLEAN
        }
    });
    return Parts;
  };