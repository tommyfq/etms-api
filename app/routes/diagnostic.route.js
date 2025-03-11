const { authJwt, uploadExcel } = require("../middleware");
const controller = require("../controllers/diagnostic.controller");

module.exports = function(app) {
  app.post(
    "/api/case-category/create",
    [authJwt.verifyToken],
    controller.create
  );

  app.post(
    "/api/case-category/list",
    [authJwt.verifyToken],
    controller.list
  );

  app.get(
    "/api/case-category/detail/:id",
    [authJwt.verifyToken],
    controller.detail
  );

  app.post(
    "/api/case-category/update",
    [authJwt.verifyToken],
    controller.update
  );

  app.get(
    "/api/case-category/download",
    [authJwt.verifyToken],
    controller.download
  );

  app.patch(
    "/api/case-category/upload",
    [authJwt.verifyToken, uploadExcel.single('file')],
    controller.upload
  );
};