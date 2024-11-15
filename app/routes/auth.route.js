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
}