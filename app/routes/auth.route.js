const controller = require("../controllers/auth.controller");

module.exports = function(app) {
  app.post(
    "/api/auth/signin",
    [],
    controller.signin
  );

  app.post(
    "/api/auth/verify-token",
    [],
    controller.verifyToken
  );

  app.get(
    "/api/test-email",
    [],
    controller.testEmail
  );

  app.post(
    "/api/auth/forgot-password",
    [],
    controller.forgotPassword
  );

  app.post(
    "/api/auth/reset-password",
    [],
    controller.resetPassword
  );

  app.get(
    "/api/auth/check-token",
    [],
    controller.checkToken
  );
}