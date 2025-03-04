const { authJwt, storeImages } = require("../middleware");
const controller = require("../controllers/report.controller");

module.exports = function(app) {

  app.post(
    "/api/report/list",
    [authJwt.verifyToken],
    controller.list
  );

  app.post(
    "/api/report/list-year",
    [authJwt.verifyToken],
    controller.listYear
  );

  app.post(
    "/api/report/list-month",
    [authJwt.verifyToken],
    controller.listMonth
  );

  app.post(
    "/api/report/download",
    [authJwt.verifyToken],
    controller.download
  );

};