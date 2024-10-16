const dbConfig = require("../../config/db.config.js");

const Sequelize = require("sequelize");
const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  operatorsAliases: 0,

  pool: {
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle
  }
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.companies = require("./companies.model.js")(sequelize, Sequelize);
db.users = require("./users.model.js")(sequelize, Sequelize);
db.roles = require("./roles.model.js")(sequelize, Sequelize);
db.dcs = require('./dcs.model.js')(sequelize, Sequelize);
db.stores = require('./stores.model.js')(sequelize, Sequelize);
db.assets = require('./assets.model.js')(sequelize, Sequelize);
db.items = require('./items.model.js')(sequelize, Sequelize);

db.users.belongsTo(db.roles,{
    foreignKey:"role_id",
    targetKey:"id"
});

db.companies.belongsTo(db.users,{
    foreignKey:"default_agent_id",
    targetKey:"id"
});

db.dcs.belongsTo(db.companies,{
  foreignKey:"company_id",
  targetKey:"id"
});

db.stores.belongsTo(db.dcs,{
  foreignKey:"dc_id",
  targetKey:"id"
});

db.dcs.hasMany(db.stores,{
  as : "stores",
  foreignKey: "dc_id"
});

db.assets.belongsTo(db.dcs,{
  foreignKey:"dc_id",
  targetKey:"id"
});

db.assets.belongsTo(db.stores,{
  foreignKey:"store_id",
  targetKey:"id"
});

db.assets.belongsTo(db.items,{
  foreignKey:"item_id",
  targetKey:"id"
});

module.exports = db;