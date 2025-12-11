const { authJwt, uploadExcel } = require("../middleware");
const controller = require("../controllers/holidays.controller");

module.exports = function(app) {
  app.post(
    "/api/holiday/create",
    [authJwt.verifyToken],
    controller.create
  );

  app.post(
    "/api/holiday/list",
    [authJwt.verifyToken],
    controller.list
  );

  app.post(
    "/api/holiday/update",
    [authJwt.verifyToken],
    controller.update
  );

  app.patch(
    "/api/holiday/upload",
    [authJwt.verifyToken, uploadExcel.single("file")],
    controller.upload
  );

  app.get(
    "/api/holiday/detail/:id",
    [authJwt.verifyToken],
    controller.detail
  );

  app.get(
    "/api/holiday/download",
    [authJwt.verifyToken],
    controller.download
  );
};