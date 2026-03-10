const { ObjectId } = require('mongodb')
const MongoService = require('../../services/mongo')
const { TASK_STATUS, TIMER_PHASE } = require('../../constants/taskConstants')

class TaskModel {
  constructor() {
    this.collectionName = 'tasks'
    this.collection = this.collection.bind(this)
    this.toObjectId = this.toObjectId.bind(this)
    this.create = this.create.bind(this)
    this.findByIdForOwner = this.findByIdForOwner.bind(this)
    this.listByOwner = this.listByOwner.bind(this)
    this.updateByIdForOwner = this.updateByIdForOwner.bind(this)
    this.deleteByIdForOwner = this.deleteByIdForOwner.bind(this)
    this.updateTimerProgress = this.updateTimerProgress.bind(this)
    this.countByOwner = this.countByOwner.bind(this)
    this.countCompletedByOwner = this.countCompletedByOwner.bind(this)
    this.countByOwnerAndStatus = this.countByOwnerAndStatus.bind(this)
  }

  collection() {
    const db = MongoService.getDb()
    if (!db) {
      throw new Error('Mongo connection not initialized')
    }
    return db.collection(this.collectionName)
  }

  toObjectId(id) {
    if (typeof id === 'string' && ObjectId.isValid(id)) {
      return new ObjectId(id)
    }
    return id
  }

  async create(payload) {
    const ownerId = this.toObjectId(payload.ownerId)
    const projectId = payload.projectId ? this.toObjectId(payload.projectId) : null
    const now = new Date()

    const task = {
      ownerId,
      title: payload.title,
      priorityCode: payload.priorityCode,
      note: payload.note || '',
      statusCode: payload.statusCode,
      projectId,
      taskDate: payload.taskDate || null,
      scheduledAt: payload.scheduledAt || null,
      taskTimeSeconds: typeof payload.taskTimeSeconds === 'number' ? payload.taskTimeSeconds : null,
      etaMinutes: payload.etaMinutes,
      etaSeconds: payload.etaSeconds,
      plannedSessions: payload.plannedSessions,
      completedSessions: payload.completedSessions || 0,
      processedSeconds: payload.processedSeconds || 0,
      timerPhase: typeof payload.timerPhase === 'number' ? payload.timerPhase : TIMER_PHASE.IDLE,
      timerSecondsRemaining: typeof payload.timerSecondsRemaining === 'number' ? payload.timerSecondsRemaining : 0,
      createdAt: now,
      updatedAt: now
    }

    const result = await this.collection().insertOne(task)
    return { ...task, _id: result.insertedId }
  }

  async findByIdForOwner(taskId, ownerId) {
    return this.collection().findOne({
      _id: this.toObjectId(taskId),
      ownerId: this.toObjectId(ownerId)
    })
  }

  async listByOwner(ownerId) {
    return this.collection()
      .find({ ownerId: this.toObjectId(ownerId) })
      .sort({ createdAt: -1 })
      .toArray()
  }

  async updateByIdForOwner(taskId, ownerId, updates) {
    const payload = { updatedAt: new Date() }

    if (typeof updates.title === 'string') payload.title = updates.title
    if (typeof updates.priorityCode === 'number') payload.priorityCode = updates.priorityCode
    if (typeof updates.note === 'string') payload.note = updates.note
    if (typeof updates.statusCode === 'number') payload.statusCode = updates.statusCode
    if (typeof updates.projectId !== 'undefined') {
      payload.projectId = updates.projectId ? this.toObjectId(updates.projectId) : null
    }
    if (typeof updates.taskDate !== 'undefined') payload.taskDate = updates.taskDate || null
    if (typeof updates.scheduledAt !== 'undefined') payload.scheduledAt = updates.scheduledAt || null
    if (typeof updates.taskTimeSeconds !== 'undefined') payload.taskTimeSeconds = updates.taskTimeSeconds
    if (typeof updates.etaMinutes === 'number') payload.etaMinutes = updates.etaMinutes
    if (typeof updates.etaSeconds === 'number') payload.etaSeconds = updates.etaSeconds
    if (typeof updates.plannedSessions === 'number') payload.plannedSessions = updates.plannedSessions
    if (typeof updates.completedSessions === 'number') payload.completedSessions = updates.completedSessions
    if (typeof updates.processedSeconds === 'number') payload.processedSeconds = updates.processedSeconds
    if (typeof updates.timerPhase === 'number') payload.timerPhase = updates.timerPhase
    if (typeof updates.timerSecondsRemaining === 'number') payload.timerSecondsRemaining = updates.timerSecondsRemaining

    await this.collection().updateOne(
      {
        _id: this.toObjectId(taskId),
        ownerId: this.toObjectId(ownerId)
      },
      { $set: payload }
    )

    return this.findByIdForOwner(taskId, ownerId)
  }

  async deleteByIdForOwner(taskId, ownerId) {
    return this.collection().deleteOne({
      _id: this.toObjectId(taskId),
      ownerId: this.toObjectId(ownerId)
    })
  }

  async updateTimerProgress(taskId, ownerId, progress) {
    const payload = {
      updatedAt: new Date()
    }

    if (typeof progress.completedSessions === 'number') payload.completedSessions = progress.completedSessions
    if (typeof progress.processedSeconds === 'number') payload.processedSeconds = progress.processedSeconds
    if (typeof progress.timerPhase === 'number') payload.timerPhase = progress.timerPhase
    if (typeof progress.timerSecondsRemaining === 'number') payload.timerSecondsRemaining = progress.timerSecondsRemaining
    if (typeof progress.statusCode === 'number') payload.statusCode = progress.statusCode

    await this.collection().updateOne(
      {
        _id: this.toObjectId(taskId),
        ownerId: this.toObjectId(ownerId)
      },
      { $set: payload }
    )

    return this.findByIdForOwner(taskId, ownerId)
  }

  async countByOwner(ownerId) {
    return this.collection().countDocuments({ ownerId: this.toObjectId(ownerId) })
  }

  async countCompletedByOwner(ownerId) {
    return this.collection().countDocuments({
      ownerId: this.toObjectId(ownerId),
      statusCode: TASK_STATUS.COMPLETED
    })
  }

  async countByOwnerAndStatus(ownerId, statusCode) {
    return this.collection().countDocuments({
      ownerId: this.toObjectId(ownerId),
      statusCode
    })
  }
}

module.exports = new TaskModel()
