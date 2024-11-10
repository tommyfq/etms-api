const jwt = require("jsonwebtoken");
const config = require("../../config/app.config");

verifyToken = (req, res, next) => {
    let token = req.headers['authorization'];
    console.log(token);

    if (!token) {
      console.log("MASUK")
      return res.status(403).send({
        message: "No token provided!"
      });
    }

    if (!token.startsWith("Bearer ")) {
      console.log("MASUK SINI")
      return res.status(403).send({
        message: "No token provided!"
      });
    }

    token = token.replace("Bearer ","");
  
    jwt.verify(token, config.secret, (err, decoded) => {
        console.log(err);
      if (err) {
        return res.status(401).send({
          message: "Unauthorized!"
        });
      }
      req.user_id = decoded.id;
      req.username = decoded.username;
      req.email = decoded.email;
      req.role_id = decoded.role_id;
      req.role_name = decoded.role_name;
      // console.log(decoded);
      next();
    });
  };

  const authJwt = {
    verifyToken: verifyToken
  };
  module.exports = authJwt;