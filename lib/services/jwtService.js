const fs = require('fs')
const path = require('path')
const jwt = require('jsonwebtoken')

class JwtService {
  constructor() {
    this.accessPrivateKey = null
    this.accessPublicKey = null
    this.refreshPrivateKey = null
    this.refreshPublicKey = null
    this.loadKeys = this.loadKeys.bind(this)
    this.signAccessToken = this.signAccessToken.bind(this)
    this.signRefreshToken = this.signRefreshToken.bind(this)
    this.verifyAccessToken = this.verifyAccessToken.bind(this)
    this.verifyRefreshToken = this.verifyRefreshToken.bind(this)
  }

  loadKeys() {
    if (this.accessPrivateKey && this.accessPublicKey && this.refreshPrivateKey && this.refreshPublicKey) {
      return
    }

    const baseDir = path.join(__dirname, '..', 'keys')
    const accessPrivatePath = process.env.JWT_ACCESS_PRIVATE_KEY || path.join(baseDir, 'access_token_private.pem')
    const accessPublicPath = process.env.JWT_ACCESS_PUBLIC_KEY || path.join(baseDir, 'access_token_public.pem')
    const refreshPrivatePath = process.env.JWT_REFRESH_PRIVATE_KEY || path.join(baseDir, 'refresh_token_private.pem')
    const refreshPublicPath = process.env.JWT_REFRESH_PUBLIC_KEY || path.join(baseDir, 'refresh_token_public.pem')

    this.accessPrivateKey = fs.readFileSync(accessPrivatePath, 'utf8')
    this.accessPublicKey = fs.readFileSync(accessPublicPath, 'utf8')
    this.refreshPrivateKey = fs.readFileSync(refreshPrivatePath, 'utf8')
    this.refreshPublicKey = fs.readFileSync(refreshPublicPath, 'utf8')
  }

  signAccessToken(payload) {
    this.loadKeys()
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d'
    return jwt.sign(payload, this.accessPrivateKey, { algorithm: 'RS256', expiresIn: expiresIn })
  }

  signRefreshToken(payload) {
    this.loadKeys()
    const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '365d'
    return jwt.sign(payload, this.refreshPrivateKey, { algorithm: 'RS256', expiresIn: expiresIn })
  }

  verifyAccessToken(token) {
    this.loadKeys()
    return jwt.verify(token, this.accessPublicKey, { algorithms: ['RS256'] })
  }

  verifyRefreshToken(token) {
    this.loadKeys()
    return jwt.verify(token, this.refreshPublicKey, { algorithms: ['RS256'] })
  }
}

module.exports = new JwtService()
