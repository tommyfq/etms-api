//const { authJwt, upload } = require("../middleware");
const controller = require("../controllers/company.controller");

module.exports = function(app) {
  app.post(
    "/api/company/create",
    [],
    controller.create
  );

  app.post(
    "/api/company/list",
    [],
    controller.list
  );

  app.get(
    "/api/company/detail/:id",
    [],
    controller.detail
  );

  app.post(
    "/api/company/update",
    [],
    controller.update
  );

  app.get(
    "/api/company/list-option",
    [],
    controller.listOption
  );
};