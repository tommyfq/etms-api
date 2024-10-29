module.exports = function(app) {
    // Set up CORS headers
    app.use(function(req, res, next) {
      res.header(
        "Access-Control-Allow-Headers",
        "x-access-token, Origin, Content-Type, Accept"
      );
      next();
    });
  
    // Require and use other route files
    require('./companies.route')(app);
    require('./users.route')(app);
    require('./dcs.route')(app)
    require('./stores.route')(app)
    require('./assets.route')(app)
    require('./items.route')(app)
    require('./auth.route')(app)
    require('./ticket.route')(app)
    // Add more routes as needed
    // require('./another-routes-file')(app);
  };