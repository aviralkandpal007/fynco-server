const UserModel = require('../../models/users/userModel')
const TaskModel = require('../../models/tasks/taskModel')
const ProjectModel = require('../../models/projects/projectModel')
const PasswordService = require('../../services/passwordService')
const JwtService = require('../../services/jwtService')
const ResponseHandler = require('../../util/responseHandler')

class AuthController {
  constructor() {
    this.signup = this.signup.bind(this)
    this.login = this.login.bind(this)
    this.socialLogin = this.socialLogin.bind(this)
    this.refresh = this.refresh.bind(this)
    this.logout = this.logout.bind(this)
    this.me = this.me.bind(this)
    this.updateProfile = this.updateProfile.bind(this)
    this.uploadProfilePicture = this.uploadProfilePicture.bind(this)
  }

  isValidEmail(email) {
    return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  isValidPassword(password) {
    return typeof password === 'string' && password.length >= 8
  }

  normalizeUsername(input) {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 24)
  }

  mapUser(user) {
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      username: user.username,
      avatarUrl: user.avatarUrl || null,
      bio: user.bio || '',
      statusMessage: user.statusMessage || 'Focused'
    }
  }

  async generateUniqueUsername(baseValue) {
    const base = this.normalizeUsername(baseValue || 'focus_user') || 'focus_user'

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const suffix = attempt === 0 ? '' : `_${Math.floor(1000 + Math.random() * 9000)}`
      const candidate = `${base}${suffix}`.slice(0, 24)
      const existing = await UserModel.findByUsername(candidate)
      if (!existing) {
        return candidate
      }
    }

    return `${base.slice(0, 16)}_${Date.now().toString().slice(-6)}`
  }

  buildTokens(user) {
    const accessToken = JwtService.signAccessToken({
      userId: user._id.toString(),
      email: user.email
    })
    const refreshToken = JwtService.signRefreshToken({
      userId: user._id.toString(),
      email: user.email
    })
    return { accessToken: accessToken, refreshToken: refreshToken }
  }

  refreshExpiryDate() {
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)
    return expiresAt
  }

  async signup(req, res) {
    try {
      const name = req.body && req.body.name ? req.body.name.trim() : null
      const email = req.body && req.body.email ? req.body.email.trim().toLowerCase() : null
      const password = req.body && req.body.password ? req.body.password : null

      if (!this.isValidEmail(email)) {
        return ResponseHandler.sendBadRequest(res, 'Invalid email address')
      }

      if (!this.isValidPassword(password)) {
        return ResponseHandler.sendBadRequest(res, 'Password must be at least 8 characters')
      }

      const existing = await UserModel.findByEmail(email)
      if (existing) {
        return ResponseHandler.sendConflict(res, 'Email already registered')
      }

      const passwordHash = await PasswordService.hash(password)
      const usernameSeed = name || email.split('@')[0]
      const username = await this.generateUniqueUsername(usernameSeed)

      const user = await UserModel.createLocalUser({
        email: email,
        name: name,
        passwordHash: passwordHash,
        username: username,
        avatarUrl: null,
        bio: '',
        statusMessage: 'Focused'
      })

      const tokens = this.buildTokens(user)
      await UserModel.addRefreshToken(user._id, tokens.refreshToken, this.refreshExpiryDate())

      return ResponseHandler.sendCreated(res, {
        user: this.mapUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }, 'Signup successful')
    } catch (_err) {
      return ResponseHandler.sendServerError(res, 'Server error')
    }
  }

  async login(req, res) {
    try {
      const email = req.body && req.body.email ? req.body.email.trim().toLowerCase() : null
      const password = req.body && req.body.password ? req.body.password : null

      if (!this.isValidEmail(email)) {
        return ResponseHandler.sendBadRequest(res, 'Invalid email address')
      }

      if (!password) {
        return ResponseHandler.sendBadRequest(res, 'Password is required')
      }

      const user = await UserModel.findByEmail(email)
      if (!user || !user.passwordHash) {
        return ResponseHandler.sendUnauthorized(res, 'Invalid credentials')
      }

      const match = await PasswordService.compare(password, user.passwordHash)
      if (!match) {
        return ResponseHandler.sendUnauthorized(res, 'Invalid credentials')
      }

      const tokens = this.buildTokens(user)
      await UserModel.addRefreshToken(user._id, tokens.refreshToken, this.refreshExpiryDate())
      await UserModel.updateLastLogin(user._id)

      return ResponseHandler.sendSuccess(res, {
        user: this.mapUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }, 'Login successful')
    } catch (_err) {
      return ResponseHandler.sendServerError(res, 'Server error')
    }
  }

  async socialLogin(req, res) {
    try {
      const provider = req.body && req.body.provider ? req.body.provider.trim().toLowerCase() : null
      const providerId = req.body && req.body.providerId ? req.body.providerId.trim() : null
      const email = req.body && req.body.email ? req.body.email.trim().toLowerCase() : null
      const displayName = req.body && req.body.displayName ? req.body.displayName.trim() : null
      const avatarUrl = req.body && req.body.avatarUrl ? req.body.avatarUrl.trim() : null

      if (!provider || !providerId) {
        return ResponseHandler.sendBadRequest(res, 'Provider and providerId are required')
      }

      let user = await UserModel.findByProvider(provider, providerId)

      if (!user) {
        const usernameSeed = displayName || email?.split('@')[0] || provider
        const username = await this.generateUniqueUsername(usernameSeed)

        user = await UserModel.createSocialUser({
          provider: provider,
          providerId: providerId,
          email: email,
          displayName: displayName,
          avatarUrl: avatarUrl,
          name: displayName,
          username: username,
          bio: '',
          statusMessage: 'Focused'
        })
      }

      const tokens = this.buildTokens(user)
      await UserModel.addRefreshToken(user._id, tokens.refreshToken, this.refreshExpiryDate())
      await UserModel.updateLastLogin(user._id)

      return ResponseHandler.sendSuccess(res, {
        user: this.mapUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }, 'Social login successful')
    } catch (_err) {
      return ResponseHandler.sendServerError(res, 'Server error')
    }
  }

  async refresh(req, res) {
    try {
      const refreshToken = req.body && req.body.refreshToken ? req.body.refreshToken : null
      if (!refreshToken) {
        return ResponseHandler.sendBadRequest(res, 'Refresh token required')
      }

      const payload = JwtService.verifyRefreshToken(refreshToken)
      const user = await UserModel.findByRefreshToken(refreshToken)

      if (!user || !payload) {
        return ResponseHandler.sendUnauthorized(res, 'Invalid refresh token')
      }

      const tokens = this.buildTokens(user)
      await UserModel.replaceRefreshToken(user._id, refreshToken, tokens.refreshToken, this.refreshExpiryDate())

      return ResponseHandler.sendSuccess(res, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }, 'Token refreshed')
    } catch (_err) {
      return ResponseHandler.sendUnauthorized(res, 'Invalid refresh token')
    }
  }

  async logout(req, res) {
    try {
      const refreshToken = req.body && req.body.refreshToken ? req.body.refreshToken : null
      if (!refreshToken) {
        return ResponseHandler.sendBadRequest(res, 'Refresh token required')
      }

      const userId = req.user && req.user.userId ? req.user.userId : null
      if (!userId) {
        return ResponseHandler.sendUnauthorized(res, 'Invalid user session')
      }

      await UserModel.removeRefreshToken(userId, refreshToken)
      return ResponseHandler.sendSuccess(res, null, 'Logout successful')
    } catch (_err) {
      return ResponseHandler.sendServerError(res, 'Server error')
    }
  }

  async me(req, res) {
    try {
      const userId = req.user && req.user.userId ? req.user.userId : null
      if (!userId) {
        return ResponseHandler.sendUnauthorized(res, 'Invalid user session')
      }

      const user = await UserModel.findById(userId)
      if (!user) {
        return ResponseHandler.sendNotFound(res, 'User not found')
      }

      const [taskCount, projectCount, completedTaskCount, activeProjectCount] = await Promise.all([
        TaskModel.countByOwner(userId),
        ProjectModel.countByOwner(userId),
        TaskModel.countCompletedByOwner(userId),
        ProjectModel.countActiveByOwner(userId)
      ])
      const [pendingTaskCount, inProgressTaskCount] = await Promise.all([
        TaskModel.countByOwnerAndStatus(userId, 0),
        TaskModel.countByOwnerAndStatus(userId, 1)
      ])

      return ResponseHandler.sendSuccess(res, {
        user: this.mapUser(user),
        stats: {
          taskCount: taskCount,
          projectCount: projectCount,
          completedTaskCount: completedTaskCount,
          activeProjectCount: activeProjectCount,
          pendingTaskCount: pendingTaskCount,
          inProgressTaskCount: inProgressTaskCount
        }
      }, 'Profile fetched')
    } catch (_err) {
      return ResponseHandler.sendServerError(res, 'Server error')
    }
  }

  async updateProfile(req, res) {
    try {
      const userId = req.user && req.user.userId ? req.user.userId : null
      if (!userId) {
        return ResponseHandler.sendUnauthorized(res, 'Invalid user session')
      }

      const name = req.body && typeof req.body.name === 'string' ? req.body.name.trim() : undefined
      const usernameInput = req.body && typeof req.body.username === 'string' ? req.body.username.trim() : undefined
      const avatarUrl = req.body && typeof req.body.avatarUrl === 'string' ? req.body.avatarUrl.trim() : undefined
      const bio = req.body && typeof req.body.bio === 'string' ? req.body.bio.trim() : undefined
      const statusMessage = req.body && typeof req.body.statusMessage === 'string' ? req.body.statusMessage.trim() : undefined

      const updates = {}

      if (typeof name !== 'undefined') {
        if (!name) {
          return ResponseHandler.sendBadRequest(res, 'Name cannot be empty')
        }
        updates.name = name.slice(0, 80)
      }

      if (typeof usernameInput !== 'undefined') {
        const normalized = this.normalizeUsername(usernameInput)
        if (!normalized || normalized.length < 3) {
          return ResponseHandler.sendBadRequest(res, 'Username must be at least 3 characters')
        }

        const existingByUsername = await UserModel.findByUsername(normalized)
        if (existingByUsername && existingByUsername._id.toString() !== userId.toString()) {
          return ResponseHandler.sendConflict(res, 'Username already in use')
        }

        updates.username = normalized
      }

      if (typeof avatarUrl !== 'undefined') {
        updates.avatarUrl = avatarUrl
      }

      if (typeof bio !== 'undefined') {
        updates.bio = bio.slice(0, 280)
      }

      if (typeof statusMessage !== 'undefined') {
        updates.statusMessage = statusMessage.slice(0, 80)
      }

      const updatedUser = await UserModel.updateProfile(userId, updates)

      return ResponseHandler.sendSuccess(res, {
        user: this.mapUser(updatedUser)
      }, 'Profile updated')
    } catch (_err) {
      return ResponseHandler.sendServerError(res, 'Server error')
    }
  }

  async uploadProfilePicture(req, res) {
    try {
      const userId = req.user && req.user.userId ? req.user.userId : null
      if (!userId) {
        return ResponseHandler.sendUnauthorized(res, 'Invalid user session')
      }

      if (!req.file) {
        return ResponseHandler.sendBadRequest(res, 'Profile picture file is required')
      }

      const fileUrl = `/uploads/profiles/${req.file.filename}`
      const updatedUser = await UserModel.updateProfile(userId, { avatarUrl: fileUrl })

      return ResponseHandler.sendSuccess(res, {
        user: this.mapUser(updatedUser)
      }, 'Profile picture updated')
    } catch (_err) {
      return ResponseHandler.sendServerError(res, 'Server error')
    }
  }
}

module.exports = new AuthController()
