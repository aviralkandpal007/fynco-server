const TaskModel = require('../../models/tasks/taskModel')
const TaskSessionModel = require('../../models/tasks/taskSessionModel')
const ProjectModel = require('../../models/projects/projectModel')
const ResponseHandler = require('../../util/responseHandler')
const { TASK_PRIORITY, TASK_STATUS, TIMER_PHASE, DEFAULT_TASK_STATUS_OPTIONS } = require('../../constants/taskConstants')

class TaskController {
  constructor() {
    this.create = this.create.bind(this)
    this.list = this.list.bind(this)
    this.update = this.update.bind(this)
    this.saveTimerProgress = this.saveTimerProgress.bind(this)
    this.remove = this.remove.bind(this)
  }

  validPriorityCodes() {
    return Object.values(TASK_PRIORITY)
  }

  validBaseStatusCodes() {
    return Object.values(TASK_STATUS)
  }

  validTimerPhases() {
    return Object.values(TIMER_PHASE)
  }

  normalizeNumber(value, fallback) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  validateEtaMinutes(value) {
    const etaMinutes = this.normalizeNumber(value, NaN)

    if (!Number.isFinite(etaMinutes) || etaMinutes <= 0 || etaMinutes % 25 !== 0) {
      return null
    }

    return etaMinutes
  }

  validateTaskDate(value) {
    if (!value) {
      return null
    }

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return null
    }

    return parsed
  }

  async resolveProject(userId, projectId) {
    if (!projectId) {
      return null
    }

    return ProjectModel.findByIdForOwner(projectId, userId)
  }

  isPastDateTime(dateValue) {
    if (!dateValue) {
      return false
    }
    return dateValue.getTime() < Date.now()
  }

  toTimeSeconds(dateValue) {
    if (!dateValue) {
      return null
    }
    return (dateValue.getHours() * 3600) + (dateValue.getMinutes() * 60) + dateValue.getSeconds()
  }

  async create(req, res) {
    try {
      const userId = req.user && req.user.userId ? req.user.userId : null
      if (!userId) {
        return ResponseHandler.sendUnauthorized(res, 'auth_invalid_user_session')
      }

      const title = req.body && typeof req.body.title === 'string' ? req.body.title.trim() : ''
      const priorityCode = this.normalizeNumber(req.body && req.body.priorityCode, TASK_PRIORITY.MEDIUM)
      const note = req.body && typeof req.body.note === 'string' ? req.body.note.trim() : ''
      const projectId = req.body && req.body.projectId ? req.body.projectId : null
      const statusCode = this.normalizeNumber(req.body && req.body.statusCode, TASK_STATUS.PENDING)
      const etaMinutes = this.validateEtaMinutes(req.body && req.body.etaMinutes)
      const taskDateInput = req.body && (req.body.taskDateTime || req.body.taskDate)
      const taskDate = this.validateTaskDate(taskDateInput)

      if (!title) {
        return ResponseHandler.sendBadRequest(res, 'task_title_required')
      }

      if (!this.validPriorityCodes().includes(priorityCode)) {
        return ResponseHandler.sendBadRequest(res, 'task_invalid_priority')
      }

      if (!etaMinutes) {
        return ResponseHandler.sendBadRequest(res, 'task_eta_invalid')
      }

      if (taskDateInput && !taskDate) {
        return ResponseHandler.sendBadRequest(res, 'task_invalid_datetime')
      }
      if (taskDate && this.isPastDateTime(taskDate)) {
        return ResponseHandler.sendBadRequest(res, 'task_datetime_past')
      }

      const project = await this.resolveProject(userId, projectId)
      if (projectId && !project) {
        return ResponseHandler.sendBadRequest(res, 'task_invalid_project_selection')
      }

      if (project) {
        const allowedCodes = (project.taskStatuses || []).map((item) => item.code)
        if (!allowedCodes.includes(statusCode)) {
          return ResponseHandler.sendBadRequest(res, 'task_invalid_status_for_project')
        }
      } else if (!this.validBaseStatusCodes().includes(statusCode)) {
        return ResponseHandler.sendBadRequest(res, 'task_invalid_status')
      }

      const plannedSessions = Math.max(1, Math.ceil(etaMinutes / 25))
      const etaSeconds = etaMinutes * 60
      const focusSeconds = 25 * 60

      const task = await TaskModel.create({
        ownerId: userId,
        title,
        priorityCode,
        note,
        statusCode,
        projectId,
        taskDate,
        taskTimeSeconds: this.toTimeSeconds(taskDate),
        etaMinutes,
        etaSeconds,
        plannedSessions,
        completedSessions: 0,
        processedSeconds: 0,
        timerPhase: TIMER_PHASE.IDLE,
        timerSecondsRemaining: focusSeconds
      })

      return ResponseHandler.sendCreated(res, { task }, 'task_created')
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

      const [tasks, projects] = await Promise.all([
        TaskModel.listByOwner(userId),
        ProjectModel.listByOwner(userId)
      ])

      return ResponseHandler.sendSuccess(res, {
        tasks,
        projects,
        defaultTaskStatuses: DEFAULT_TASK_STATUS_OPTIONS
      }, 'task_tasks_fetched')
    } catch (_err) {
      return ResponseHandler.sendServerError(res, 'common_server_error')
    }
  }

  async update(req, res) {
    try {
      const userId = req.user && req.user.userId ? req.user.userId : null
      if (!userId) {
        return ResponseHandler.sendUnauthorized(res, 'auth_invalid_user_session')
      }

      const taskId = req.params && req.params.taskId ? req.params.taskId : null
      const existingTask = await TaskModel.findByIdForOwner(taskId, userId)
      if (!existingTask) {
        return ResponseHandler.sendNotFound(res, 'task_not_found')
      }

      const updates = {}

      if (typeof req.body.title === 'string') {
        const title = req.body.title.trim()
        if (!title) {
          return ResponseHandler.sendBadRequest(res, 'task_title_required')
        }
        updates.title = title
      }

      if (typeof req.body.note === 'string') {
        updates.note = req.body.note.trim()
      }

      if (typeof req.body.priorityCode !== 'undefined') {
        const priorityCode = this.normalizeNumber(req.body.priorityCode, NaN)
        if (!this.validPriorityCodes().includes(priorityCode)) {
          return ResponseHandler.sendBadRequest(res, 'task_invalid_priority')
        }
        updates.priorityCode = priorityCode
      }

      if (typeof req.body.etaMinutes !== 'undefined') {
        const etaMinutes = this.validateEtaMinutes(req.body.etaMinutes)
        if (!etaMinutes) {
          return ResponseHandler.sendBadRequest(res, 'task_eta_invalid')
        }

        updates.etaMinutes = etaMinutes
        updates.etaSeconds = etaMinutes * 60
        updates.plannedSessions = Math.max(1, Math.ceil(etaMinutes / 25))
      }

      if (typeof req.body.projectId !== 'undefined') {
        updates.projectId = req.body.projectId || null
      }

      if (typeof req.body.taskDate !== 'undefined' || typeof req.body.taskDateTime !== 'undefined') {
        const taskDateInput = typeof req.body.taskDateTime !== 'undefined' ? req.body.taskDateTime : req.body.taskDate
        const taskDate = this.validateTaskDate(taskDateInput)
        if (taskDateInput && !taskDate) {
          return ResponseHandler.sendBadRequest(res, 'task_invalid_datetime')
        }
        if (taskDate && this.isPastDateTime(taskDate)) {
          return ResponseHandler.sendBadRequest(res, 'task_datetime_past')
        }
        updates.taskDate = taskDate
        updates.taskTimeSeconds = this.toTimeSeconds(taskDate)
      }

      const effectiveProjectId = typeof updates.projectId !== 'undefined' ? updates.projectId : existingTask.projectId
      const project = await this.resolveProject(userId, effectiveProjectId)
      if (effectiveProjectId && !project) {
        return ResponseHandler.sendBadRequest(res, 'task_invalid_project_selection')
      }

      if (typeof req.body.statusCode !== 'undefined') {
        const statusCode = this.normalizeNumber(req.body.statusCode, NaN)

        if (project) {
          const allowedCodes = (project.taskStatuses || []).map((item) => item.code)
          if (!allowedCodes.includes(statusCode)) {
            return ResponseHandler.sendBadRequest(res, 'task_invalid_status_for_project')
          }
        } else if (!this.validBaseStatusCodes().includes(statusCode)) {
          return ResponseHandler.sendBadRequest(res, 'task_invalid_status')
        }

        updates.statusCode = statusCode
      }

      const nextStatusCode = typeof updates.statusCode !== 'undefined' ? updates.statusCode : existingTask.statusCode

      const task = await TaskModel.updateByIdForOwner(taskId, userId, updates)
      return ResponseHandler.sendSuccess(res, { task }, 'task_updated')
    } catch (_err) {
      return ResponseHandler.sendServerError(res, 'common_server_error')
    }
  }

  async saveTimerProgress(req, res) {
    try {
      const userId = req.user && req.user.userId ? req.user.userId : null
      if (!userId) {
        return ResponseHandler.sendUnauthorized(res, 'auth_invalid_user_session')
      }

      const taskId = req.params && req.params.taskId ? req.params.taskId : null
      const existingTask = await TaskModel.findByIdForOwner(taskId, userId)
      if (!existingTask) {
        return ResponseHandler.sendNotFound(res, 'task_not_found')
      }

      const completedSessions = this.normalizeNumber(req.body && req.body.completedSessions, existingTask.completedSessions)
      const timerPhase = this.normalizeNumber(req.body && req.body.timerPhase, existingTask.timerPhase)
      const timerSecondsRemaining = this.normalizeNumber(req.body && req.body.timerSecondsRemaining, existingTask.timerSecondsRemaining)
      const processedSeconds = this.normalizeNumber(req.body && req.body.processedSeconds, existingTask.processedSeconds || 0)
      const statusCode = typeof req.body.statusCode !== 'undefined'
        ? this.normalizeNumber(req.body.statusCode, existingTask.statusCode)
        : existingTask.statusCode

      if (!this.validTimerPhases().includes(timerPhase)) {
        return ResponseHandler.sendBadRequest(res, 'task_invalid_timer_phase')
      }

      if (!this.validBaseStatusCodes().includes(statusCode)) {
        return ResponseHandler.sendBadRequest(res, 'task_invalid_status')
      }

      if (completedSessions < 0) {
        return ResponseHandler.sendBadRequest(res, 'task_invalid_completed_sessions')
      }
      if (processedSeconds < 0) {
        return ResponseHandler.sendBadRequest(res, 'task_invalid_processed_seconds')
      }

      const etaSeconds = existingTask.etaSeconds || ((existingTask.etaMinutes || 25) * 60)
      const safeProcessedSeconds = Math.min(processedSeconds, etaSeconds)
      const existingTotalSeconds = existingTask.processedSeconds || 0
      const actualProcessedSeconds = processedSeconds
      const deltaSeconds = Math.max(0, actualProcessedSeconds - existingTotalSeconds)
      const now = new Date()
      const dateKey = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0')
      ].join('-')

      const shouldIncrementRun = existingTask.timerPhase !== TIMER_PHASE.FOCUS && timerPhase === TIMER_PHASE.FOCUS
      await TaskSessionModel.upsertSession({
        ownerId: userId,
        taskId: taskId,
        date: dateKey,
        seconds: deltaSeconds,
        runs: shouldIncrementRun ? 1 : 0
      })

      const task = await TaskModel.updateTimerProgress(taskId, userId, {
        completedSessions,
        processedSeconds: safeProcessedSeconds,
        timerPhase,
        timerSecondsRemaining,
        statusCode
      })

      return ResponseHandler.sendSuccess(res, { task }, 'task_timer_progress_saved')
    } catch (_err) {
      return ResponseHandler.sendServerError(res, 'common_server_error')
    }
  }

  async remove(req, res) {
    try {
      const userId = req.user && req.user.userId ? req.user.userId : null
      if (!userId) {
        return ResponseHandler.sendUnauthorized(res, 'auth_invalid_user_session')
      }

      const taskId = req.params && req.params.taskId ? req.params.taskId : null
      const deleted = await TaskModel.deleteByIdForOwner(taskId, userId)

      if (!deleted || deleted.deletedCount === 0) {
        return ResponseHandler.sendNotFound(res, 'task_not_found')
      }

      return ResponseHandler.sendSuccess(res, null, 'task_deleted')
    } catch (_err) {
      return ResponseHandler.sendServerError(res, 'common_server_error')
    }
  }

  async listSessionSummary(req, res) {
    try {
      const userId = req.user && req.user.userId ? req.user.userId : null
      if (!userId) {
        return ResponseHandler.sendUnauthorized(res, 'auth_invalid_user_session')
      }

      const startDate = req.query && req.query.start ? String(req.query.start) : null
      const endDate = req.query && req.query.end ? String(req.query.end) : null

      const sessions = await TaskSessionModel.listDailyTotals({
        ownerId: userId,
        startDate,
        endDate
      })

      return ResponseHandler.sendSuccess(res, { sessions }, 'task_sessions_fetched')
    } catch (_err) {
      return ResponseHandler.sendServerError(res, 'common_server_error')
    }
  }
}

module.exports = new TaskController()
