const { authJwt, uploadExcel } = require('../middleware');
const controller = require("../controllers/dc.controller");

module.exports = function(app) {
  app.post(
    "/api/dc/create",
    [authJwt.verifyToken],
    controller.create
  );

  app.post(
    "/api/dc/list",
    [authJwt.verifyToken],
    controller.list
  );

  app.get(
    "/api/dc/detail/:id",
    [authJwt.verifyToken],
    controller.detail
  );

  app.post(
    "/api/dc/update",
    [authJwt.verifyToken],
    controller.update
  );

  app.get(
    "/api/dc/list-all-option",
    [authJwt.verifyToken],
    controller.listAllOption
  );

  app.post(
    "/api/dc/list-option",
    [authJwt.verifyToken],
    controller.listOptionByComp
  );

  app.get(
    "/api/dc/list-option/:company_id",
    [authJwt.verifyToken],
    controller.listOption
  );

  app.get(
    "/api/dc/list-store-option/:dc_id",
    [authJwt.verifyToken],
    controller.listStoreOption
  );

  app.patch(
    "/api/dc/upload",
    [authJwt.verifyToken, uploadExcel.single('file')],
    controller.upload
  );

  app.get(
    "/api/dc/download",
    [authJwt.verifyToken],
    controller.download
  );
};