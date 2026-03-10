const bcrypt = require('bcrypt')

class PasswordService {
  constructor() {
    this.saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10)
    this.hash = this.hash.bind(this)
    this.compare = this.compare.bind(this)
  }

  async hash(plainText) {
    return bcrypt.hash(plainText, this.saltRounds)
  }

  async compare(plainText, hash) {
    return bcrypt.compare(plainText, hash)
  }
}

module.exports = new PasswordService()
