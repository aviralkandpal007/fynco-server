const fs = require('fs')
const path = require('path')
const multer = require('multer')

const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'profiles')
fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDir)
  },
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname || '').toLowerCase() || '.jpg'
    const userId = req.user && req.user.userId ? req.user.userId : 'user'
    callback(null, `${userId}_${Date.now()}${extension}`)
  }
})

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
