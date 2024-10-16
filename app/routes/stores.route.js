const { upload } = require("../middleware");
const controller = require("../controllers/store.controller");

module.exports = function(app) {
  app.post(
    "/api/store/create",
    [],
    controller.create
  );

  app.post(
    "/api/store/list",
    [],
    controller.list
  );

  app.get(
    "/api/store/detail/:id",
    [],
    controller.detail
  );

  app.post(
    "/api/store/update",
    [],
    controller.update
  );

  app.patch(
    "/api/store/upload",
    [upload.single("file")],
    controller.upload
  );
};