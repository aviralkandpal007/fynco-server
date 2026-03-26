const express = require('express')
const AuthMiddleware = require('../../middleware/authMiddleware')
const TaskController = require('../../controllers/tasks/taskController')

class TaskRouter {
  constructor() {
    this.router = express.Router()
    this.initializeRoutes()
  }

  initializeRoutes() {
    this.router.get('/', AuthMiddleware.handle, TaskController.list)
    this.router.get('/sessions/summary', AuthMiddleware.handle, TaskController.listSessionSummary)
    this.router.post('/', AuthMiddleware.handle, TaskController.create)
    this.router.patch('/:taskId', AuthMiddleware.handle, TaskController.update)
    this.router.patch('/:taskId/timer-progress', AuthMiddleware.handle, TaskController.saveTimerProgress)
    this.router.delete('/:taskId', AuthMiddleware.handle, TaskController.remove)
  }

  getRouter() {
    return this.router
  }
}

module.exports = new TaskRouter()
