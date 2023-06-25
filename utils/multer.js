const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: './public/images',
    filename: function (req, file, cb) {
      cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
  });
  
  const upload = multer({
    storage: storage,
    limits: {
      fileSize: 1024 * 1024 * 5 // Set the maximum file size
    },
    fileFilter: function(req, file, done) {
      // Set the allowed file types
      if (file.mimetype === "image/jpeg" || file.mimetype === "image/png" || file.mimetype === "image/jpg") {
        done(null, true);
      } else {
        // Prevent the upload
        var newError = new Error("File type is incorrect");
        newError.name = "MulterError";
        console.log(newError)
        done(newError, false);
      }
    },
    onError: function(err, next) {
      console.log('Error uploading file:', err);
      next(err);
    }
  });
  
module.exports = upload;