const express = require('express')
const AuthController = require('../../controllers/auth/authController')
const AuthMiddleware = require('../../middleware/authMiddleware')
const profileUpload = require('../../middleware/profileUploadMiddleware')

class AuthRouter {
  constructor() {
    this.router = express.Router()
    this.initializeRoutes()
  }

  initializeRoutes() {
    this.router.post('/signup', AuthController.signup)
    this.router.post('/login', AuthController.login)
    this.router.post('/social', AuthController.socialLogin)
    this.router.post('/refresh', AuthController.refresh)
    this.router.post('/logout', AuthMiddleware.handle, AuthController.logout)
    this.router.get('/me', AuthMiddleware.handle, AuthController.me)
    this.router.put('/profile', AuthMiddleware.handle, AuthController.updateProfile)
    this.router.post('/profile/picture', AuthMiddleware.handle, profileUpload.single('picture'), AuthController.uploadProfilePicture)
  }

  getRouter() {
    return this.router
  }
}

module.exports = new AuthRouter()
