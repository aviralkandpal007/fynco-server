const crypto = require('crypto')

class OtpService {
  constructor() {
    this.generate = this.generate.bind(this)
    this.hash = this.hash.bind(this)
  }

  generate() {
    const value = crypto.randomInt(0, 1000000)
    return value.toString().padStart(6, '0')
  }

  hash(otp) {
    const secret = process.env.OTP_SECRET || 'fynco_otp_secret'
    return crypto.createHash('sha256').update(`${otp}:${secret}`).digest('hex')
  }
}

module.exports = new OtpService()
