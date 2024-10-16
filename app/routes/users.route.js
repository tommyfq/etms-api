//const { authJwt, upload } = require("../middleware");
const controller = require("../controllers/user.controller");

module.exports = function(app) {
  app.get(
    "/api/user/list-agent",
    [],
    controller.getListAgent
  );

  app.post(
    "/api/user/list",
    [],
    controller.list
  );

  app.post(
    "/api/user/create",
    [],
    controller.create
  );

  app.get(
    "/api/user/detail/:id",
    [],
    controller.detail
  );

  app.post(
    "/api/user/update",
    [],
    controller.update
  );

  app.get(
    "/api/user/list-role",
    [],
    controller.getListRole
  );
};