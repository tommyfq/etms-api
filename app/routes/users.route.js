const { authJwt } = require("../middleware");
const { uploadAvatar } = require("../middleware/upload");
const controller = require("../controllers/user.controller");

module.exports = function(app) {
  app.get(
    "/api/user/list-agent",
    [authJwt.verifyToken],
    controller.getListAgent
  );

  app.post(
    "/api/user/list",
    [authJwt.verifyToken],
    controller.list
  );

  app.post(
    "/api/user/create",
    [authJwt.verifyToken],
    controller.create
  );

  app.get(
    "/api/user/detail/:id",
    [authJwt.verifyToken],
    controller.detail
  );

  app.post(
    "/api/user/update",
    [authJwt.verifyToken],
    controller.update
  );

  app.get(
    "/api/user/list-role",
    [authJwt.verifyToken],
    controller.getListRole
  );

  app.get(
    "/api/account/detail",
    [authJwt.verifyToken],
    controller.accountDetail
  );

  app.post(
    "/api/account/update",
    [authJwt.verifyToken, uploadAvatar.single("avatar")],
    controller.updateProfile
  );

  app.post(
    "/api/account/change-password",
    [authJwt.verifyToken],
    controller.changePassword
  );
};