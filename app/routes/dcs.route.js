const { upload } = require("../middleware");
const controller = require("../controllers/dc.controller");

module.exports = function(app) {
  app.post(
    "/api/dc/create",
    [],
    controller.create
  );

  app.post(
    "/api/dc/list",
    [],
    controller.list
  );

  app.get(
    "/api/dc/detail/:id",
    [],
    controller.detail
  );

  app.post(
    "/api/dc/update",
    [],
    controller.update
  );

  app.get(
    "/api/dc/list-option",
    [],
    controller.listOption
  );

  app.get(
    "/api/dc/list-store-option/:dc_id",
    [],
    controller.listStoreOption
  );

  app.patch(
    "/api/dc/upload",
    [upload.single("file")],
    controller.upload
  );
};