const { ObjectId } = require('mongodb')
const MongoService = require('../../services/mongo')

class UserModel {
  constructor() {
    this.collectionName = 'users'
    this.collection = this.collection.bind(this)
    this.findByEmail = this.findByEmail.bind(this)
    this.findByProvider = this.findByProvider.bind(this)
    this.findById = this.findById.bind(this)
    this.findByUsername = this.findByUsername.bind(this)
    this.createLocalUser = this.createLocalUser.bind(this)
    this.createSocialUser = this.createSocialUser.bind(this)
    this.updateLastLogin = this.updateLastLogin.bind(this)
    this.addRefreshToken = this.addRefreshToken.bind(this)
    this.replaceRefreshToken = this.replaceRefreshToken.bind(this)
    this.findByRefreshToken = this.findByRefreshToken.bind(this)
    this.removeRefreshToken = this.removeRefreshToken.bind(this)
    this.updateProfile = this.updateProfile.bind(this)
    this.verifyEmail = this.verifyEmail.bind(this)
    this.updatePassword = this.updatePassword.bind(this)
  }

  collection() {
    const db = MongoService.getDb()
    if (!db) {
      throw new Error('Mongo connection not initialized')
    }
    return db.collection(this.collectionName)
  }

  async findByEmail(email) {
    return this.collection().findOne({ email: email })
  }

  async findByProvider(provider, providerId) {
    return this.collection().findOne({
      authProviders: { $elemMatch: { provider: provider, providerId: providerId } }
    })
  }

  async findById(userId) {
    const filterUserId = typeof userId === 'string' && ObjectId.isValid(userId) ? new ObjectId(userId) : userId
    return this.collection().findOne({ _id: filterUserId })
  }

  async findByUsername(username) {
    return this.collection().findOne({ username: username })
  }

  async createLocalUser(payload) {
    const now = new Date()
    const user = {
      email: payload.email,
      name: payload.name || null,
      username: payload.username || null,
      avatarUrl: payload.avatarUrl || null,
      bio: payload.bio || '',
      statusMessage: payload.statusMessage || 'Focused',
      language: payload.language || null,
      isEmailVerified: Boolean(payload.isEmailVerified),
      emailVerifiedAt: payload.emailVerifiedAt || null,
      passwordHash: payload.passwordHash,
      authProviders: [],
      refreshTokens: [],
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null
    }

    const result = await this.collection().insertOne(user)
    return { ...user, _id: result.insertedId }
  }

  async createSocialUser(payload) {
    const now = new Date()
    const user = {
      email: payload.email || null,
      name: payload.name || null,
      username: payload.username || null,
      avatarUrl: payload.avatarUrl || null,
      bio: payload.bio || '',
      statusMessage: payload.statusMessage || 'Focused',
      language: payload.language || null,
      isEmailVerified: true,
      emailVerifiedAt: now,
      passwordHash: null,
      authProviders: [
        {
          provider: payload.provider,
          providerId: payload.providerId,
          email: payload.email || null,
          displayName: payload.displayName || null,
          avatarUrl: payload.avatarUrl || null,
          createdAt: now
        }
      ],
      refreshTokens: [],
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null
    }

    const result = await this.collection().insertOne(user)
    return { ...user, _id: result.insertedId }
  }

  async updateLastLogin(userId) {
    await this.collection().updateOne(
      { _id: userId },
      { $set: { lastLoginAt: new Date(), updatedAt: new Date() } }
    )
  }

  async addRefreshToken(userId, token, expiresAt) {
    await this.collection().updateOne(
      { _id: userId },
      {
        $push: { refreshTokens: { token: token, createdAt: new Date(), expiresAt: expiresAt } },
        $set: { updatedAt: new Date() }
      }
    )
  }

  async replaceRefreshToken(userId, oldToken, newToken, expiresAt) {
    await this.collection().updateOne(
      { _id: userId },
      { $pull: { refreshTokens: { token: oldToken } } }
    )

    await this.collection().updateOne(
      { _id: userId },
      {
        $push: { refreshTokens: { token: newToken, createdAt: new Date(), expiresAt: expiresAt } },
        $set: { updatedAt: new Date() }
      }
    )
  }

  async findByRefreshToken(token) {
    return this.collection().findOne({ 'refreshTokens.token': token })
  }

  async removeRefreshToken(userId, token) {
    const filterUserId = typeof userId === 'string' && ObjectId.isValid(userId) ? new ObjectId(userId) : userId

    await this.collection().updateOne(
      { _id: filterUserId },
      {
        $pull: { refreshTokens: { token: token } },
        $set: { updatedAt: new Date() }
      }
    )
  }

  async updateProfile(userId, updates) {
    const filterUserId = typeof userId === 'string' && ObjectId.isValid(userId) ? new ObjectId(userId) : userId
    const payload = {
      updatedAt: new Date()
    }

    if (typeof updates.name === 'string') {
      payload.name = updates.name
    }
    if (typeof updates.username === 'string') {
      payload.username = updates.username
    }
    if (typeof updates.avatarUrl === 'string') {
      payload.avatarUrl = updates.avatarUrl
    }
    if (typeof updates.bio === 'string') {
      payload.bio = updates.bio
    }
    if (typeof updates.statusMessage === 'string') {
      payload.statusMessage = updates.statusMessage
    }
    if (typeof updates.language === 'string') {
      payload.language = updates.language
    }

    await this.collection().updateOne(
      { _id: filterUserId },
      { $set: payload }
    )

    return this.findById(filterUserId)
  }

  async verifyEmail(userId) {
    const filterUserId = typeof userId === 'string' && ObjectId.isValid(userId) ? new ObjectId(userId) : userId
    await this.collection().updateOne(
      { _id: filterUserId },
      { $set: { isEmailVerified: true, emailVerifiedAt: new Date(), updatedAt: new Date() } }
    )
    return this.findById(filterUserId)
  }

  async updatePassword(userId, passwordHash) {
    const filterUserId = typeof userId === 'string' && ObjectId.isValid(userId) ? new ObjectId(userId) : userId
    await this.collection().updateOne(
      { _id: filterUserId },
      { $set: { passwordHash: passwordHash, updatedAt: new Date() } }
    )
    return this.findById(filterUserId)
  }
}

module.exports = new UserModel()
