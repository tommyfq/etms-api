const { authJwt, storeImages } = require("../middleware");
const controller = require("../controllers/report.controller");

module.exports = function(app) {

  app.post(
    "/api/report/list",
    [authJwt.verifyToken],
    controller.list
  );

  app.post(
    "/api/report/list-filter",
    [authJwt.verifyToken],
    controller.ListFilter
  );

};