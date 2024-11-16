const { authJwt, uploadExcel } = require("../middleware");
const controller = require("../controllers/dashboard.controller");

module.exports = function(app) {
  app.get(
    "/api/dashboard/ticket-count-by-status",
    [authJwt.verifyToken],
    controller.getTicketCountByStatus
  );

  app.get(
    "/api/dashboard/ticket-chart-by-year/:year",
    [authJwt.verifyToken],
    controller.getTicketChartByYear
  );

  app.get(
    "/api/dashboard/sla-ticket-count",
    [authJwt.verifyToken],
    controller.getSlaTicketCounts
  );
};