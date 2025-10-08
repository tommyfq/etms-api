const express = require("express");
const path = require('path');
const bodyParser = require("body-parser");
const cors = require("cors");
const config = require("./config/app.config");

const app = express();

global.__basedir = __dirname;

var corsOptions = {
  origin: "http://localhost:5173"
};

app.use(cors(corsOptions));

// parse requests of content-type - application/json
app.use(bodyParser.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));
app.use("/avatars", express.static(path.join(__dirname, "public", "avatars")));

const db = require("./app/models");
db.sequelize.sync({ alter: true }).then(() => {
    console.log("Drop and re-sync db.");
});

require('./app/routes')(app);

// simple route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to bezkoder application.." });
});

// set port, listen for requests
const PORT = process.env.PORT || config.app_port;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});