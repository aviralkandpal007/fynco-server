const { ObjectId } = require('mongodb')
const MongoService = require('../../services/mongo')

class OtpModel {
  constructor() {
    this.collectionName = 'otp_verifications'
    this._indexesReady = false
    this.collection = this.collection.bind(this)
    this.ensureIndexes = this.ensureIndexes.bind(this)
    this.createForUser = this.createForUser.bind(this)
    this.findValid = this.findValid.bind(this)
    this.deleteByUser = this.deleteByUser.bind(this)
  }

  collection() {
    const db = MongoService.getDb()
    if (!db) {
      throw new Error('Mongo connection not initialized')
    }
    return db.collection(this.collectionName)
  }

  async ensureIndexes() {
    if (this._indexesReady) {
      return
    }

    await this.collection().createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
    await this.collection().createIndex({ userId: 1 })
    this._indexesReady = true
  }

  async createForUser(userId, otpHash, expiresAt, purpose) {
    await this.ensureIndexes()
    const ownerId = typeof userId === 'string' && ObjectId.isValid(userId) ? new ObjectId(userId) : userId
    const filter = { userId: ownerId }
    if (purpose) {
      filter.purpose = purpose
    }
    await this.collection().deleteMany(filter)
    const doc = {
      userId: ownerId,
      purpose: purpose || 'signup',
      otpHash,
      expiresAt,
      createdAt: new Date()
    }
    const result = await this.collection().insertOne(doc)
    return { ...doc, _id: result.insertedId }
  }

  async findValid(userId, otpHash, purpose) {
    await this.ensureIndexes()
    const ownerId = typeof userId === 'string' && ObjectId.isValid(userId) ? new ObjectId(userId) : userId
    const filter = {
      userId: ownerId,
      otpHash,
      expiresAt: { $gt: new Date() }
    }
    if (purpose) {
      filter.purpose = purpose
    }
    return this.collection().findOne(filter)
  }

  async deleteByUser(userId, purpose) {
    const ownerId = typeof userId === 'string' && ObjectId.isValid(userId) ? new ObjectId(userId) : userId
    const filter = { userId: ownerId }
    if (purpose) {
      filter.purpose = purpose
    }
    await this.collection().deleteMany(filter)
  }
}

module.exports = new OtpModel()
