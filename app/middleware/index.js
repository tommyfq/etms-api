const authJwt = require("./auth");
// const verifySignUp = require("./verifySignUp");
const {uploadExcel, uploadImages, storeImages} = require("./upload");

module.exports = {
  authJwt,
//   verifySignUp,
  uploadExcel,
  uploadImages,
  storeImages
};