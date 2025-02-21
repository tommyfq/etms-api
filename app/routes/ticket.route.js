const { authJwt, storeImages } = require("../middleware");
const controller = require("../controllers/ticket.controller");

module.exports = function(app) {
  app.post(
    "/api/ticket/create",
    [authJwt.verifyToken], 
    async (req, res, next) => {
      try {
        req.ticketNo = await controller.generateTicketNumber(); // Set ticket number on `req`
        next();
      } catch (error) {
        console.error("Error generating ticket number:", error);
        res.status(500).json({ is_ok: false, message: "Error generating ticket number" });
      }
    },
    storeImages,
    controller.create
  );

  app.post(
    "/api/ticket/list",
    [authJwt.verifyToken],
    controller.list
  );

  app.get(
    "/api/ticket/list-parts",
    [authJwt.verifyToken],
    controller.listParts
  );

  app.get(
    "/api/ticket/list-diagnostics",
    [authJwt.verifyToken],
    controller.listDiagnostics
  );

  app.get(
    "/api/ticket/list-status",
    [authJwt.verifyToken],
    controller.listStatus
  );

  app.get(
    "/api/ticket/detail/:id",
    [authJwt.verifyToken],
    controller.detail
  );

  app.post(
    "/api/ticket/update",
    [authJwt.verifyToken],
    controller.update
  );

  app.get(
    "/api/ticket/overview",
    [authJwt.verifyToken],
    controller.overview
  );

//   app.patch(
//     "/api/store/upload",
//     [upload.single("file")],
//     controller.upload
//   );
};