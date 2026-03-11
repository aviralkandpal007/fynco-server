const JwtService = require('../services/jwtService')
const ResponseHandler = require('../util/responseHandler')

class AuthMiddleware {
  constructor() {
    this.handle = this.handle.bind(this)
  }

  handle(req, res, next) {
    const header = req.headers.authorization || ''
    const parts = header.split(' ')
    const token = parts.length === 2 ? parts[1] : null

    if (!token) {
      return ResponseHandler.sendUnauthorized(res, 'auth_missing_token')
    }

    try {
      const payload = JwtService.verifyAccessToken(token)
      req.user = payload
      return next()
    } catch (err) {
      return ResponseHandler.sendUnauthorized(res, 'auth_invalid_or_expired_token')
    }
  }
}

module.exports = new AuthMiddleware()
