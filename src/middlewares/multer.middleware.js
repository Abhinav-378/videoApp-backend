import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join('public', 'temp')) // Use relative path
  },
    filename: function (req, file, cb) {
        //   cb(null, file.originalname)
        // -> file is stored on your server for a very short amount of time but might still contains threats like multiple users uploading the same file name, etc.

        // So here we use a custom file name with a timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        // cb(null, file.originalname + '-' + uniqueSuffix )
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))

    }
  })
  
export const upload = multer({ storage: storage })