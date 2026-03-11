const multer = require('multer')

const storage = multer.memoryStorage()

const fileFilter = (_req, file, callback) => {
  if (file.mimetype && file.mimetype.startsWith('image/')) {
    callback(null, true)
    return
  }

  callback(new Error('Only image uploads are allowed'))
}

const profileUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
})

module.exports = profileUpload
