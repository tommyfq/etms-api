const { authJwt, uploadExcel } = require("../middleware");
const controller = require("../controllers/asset.controller");

module.exports = function(app) {
  app.post(
    "/api/asset/create",
    [authJwt.verifyToken],
    controller.create
  );

  app.post(
    "/api/asset/list",
    [authJwt.verifyToken],
    controller.list
  );

  app.get(
    "/api/asset/detail/:id",
    [authJwt.verifyToken],
    controller.detail
  );

  app.post(
    "/api/asset/update",
    [authJwt.verifyToken],
    controller.update
  );

  app.get(
    "/api/asset/list-option",
    [authJwt.verifyToken],
    controller.listOption
  );

  app.get(
    "/api/asset/download",
    [authJwt.verifyToken],
    controller.download
  );

  app.patch(
    "/api/asset/upload",
    [authJwt.verifyToken, uploadExcel.single('file')],
    controller.upload
  );
};