const jwt = require("jsonwebtoken");
const config = require("../../config/app.config");

verifyToken = (req, res, next) => {
    let token = req.headers['authorization'];
    console.log(token);
    token = token.replace("Bearer ","");
  
    if (!token) {
      return res.status(403).send({
        message: "No token provided!"
      });
    }
  
    jwt.verify(token, config.secret, (err, decoded) => {
        console.log(err);
      if (err) {
        return res.status(401).send({
          message: "Unauthorized!"
        });
      }
      req.user_id = decoded.id;
      req.role_name = decoded.role_name;
      req.email = decoded.email;
      req.role_id = decoded.role_id;
      // console.log(decoded);
      next();
    });
  };

  const authJwt = {
    verifyToken: verifyToken
  };
  module.exports = authJwt;