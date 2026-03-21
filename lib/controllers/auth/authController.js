const UserModel = require('../../models/users/userModel')
const TaskModel = require('../../models/tasks/taskModel')
const ProjectModel = require('../../models/projects/projectModel')
const PasswordService = require('../../services/passwordService')
const JwtService = require('../../services/jwtService')
const ImageService = require('../../services/imageService')
const OtpModel = require('../../models/otp/otpModel')
const OtpService = require('../../services/otpService')
const EmailService = require('../../services/emailService')
const GithubOAuthService = require('../../services/githubOAuthService')
const ResponseHandler = require('../../util/responseHandler')
const { DEFAULT_LANGUAGE, isSupportedLanguage, normalizeLanguage } = require('../../../i18n')
const fs = require('fs')
const path = require('path')
const uploadPaths = require('../../util/uploadPaths')

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
    this.verifyOtp = this.verifyOtp.bind(this)
    this.resendOtp = this.resendOtp.bind(this)
    this.githubOAuth = this.githubOAuth.bind(this)
    this.requestPasswordReset = this.requestPasswordReset.bind(this)
    this.resetPassword = this.resetPassword.bind(this)
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

  getPublicBaseUrl(req) {
    const envBase = process.env.PUBLIC_BASE_URL
    if (envBase) {
      return envBase.replace(/\/+$/, '')
    }

    if (req) {
      return `${req.protocol}://${req.get('host')}`
    }

    return ''
  }

  mapUser(user, req) {
    let avatarUrl = user.avatarUrl || null
    const baseUrl = this.getPublicBaseUrl(req)
    if (avatarUrl && baseUrl && !/^https?:\/\//i.test(avatarUrl)) {
      avatarUrl = `${baseUrl}${avatarUrl.startsWith('/') ? '' : '/'}${avatarUrl}`
    }

    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      username: user.username,
      avatarUrl,
      bio: user.bio || '',
      statusMessage: user.statusMessage || 'Focused',
      language: user.language || DEFAULT_LANGUAGE,
      isEmailVerified: Boolean(user.isEmailVerified)
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
        return ResponseHandler.sendBadRequest(res, 'auth_invalid_email')
      }

      if (!this.isValidPassword(password)) {
        return ResponseHandler.sendBadRequest(res, 'auth_password_too_short')
      }

      const existing = await UserModel.findByEmail(email)
      if (existing) {
        return ResponseHandler.sendConflict(res, 'auth_email_registered')
      }

      const passwordHash = await PasswordService.hash(password)
      const usernameSeed = name || email.split('@')[0]
      const username = await this.generateUniqueUsername(usernameSeed)
      const language = normalizeLanguage(req.lang) || DEFAULT_LANGUAGE

      const user = await UserModel.createLocalUser({
        email: email,
        name: name,
        passwordHash: passwordHash,
        username: username,
        avatarUrl: null,
        bio: '',
        statusMessage: 'Focused',
        language: language,
        isEmailVerified: false,
        emailVerifiedAt: null
      })

      const otp = OtpService.generate()
      const otpHash = OtpService.hash(otp)
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
      await OtpModel.createForUser(user._id, otpHash, expiresAt, 'signup')

      await EmailService.sendOtpEmail({
        toEmail: user.email,
        toName: user.name,
        otp,
        lang: req.lang
      })

      return ResponseHandler.sendCreated(res, {
        user: this.mapUser(user, req),
        requiresVerification: true
      }, 'auth_signup_success')
    } catch (_err) {
      return ResponseHandler.sendServerError(res, 'common_server_error')
    }
  }

  async login(req, res) {
    try {
      const email = req.body && req.body.email ? req.body.email.trim().toLowerCase() : null
      const password = req.body && req.body.password ? req.body.password : null

      if (!this.isValidEmail(email)) {
        return ResponseHandler.sendBadRequest(res, 'auth_invalid_email')
      }

      if (!password) {
        return ResponseHandler.sendBadRequest(res, 'auth_password_required')
      }

      const user = await UserModel.findByEmail(email)
      if (!user || !user.passwordHash) {
        return ResponseHandler.sendUnauthorized(res, 'auth_invalid_credentials')
      }

      const match = await PasswordService.compare(password, user.passwordHash)
      if (!match) {
        return ResponseHandler.sendUnauthorized(res, 'auth_invalid_credentials')
      }
      if (user.isEmailVerified === false) {
        const otp = OtpService.generate()
        const otpHash = OtpService.hash(otp)
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
        await OtpModel.createForUser(user._id, otpHash, expiresAt, 'signup')

        await EmailService.sendOtpEmail({
          toEmail: user.email,
          toName: user.name,
          otp,
          lang: req.lang
        })

        return ResponseHandler.sendSuccess(res, {
          user: this.mapUser(user, req),
          requiresVerification: true,
          email: user.email
        }, 'auth_email_not_verified')
      }

      const tokens = this.buildTokens(user)
      await UserModel.addRefreshToken(user._id, tokens.refreshToken, this.refreshExpiryDate())
      await UserModel.updateLastLogin(user._id)

      return ResponseHandler.sendSuccess(res, {
        user: this.mapUser(user, req),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }, 'auth_login_success')
    } catch (_err) {
      return ResponseHandler.sendServerError(res, 'common_server_error')
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
        return ResponseHandler.sendBadRequest(res, 'auth_provider_required')
      }

      const result = await this.handleSocialAuth({
        provider,
        providerId,
        email,
        displayName,
        avatarUrl,
        lang: req.lang
      })

      return ResponseHandler.sendSuccess(res, result, 'auth_social_login_success')
    } catch (_err) {
      return ResponseHandler.sendServerError(res, 'common_server_error')
    }
  }

  async refresh(req, res) {
    try {
      const refreshToken = req.body && req.body.refreshToken ? req.body.refreshToken : null
      if (!refreshToken) {
        return ResponseHandler.sendBadRequest(res, 'auth_refresh_token_required')
      }

      const payload = JwtService.verifyRefreshToken(refreshToken)
      const user = await UserModel.findByRefreshToken(refreshToken)

      if (!user || !payload) {
        return ResponseHandler.sendUnauthorized(res, 'auth_invalid_refresh_token')
      }

      const tokens = this.buildTokens(user)
      await UserModel.replaceRefreshToken(user._id, refreshToken, tokens.refreshToken, this.refreshExpiryDate())

      return ResponseHandler.sendSuccess(res, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }, 'auth_token_refreshed')
    } catch (_err) {
      return ResponseHandler.sendUnauthorized(res, 'auth_invalid_refresh_token')
    }
  }

  async logout(req, res) {
    try {
      const refreshToken = req.body && req.body.refreshToken ? req.body.refreshToken : null
      if (!refreshToken) {
        return ResponseHandler.sendBadRequest(res, 'auth_refresh_token_required')
      }

      const userId = req.user && req.user.userId ? req.user.userId : null
      if (!userId) {
        return ResponseHandler.sendUnauthorized(res, 'auth_invalid_user_session')
      }

      await UserModel.removeRefreshToken(userId, refreshToken)
      return ResponseHandler.sendSuccess(res, null, 'auth_logout_success')
    } catch (_err) {
      return ResponseHandler.sendServerError(res, 'common_server_error')
    }
  }

  async me(req, res) {
    try {
      const userId = req.user && req.user.userId ? req.user.userId : null
      if (!userId) {
        return ResponseHandler.sendUnauthorized(res, 'auth_invalid_user_session')
      }

      const user = await UserModel.findById(userId)
      if (!user) {
        return ResponseHandler.sendNotFound(res, 'auth_user_not_found')
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
        user: this.mapUser(user, req),
        stats: {
          taskCount: taskCount,
          projectCount: projectCount,
          completedTaskCount: completedTaskCount,
          activeProjectCount: activeProjectCount,
          pendingTaskCount: pendingTaskCount,
          inProgressTaskCount: inProgressTaskCount
        }
      }, 'auth_profile_fetched')
    } catch (_err) {
      return ResponseHandler.sendServerError(res, 'common_server_error')
    }
  }

  async updateProfile(req, res) {
    try {
      const userId = req.user && req.user.userId ? req.user.userId : null
      if (!userId) {
        return ResponseHandler.sendUnauthorized(res, 'auth_invalid_user_session')
      }

      const name = req.body && typeof req.body.name === 'string' ? req.body.name.trim() : undefined
      const usernameInput = req.body && typeof req.body.username === 'string' ? req.body.username.trim() : undefined
      const avatarUrl = req.body && typeof req.body.avatarUrl === 'string' ? req.body.avatarUrl.trim() : undefined
      const bio = req.body && typeof req.body.bio === 'string' ? req.body.bio.trim() : undefined
      const statusMessage = req.body && typeof req.body.statusMessage === 'string' ? req.body.statusMessage.trim() : undefined
      const languageInput = req.body && typeof req.body.language === 'string' ? req.body.language.trim() : undefined

      const updates = {}

      if (typeof name !== 'undefined') {
        if (!name) {
          return ResponseHandler.sendBadRequest(res, 'auth_name_required')
        }
        updates.name = name.slice(0, 80)
      }

      if (typeof usernameInput !== 'undefined') {
        const normalized = this.normalizeUsername(usernameInput)
        if (!normalized || normalized.length < 3) {
          return ResponseHandler.sendBadRequest(res, 'auth_username_too_short')
        }

        const existingByUsername = await UserModel.findByUsername(normalized)
        if (existingByUsername && existingByUsername._id.toString() !== userId.toString()) {
          return ResponseHandler.sendConflict(res, 'auth_username_in_use')
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

      if (typeof languageInput !== 'undefined') {
        if (!isSupportedLanguage(languageInput)) {
          return ResponseHandler.sendBadRequest(res, 'language_invalid')
        }
        updates.language = normalizeLanguage(languageInput)
      }

      const updatedUser = await UserModel.updateProfile(userId, updates)

      return ResponseHandler.sendSuccess(res, {
        user: this.mapUser(updatedUser, req)
      }, 'auth_profile_updated')
    } catch (_err) {
      return ResponseHandler.sendServerError(res, 'common_server_error')
    }
  }

  async uploadProfilePicture(req, res) {
    try {
      const userId = req.user && req.user.userId ? req.user.userId : null
      if (!userId) {
        return ResponseHandler.sendUnauthorized(res, 'auth_invalid_user_session')
      }

      if (!req.file) {
        return ResponseHandler.sendBadRequest(res, 'auth_profile_picture_required')
      }

      const processed = await ImageService.compressProfileImage(req.file.buffer)
      const filename = `${userId}_${Date.now()}.${processed.extension}`
      let avatarUrl = null

      const uploadDir = uploadPaths.getProfileUploadDir()
      fs.mkdirSync(uploadDir, { recursive: true })
      const filePath = path.join(uploadDir, filename)
      await fs.promises.writeFile(filePath, processed.buffer)
      avatarUrl = `/uploads/profiles/${filename}`

      const updatedUser = await UserModel.updateProfile(userId, { avatarUrl })

      return ResponseHandler.sendSuccess(res, {
        user: this.mapUser(updatedUser, req)
      }, 'auth_profile_picture_updated')
    } catch (_err) {
      return ResponseHandler.sendServerError(res, 'common_server_error')
    }
  }

  async verifyOtp(req, res) {
    try {
      const email = req.body && req.body.email ? req.body.email.trim().toLowerCase() : null
      const code = req.body && req.body.code ? String(req.body.code).trim() : null

      if (!this.isValidEmail(email)) {
        return ResponseHandler.sendBadRequest(res, 'auth_invalid_email')
      }

      if (!code || code.length !== 6) {
        return ResponseHandler.sendBadRequest(res, 'auth_otp_invalid')
      }

      const user = await UserModel.findByEmail(email)
      if (!user) {
        return ResponseHandler.sendNotFound(res, 'auth_user_not_found')
      }

      if (user.isEmailVerified === true) {
        return ResponseHandler.sendConflict(res, 'auth_email_already_verified')
      }

      const otpHash = OtpService.hash(code)
      const match = await OtpModel.findValid(user._id, otpHash, 'signup')
      if (!match) {
        return ResponseHandler.sendUnauthorized(res, 'auth_otp_invalid_or_expired')
      }

      await OtpModel.deleteByUser(user._id, 'signup')
      const updatedUser = await UserModel.verifyEmail(user._id)

      const tokens = this.buildTokens(updatedUser)
      await UserModel.addRefreshToken(updatedUser._id, tokens.refreshToken, this.refreshExpiryDate())

      return ResponseHandler.sendSuccess(res, {
        user: this.mapUser(updatedUser, req),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }, 'auth_otp_verified')
    } catch (_err) {
      return ResponseHandler.sendServerError(res, 'common_server_error')
    }
  }

  async resendOtp(req, res) {
    try {
      const email = req.body && req.body.email ? req.body.email.trim().toLowerCase() : null

      if (!this.isValidEmail(email)) {
        return ResponseHandler.sendBadRequest(res, 'auth_invalid_email')
      }

      const user = await UserModel.findByEmail(email)
      if (!user) {
        return ResponseHandler.sendNotFound(res, 'auth_user_not_found')
      }

      if (user.isEmailVerified === true) {
        return ResponseHandler.sendConflict(res, 'auth_email_already_verified')
      }

      const otp = OtpService.generate()
      const otpHash = OtpService.hash(otp)
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
      await OtpModel.createForUser(user._id, otpHash, expiresAt, 'signup')

      await EmailService.sendOtpEmail({
        toEmail: user.email,
        toName: user.name,
        otp,
        lang: req.lang
      })

      return ResponseHandler.sendSuccess(res, null, 'auth_otp_resent')
    } catch (_err) {
      return ResponseHandler.sendServerError(res, 'common_server_error')
    }
  }

  async requestPasswordReset(req, res) {
    try {
      const email = req.body && req.body.email ? req.body.email.trim().toLowerCase() : null

      if (!this.isValidEmail(email)) {
        return ResponseHandler.sendBadRequest(res, 'auth_invalid_email')
      }

      const user = await UserModel.findByEmail(email)
      if (!user) {
        return ResponseHandler.sendNotFound(res, 'auth_user_not_found')
      }

      const otp = OtpService.generate()
      const otpHash = OtpService.hash(otp)
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
      await OtpModel.createForUser(user._id, otpHash, expiresAt, 'password_reset')

      await EmailService.sendPasswordResetOtp({
        toEmail: user.email,
        toName: user.name,
        otp,
        lang: req.lang
      })

      return ResponseHandler.sendSuccess(res, null, 'auth_password_reset_sent')
    } catch (_err) {
      return ResponseHandler.sendServerError(res, 'common_server_error')
    }
  }

  async resetPassword(req, res) {
    try {
      const email = req.body && req.body.email ? req.body.email.trim().toLowerCase() : null
      const code = req.body && req.body.code ? String(req.body.code).trim() : null
      const password = req.body && req.body.password ? req.body.password : null
      const confirmPassword = req.body && req.body.confirmPassword ? req.body.confirmPassword : null

      if (!this.isValidEmail(email)) {
        return ResponseHandler.sendBadRequest(res, 'auth_invalid_email')
      }
      if (!code || code.length !== 6) {
        return ResponseHandler.sendBadRequest(res, 'auth_otp_invalid')
      }
      if (!this.isValidPassword(password)) {
        return ResponseHandler.sendBadRequest(res, 'auth_password_too_short')
      }
      if (password !== confirmPassword) {
        return ResponseHandler.sendBadRequest(res, 'auth_password_mismatch')
      }

      const user = await UserModel.findByEmail(email)
      if (!user) {
        return ResponseHandler.sendNotFound(res, 'auth_user_not_found')
      }

      const otpHash = OtpService.hash(code)
      const match = await OtpModel.findValid(user._id, otpHash, 'password_reset')
      if (!match) {
        return ResponseHandler.sendUnauthorized(res, 'auth_otp_invalid_or_expired')
      }

      const passwordHash = await PasswordService.hash(password)
      await UserModel.updatePassword(user._id, passwordHash)
      await OtpModel.deleteByUser(user._id, 'password_reset')

      return ResponseHandler.sendSuccess(res, null, 'auth_password_reset_success')
    } catch (_err) {
      return ResponseHandler.sendServerError(res, 'common_server_error')
    }
  }

  async githubOAuth(req, res) {
    try {
      const code = req.body && req.body.code ? req.body.code : null
      if (!code) {
        return ResponseHandler.sendBadRequest(res, 'auth_oauth_code_required')
      }

      const accessToken = await GithubOAuthService.exchangeCode(code)
      const profile = await GithubOAuthService.fetchProfile(accessToken)
      const emails = await GithubOAuthService.fetchEmails(accessToken)

      const primaryEmail = Array.isArray(emails)
        ? emails.find((entry) => entry.primary && entry.verified) || emails.find((entry) => entry.verified) || emails[0]
        : null

      const email = primaryEmail && primaryEmail.email ? primaryEmail.email.toLowerCase() : null
      const displayName = profile && (profile.name || profile.login) ? (profile.name || profile.login) : 'GitHub User'
      const avatarUrl = profile && profile.avatar_url ? profile.avatar_url : null
      const providerId = profile && profile.id ? String(profile.id) : null

      if (!providerId) {
        return ResponseHandler.sendBadRequest(res, 'auth_provider_required')
      }

      const result = await this.handleSocialAuth({
        provider: 'github',
        providerId,
        email,
        displayName,
        avatarUrl,
        lang: req.lang
      })

      return ResponseHandler.sendSuccess(res, result, 'auth_social_login_success')
    } catch (_err) {
      return ResponseHandler.sendServerError(res, 'common_server_error')
    }
  }

  async handleSocialAuth({ provider, providerId, email, displayName, avatarUrl, lang }) {
    let user = await UserModel.findByProvider(provider, providerId)

    if (!user) {
      const usernameSeed = displayName || email?.split('@')[0] || provider
      const username = await this.generateUniqueUsername(usernameSeed)
      const language = normalizeLanguage(lang) || DEFAULT_LANGUAGE

      user = await UserModel.createSocialUser({
        provider: provider,
        providerId: providerId,
        email: email,
        displayName: displayName,
        avatarUrl: avatarUrl,
        name: displayName,
        username: username,
        bio: '',
        statusMessage: 'Focused',
        language: language
      })
    }

    if (!user.isEmailVerified && user.email) {
      await UserModel.verifyEmail(user._id)
      user = await UserModel.findById(user._id)
    }

    const tokens = this.buildTokens(user)
    await UserModel.addRefreshToken(user._id, tokens.refreshToken, this.refreshExpiryDate())
    await UserModel.updateLastLogin(user._id)

    return {
      user: this.mapUser(user, req),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    }
  }
}

module.exports = new AuthController()
