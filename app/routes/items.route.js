const { authJwt, uploadExcel } = require("../middleware");
const controller = require("../controllers/item.controller");

module.exports = function(app) {
  app.post(
    "/api/item/create",
    [authJwt.verifyToken],
    controller.create
  );

  app.post(
    "/api/item/list",
    [authJwt.verifyToken],
    controller.list
  );

  app.get(
    "/api/item/detail/:id",
    [authJwt.verifyToken],
    controller.detail
  );

  app.post(
    "/api/item/update",
    [authJwt.verifyToken],
    controller.update
  );

  app.get(
    "/api/item/list-brand",
    [authJwt.verifyToken],
    controller.listBrand
  );

  app.post(
    "/api/item/list-model",
    [authJwt.verifyToken],
    controller.listModel
  );

  app.get(
    "/api/item/download",
    [authJwt.verifyToken],
    controller.download
  );

  app.patch(
    "/api/item/upload",
    [authJwt.verifyToken, uploadExcel.single('file')],
    controller.upload
  );
};