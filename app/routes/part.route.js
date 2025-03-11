const { authJwt, uploadExcel } = require("../middleware");
const controller = require("../controllers/part.controller");

module.exports = function(app) {
  app.post(
    "/api/part/create",
    [authJwt.verifyToken],
    controller.create
  );

  app.post(
    "/api/part/list",
    [authJwt.verifyToken],
    controller.list
  );

  app.get(
    "/api/part/detail/:id",
    [authJwt.verifyToken],
    controller.detail
  );

  app.post(
    "/api/part/update",
    [authJwt.verifyToken],
    controller.update
  );

  app.get(
    "/api/part/download",
    [authJwt.verifyToken],
    controller.download
  );

  app.patch(
    "/api/part/upload",
    [authJwt.verifyToken, uploadExcel.single('file')],
    controller.upload
  );
};