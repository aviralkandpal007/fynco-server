const express = require('express')
const authRoutes = require('./auth/authRoutes')
const taskRoutes = require('./tasks/taskRoutes')
const projectRoutes = require('./projects/projectRoutes')
const ResponseHandler = require('../util/responseHandler')

class AppRouter {
  constructor() {
    this.router = express.Router()
    this.initializeRoutes()
  }

  initializeRoutes() {
    this.router.use('/auth',  authRoutes.getRouter())
    this.router.use('/tasks', taskRoutes.getRouter())
    this.router.use('/projects', projectRoutes.getRouter())

    this.router.use((req, res) => {
      ResponseHandler.sendNotFound(res, 'route_not_found')
    })
  }

  getRouter() {
    return this.router
  }
}

module.exports = new AppRouter()
