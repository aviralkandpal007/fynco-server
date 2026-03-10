const { ObjectId } = require('mongodb')
const MongoService = require('../../services/mongo')
const { PROJECT_STATUS } = require('../../constants/projectConstants')
const { DEFAULT_TASK_STATUS_OPTIONS } = require('../../constants/taskConstants')

class ProjectModel {
  constructor() {
    this.collectionName = 'projects'
    this.collection = this.collection.bind(this)
    this.toObjectId = this.toObjectId.bind(this)
    this.create = this.create.bind(this)
    this.findByIdForOwner = this.findByIdForOwner.bind(this)
    this.listByOwner = this.listByOwner.bind(this)
    this.addTaskStatus = this.addTaskStatus.bind(this)
    this.countByOwner = this.countByOwner.bind(this)
    this.countActiveByOwner = this.countActiveByOwner.bind(this)
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
    const now = new Date()

    const project = {
      ownerId,
      name: payload.name,
      deadline: payload.deadline || null,
      description: payload.description || '',
      statusCode: typeof payload.statusCode === 'number' ? payload.statusCode : PROJECT_STATUS.ACTIVE,
      taskStatuses: payload.taskStatuses || DEFAULT_TASK_STATUS_OPTIONS,
      createdAt: now,
      updatedAt: now
    }

    const result = await this.collection().insertOne(project)
    return { ...project, _id: result.insertedId }
  }

  async findByIdForOwner(projectId, ownerId) {
    return this.collection().findOne({
      _id: this.toObjectId(projectId),
      ownerId: this.toObjectId(ownerId)
    })
  }

  async listByOwner(ownerId) {
    return this.collection()
      .find({ ownerId: this.toObjectId(ownerId) })
      .sort({ createdAt: -1 })
      .toArray()
  }

  async addTaskStatus(projectId, ownerId, statusOption) {
    await this.collection().updateOne(
      {
        _id: this.toObjectId(projectId),
        ownerId: this.toObjectId(ownerId)
      },
      {
        $push: { taskStatuses: statusOption },
        $set: { updatedAt: new Date() }
      }
    )

    return this.findByIdForOwner(projectId, ownerId)
  }

  async countByOwner(ownerId) {
    return this.collection().countDocuments({ ownerId: this.toObjectId(ownerId) })
  }

  async countActiveByOwner(ownerId) {
    return this.collection().countDocuments({
      ownerId: this.toObjectId(ownerId),
      statusCode: PROJECT_STATUS.ACTIVE
    })
  }
}

module.exports = new ProjectModel()
