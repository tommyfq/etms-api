const { authJwt } = require("../middleware");
const controller = require("../controllers/company.controller");

module.exports = function(app) {
  app.post(
    "/api/company/create",
    [authJwt.verifyToken],
    controller.create
  );

  app.post(
    "/api/company/list",
    [authJwt.verifyToken],
    controller.list
  );

  app.get(
    "/api/company/detail/:id",
    [authJwt.verifyToken],
    controller.detail
  );

  app.post(
    "/api/company/update",
    [authJwt.verifyToken],
    controller.update
  );

  app.get(
    "/api/company/list-option",
    [authJwt.verifyToken],
    controller.listOption
  );
};