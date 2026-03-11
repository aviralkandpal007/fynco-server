const https = require('https')

class GithubOAuthService {
  constructor() {
    this.exchangeCode = this.exchangeCode.bind(this)
    this.fetchProfile = this.fetchProfile.bind(this)
    this.fetchEmails = this.fetchEmails.bind(this)
  }

  async exchangeCode(code) {
    const clientId = process.env.GITHUB_CLIENT_ID
    const clientSecret = process.env.GITHUB_CLIENT_SECRET
    const redirectUri = process.env.GITHUB_REDIRECT_URI

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('GitHub OAuth configuration missing')
    }

    const payload = JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri
    })

    const options = {
      hostname: 'github.com',
      path: '/login/oauth/access_token',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }

    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = ''
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data))
            } catch (err) {
              reject(err)
            }
            return
          }
          reject(new Error(`GitHub token exchange failed: ${res.statusCode} ${data}`))
        })
      })
      req.on('error', reject)
      req.write(payload)
      req.end()
    })

    if (!response.access_token) {
      throw new Error('GitHub token missing')
    }

    return response.access_token
  }

  async fetchProfile(accessToken) {
    const options = {
      hostname: 'api.github.com',
      path: '/user',
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'fynco-server',
        'Authorization': `Bearer ${accessToken}`
      }
    }

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = ''
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data))
            } catch (err) {
              reject(err)
            }
            return
          }
          reject(new Error(`GitHub profile fetch failed: ${res.statusCode} ${data}`))
        })
      })
      req.on('error', reject)
      req.end()
    })
  }

  async fetchEmails(accessToken) {
    const options = {
      hostname: 'api.github.com',
      path: '/user/emails',
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'fynco-server',
        'Authorization': `Bearer ${accessToken}`
      }
    }

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = ''
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data))
            } catch (err) {
              reject(err)
            }
            return
          }
          reject(new Error(`GitHub emails fetch failed: ${res.statusCode} ${data}`))
        })
      })
      req.on('error', reject)
      req.end()
    })
  }
}

module.exports = new GithubOAuthService()
