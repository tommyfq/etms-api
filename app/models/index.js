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
db.user_dc_access = require('./user_dc_access.model.js')(sequelize, Sequelize);
db.tickets = require('./ticket.model.js')(sequelize, Sequelize);
db.tickets_attachment = require('./ticket_attachment.model.js')(sequelize, Sequelize);

db.users.belongsTo(db.roles,{
    foreignKey:"role_id",
    targetKey:"id"
});

db.roles.hasMany(db.users,{
  foreignKey: 'role_id', 
  as: 'roles' 
});

db.companies.belongsTo(db.users,{
    foreignKey:"default_agent_id",
    targetKey:"id"
});

db.companies.hasMany(db.dcs,{ 
  foreignKey: 'company_id', 
  as: 'dcs' 
})

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

db.items.hasMany(db.assets,{
  as : "item",
  foreignKey: "item_id"
});

db.user_dc_access.belongsTo(db.users,{
  foreignKey:"user_id",
  targetKey:"id"
});

db.user_dc_access.belongsTo(db.dcs,{
  foreignKey:"dc_id",
  targetKey:"id"
});

db.user_dc_access.belongsTo(db.companies,{
  foreignKey:"company_id",
  targetKey:"id"
});

db.users.hasMany(db.user_dc_access,{
  as : "access",
  foreignKey: "user_id"
});

db.tickets.belongsTo(db.users,{
  foreignKey:"created_by",
  targetKey:"id"
});

db.tickets.belongsTo(db.assets,{
  foreignKey:"asset_id",
  targetKey:"id"
});

db.tickets_attachment.belongsTo(db.tickets,{
  foreignKey:"ticket_id",
  targetKey:"id"
});

db.tickets.hasMany(db.tickets_attachment, {
  foreignKey: "ticket_id", // The key in the tickets_attachment table
  sourceKey: "id", // The primary key in the tickets table
  as: "attachments" // Optional: alias for the relationship
});

module.exports = db;