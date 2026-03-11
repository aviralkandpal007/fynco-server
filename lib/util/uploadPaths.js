const path = require('path')

function getUploadsDir() {
  const base = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'public', 'uploads')
  return path.resolve(base)
}

function getProfileUploadDir() {
  return path.join(getUploadsDir(), 'profiles')
}

module.exports = {
  getUploadsDir,
  getProfileUploadDir
}
