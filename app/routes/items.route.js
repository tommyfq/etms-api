//const { authJwt, upload } = require("../middleware");
const controller = require("../controllers/item.controller");

module.exports = function(app) {
  app.post(
    "/api/item/create",
    [],
    controller.create
  );

  app.post(
    "/api/item/list",
    [],
    controller.list
  );

  app.get(
    "/api/item/detail/:id",
    [],
    controller.detail
  );

  app.post(
    "/api/item/update",
    [],
    controller.update
  );

  app.get(
    "/api/item/list-brand",
    [],
    controller.listBrand
  );

  app.post(
    "/api/item/list-model",
    [],
    controller.listModel
  );
};