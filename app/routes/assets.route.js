const { authJwt } = require("../middleware");
const controller = require("../controllers/asset.controller");

module.exports = function(app) {
  app.post(
    "/api/asset/create",
    [],
    controller.create
  );

  app.post(
    "/api/asset/list",
    [],
    controller.list
  );

  app.get(
    "/api/asset/detail/:id",
    [],
    controller.detail
  );

  app.post(
    "/api/asset/update",
    [],
    controller.update
  );

  app.get(
    "/api/asset/list-option",
    [authJwt.verifyToken],
    controller.listOption
  );
};