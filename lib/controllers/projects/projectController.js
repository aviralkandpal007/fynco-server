const ProjectModel = require('../../models/projects/projectModel')
const ResponseHandler = require('../../util/responseHandler')
const { PROJECT_STATUS } = require('../../constants/projectConstants')
const { DEFAULT_TASK_STATUS_OPTIONS } = require('../../constants/taskConstants')

class ProjectController {
  constructor() {
    this.create = this.create.bind(this)
    this.list = this.list.bind(this)
    this.addTaskStatus = this.addTaskStatus.bind(this)
  }

  normalizeNumber(value, fallback) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  parseDeadline(value) {
    if (!value) {
      return null
    }
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return null
    }
    parsed.setHours(0, 0, 0, 0)
    return parsed
  }

  async create(req, res) {
    try {
      const userId = req.user && req.user.userId ? req.user.userId : null
      if (!userId) {
        return ResponseHandler.sendUnauthorized(res, 'auth_invalid_user_session')
      }

      const name = req.body && typeof req.body.name === 'string' ? req.body.name.trim() : ''
      const deadline = req.body && typeof req.body.deadline === 'string' ? req.body.deadline : null
      const parsedDeadline = this.parseDeadline(deadline)
      const description = req.body && typeof req.body.description === 'string' ? req.body.description.trim() : ''
      const statusCode = this.normalizeNumber(req.body && req.body.statusCode, PROJECT_STATUS.ACTIVE)
      const color = this.normalizeNumber(req.body && req.body.color, 0)
      const customTaskStatuses = Array.isArray(req.body && req.body.customTaskStatuses) ? req.body.customTaskStatuses : []

      if (!name) {
        return ResponseHandler.sendBadRequest(res, 'project_name_required')
      }

      if (!Object.values(PROJECT_STATUS).includes(statusCode)) {
        return ResponseHandler.sendBadRequest(res, 'project_invalid_status')
      }
      if (deadline && !parsedDeadline) {
        return ResponseHandler.sendBadRequest(res, 'project_invalid_deadline')
      }
      if (parsedDeadline) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (parsedDeadline.getTime() < today.getTime()) {
          return ResponseHandler.sendBadRequest(res, 'project_deadline_past')
        }
      }

      const sanitizedCustomStatuses = customTaskStatuses
        .filter((item) => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 12)

      const existingLabels = new Set(DEFAULT_TASK_STATUS_OPTIONS.map((item) => item.label.toLowerCase()))
      const extraTaskStatuses = []
      let nextCode = DEFAULT_TASK_STATUS_OPTIONS.reduce((max, item) => (item.code > max ? item.code : max), 0) + 1

      for (const label of sanitizedCustomStatuses) {
        const normalized = label.toLowerCase()
        if (existingLabels.has(normalized)) {
          continue
        }

        existingLabels.add(normalized)
        extraTaskStatuses.push({ code: nextCode, label })
        nextCode += 1
      }

      const project = await ProjectModel.create({
        ownerId: userId,
        name,
        deadline,
        description,
        statusCode,
        taskStatuses: [...DEFAULT_TASK_STATUS_OPTIONS, ...extraTaskStatuses],
        color
      })

      return ResponseHandler.sendCreated(res, { project }, 'project_created')
    } catch (_err) {
      return ResponseHandler.sendServerError(res, 'common_server_error')
    }
  }

  async list(req, res) {
    try {
      const userId = req.user && req.user.userId ? req.user.userId : null
      if (!userId) {
        return ResponseHandler.sendUnauthorized(res, 'auth_invalid_user_session')
      }

      const projects = await ProjectModel.listByOwner(userId)
      return ResponseHandler.sendSuccess(res, { projects }, 'project_projects_fetched')
    } catch (_err) {
      return ResponseHandler.sendServerError(res, 'common_server_error')
    }
  }

  async addTaskStatus(req, res) {
    try {
      const userId = req.user && req.user.userId ? req.user.userId : null
      if (!userId) {
        return ResponseHandler.sendUnauthorized(res, 'auth_invalid_user_session')
      }

      const projectId = req.params && req.params.projectId ? req.params.projectId : null
      const label = req.body && typeof req.body.label === 'string' ? req.body.label.trim() : ''

      if (!label) {
        return ResponseHandler.sendBadRequest(res, 'project_status_label_required')
      }

      const project = await ProjectModel.findByIdForOwner(projectId, userId)
      if (!project) {
        return ResponseHandler.sendNotFound(res, 'project_not_found')
      }

      const statusExists = (project.taskStatuses || []).some((item) => item.label.toLowerCase() === label.toLowerCase())
      if (statusExists) {
        return ResponseHandler.sendConflict(res, 'project_status_exists')
      }

      const maxCode = (project.taskStatuses || []).reduce((max, item) => (item.code > max ? item.code : max), 2)
      const statusOption = {
        code: maxCode + 1,
        label
      }

      const updatedProject = await ProjectModel.addTaskStatus(projectId, userId, statusOption)
      return ResponseHandler.sendSuccess(res, { project: updatedProject }, 'project_status_added')
    } catch (_err) {
      return ResponseHandler.sendServerError(res, 'common_server_error')
    }
  }
}

module.exports = new ProjectController()
