const express = require('express')
const AuthMiddleware = require('../../middleware/authMiddleware')
const ProjectController = require('../../controllers/projects/projectController')

class ProjectRouter {
  constructor() {
    this.router = express.Router()
    this.initializeRoutes()
  }

  initializeRoutes() {
    this.router.get('/', AuthMiddleware.handle, ProjectController.list)
    this.router.post('/', AuthMiddleware.handle, ProjectController.create)
    this.router.post('/:projectId/task-statuses', AuthMiddleware.handle, ProjectController.addTaskStatus)
  }

  getRouter() {
    return this.router
  }
}

module.exports = new ProjectRouter()
