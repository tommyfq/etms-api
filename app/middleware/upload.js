const fs = require("fs");
const path = require('path');
const multer = require("multer");

// File filter for Excel files
const excelFilter = (req, file, cb) => {
  if (
    file.mimetype.includes("excel") ||
    file.mimetype.includes("spreadsheetml")
  ) {
    cb(null, true); // Accept Excel files
  } else {
    cb(new Error("Please upload only Excel files."), false); // Reject
  }
};

// File filter for images
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true); // Accept images
  } else {
    cb(new Error("Please upload only image files."), false); // Reject
  }
};

// Storage configuration
const excelStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, __basedir + "/uploads/excel/"); // Directory for Excel files
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-excel-${file.originalname}`); // Custom filename
  },
});

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, __basedir + "/uploads/images/"); // Directory for images
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-image-${file.originalname}`); // Custom filename
  },
});

const publicImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log(req.ticketNo);
    const ticketFolder = path.join(
      __basedir,
      "/public/uploads", 
      `ticket_${req.ticketNo}`
    );

    fs.mkdirSync(ticketFolder, { recursive: true }); // Create the directory if it doesn't exist
    cb(null, ticketFolder);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-image-${file.originalname}`);
  },
});

// Initialize multer for both file types
const uploadExcel = multer({ storage: excelStorage, fileFilter: excelFilter });
const uploadImages = multer({ storage: imageStorage, fileFilter: imageFilter });
const storeImages = multer({
  storage: publicImageStorage,
  limits: { files: 10 },
}).array("images", 10);

// Export the upload middleware
module.exports = { uploadExcel, uploadImages, storeImages };