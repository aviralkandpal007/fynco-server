const { ObjectId } = require('mongodb')
const MongoService = require('../../services/mongo')

class TaskSessionModel {
  constructor() {
    this.collectionName = 'task_sessions'
    this.collection = this.collection.bind(this)
    this.toObjectId = this.toObjectId.bind(this)
    this.upsertSession = this.upsertSession.bind(this)
    this.listDailyTotals = this.listDailyTotals.bind(this)
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

  async upsertSession({ ownerId, taskId, date, seconds = 0, runs = 0 }) {
    const now = new Date()
    await this.collection().updateOne(
      {
        ownerId: this.toObjectId(ownerId),
        taskId: this.toObjectId(taskId),
        date
      },
      {
        $inc: {
          seconds: Math.max(0, seconds),
          runs: Math.max(0, runs)
        },
        $set: {
          updatedAt: now
        },
        $setOnInsert: {
          ownerId: this.toObjectId(ownerId),
          taskId: this.toObjectId(taskId),
          date,
          createdAt: now
        }
      },
      { upsert: true }
    )
  }

  async listDailyTotals({ ownerId, startDate, endDate }) {
    const match = {
      ownerId: this.toObjectId(ownerId)
    }

    if (startDate || endDate) {
      match.date = {}
      if (startDate) match.date.$gte = startDate
      if (endDate) match.date.$lte = endDate
    }

    return this.collection()
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: '$date',
            seconds: { $sum: '$seconds' },
            runs: { $sum: '$runs' }
          }
        },
        { $project: { _id: 0, date: '$_id', seconds: 1, runs: 1 } },
        { $sort: { date: 1 } }
      ])
      .toArray()
  }
}

module.exports = new TaskSessionModel()
