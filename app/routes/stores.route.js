const { authJwt, uploadExcel } = require("../middleware");
const controller = require("../controllers/store.controller");

module.exports = function(app) {
  app.post(
    "/api/store/create",
    [authJwt.verifyToken],
    controller.create
  );

  app.post(
    "/api/store/list",
    [authJwt.verifyToken],
    controller.list
  );

  app.get(
    "/api/store/detail/:id",
    [authJwt.verifyToken],
    controller.detail
  );

  app.post(
    "/api/store/update",
    [authJwt.verifyToken],
    controller.update
  );

  app.patch(
    "/api/store/upload",
    [authJwt.verifyToken, uploadExcel.single("file")],
    controller.upload
  );

  app.get(
    "/api/store/download",
    [authJwt.verifyToken],
    controller.download
  );
};