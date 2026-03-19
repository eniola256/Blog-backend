import multer from 'multer';
import path from 'path';

// Use MEMORY storage - NOT disk storage
const storage = multer.memoryStorage();

// File filter - only allow images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};


const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 5 * 1024 * 1024,        // 5MB file size limit
    fieldSize: 25 * 1024 * 1024       // ADD THIS - 25MB field value limit for long content
  },
  fileFilter: fileFilter
});

export default upload;