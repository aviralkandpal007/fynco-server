const { MongoClient } = require('mongodb')

class MongoService {
  constructor() {
    this.client = null
    this.db = null
    this.connect = this.connect.bind(this)
    this.getDb = this.getDb.bind(this)
    this.ensureIndexes = this.ensureIndexes.bind(this)
    this.close = this.close.bind(this)
  }

  async connect(options) {
    const config = options || {}
    const uri = config.uri || process.env.MONGO_URI
    const dbName = config.dbName || process.env.MONGO_DB_NAME

    if (!uri || !dbName) {
      throw new Error('Missing Mongo configuration')
    }

    if (this.db) {
      return this.db
    }

    this.client = new MongoClient(uri)
    await this.client.connect()
    this.db = this.client.db(dbName)
    return this.db
  }

  getDb() {
    return this.db
  }

  async ensureIndexes() {
    return null
  }

  async close() {
    if (this.client) {
      await this.client.close()
    }

    this.client = null
    this.db = null
  }
}

module.exports = new MongoService()
