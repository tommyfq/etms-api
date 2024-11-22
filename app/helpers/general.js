const xlsx = require('xlsx');

function validateHeaders(sheet, requiredColumns) {
    // Get the headers from the first row of the sheet
    const headers = xlsx.utils.sheet_to_json(sheet, { header: 1 })[0]; // Header: 1 reads the first row
  
    // Compare file headers with required headers
    const missingHeaders = requiredColumns.filter(
      requiredColumn => !headers.includes(requiredColumn)
    );
  
    if (missingHeaders.length > 0) {
      return {
        isValid: false,
        missingHeaders,
      };
    }
  
    return { isValid: true };
  }

module.exports = {
    validateHeaders
}