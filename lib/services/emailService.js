const https = require('https')
const fs = require('fs')
const path = require('path')
const { translate } = require('../../i18n')

class EmailService {
  constructor() {
    this.sendOtpEmail = this.sendOtpEmail.bind(this)
    this.sendPasswordResetOtp = this.sendPasswordResetOtp.bind(this)
    this.loadOtpTemplate = this.loadOtpTemplate.bind(this)
    this.loadPasswordResetTemplate = this.loadPasswordResetTemplate.bind(this)
    this.templateCache = null
    this.resetTemplateCache = null
  }

  loadOtpTemplate() {
    if (this.templateCache) {
      return this.templateCache
    }

    const templatePath = path.join(__dirname, '..', 'views', 'mail-templates', 'otp-verification.html')
    const template = fs.readFileSync(templatePath, 'utf8')

    this.templateCache = {
      html: template
    }

    return this.templateCache
  }

  loadPasswordResetTemplate() {
    if (this.resetTemplateCache) {
      return this.resetTemplateCache
    }

    const templatePath = path.join(__dirname, '..', 'views', 'mail-templates', 'password-reset-otp.html')
    const template = fs.readFileSync(templatePath, 'utf8')

    this.resetTemplateCache = {
      html: template
    }

    return this.resetTemplateCache
  }

  async sendOtpEmail({ toEmail, toName, otp, lang }) {
    const apiKey = process.env.BREVO_API_KEY
    const senderEmail = process.env.BREVO_SENDER_EMAIL
    const senderName = process.env.BREVO_SENDER_NAME || 'Fynco'
    const senderImageUrl = process.env.BREVO_SENDER_IMAGE_URL

    if (!apiKey || !senderEmail || !senderImageUrl) {
      throw new Error('Brevo email configuration missing')
    }

    const template = this.loadOtpTemplate()
    const name = toName || toEmail
    const htmlContent = template.html
      .replace(/{{senderImageUrl}}/g, senderImageUrl)
      .replace(/{{otp}}/g, otp)
      .replace(/{{title}}/g, translate(lang, 'email_verify_title'))
      .replace(/{{greeting}}/g, translate(lang, 'email_greeting').replace('{{name}}', name))
      .replace(/{{body}}/g, translate(lang, 'email_verify_body'))
      .replace(/{{senderText}}/g, translate(lang, 'email_sender_text'))
      .replace(/{{footerNote}}/g, translate(lang, 'email_footer_note'))

    const payload = JSON.stringify({
      sender: {
        name: senderName,
        email: senderEmail
      },
      to: [
        {
          email: toEmail,
          name: name
        }
      ],
      subject: translate(lang, 'email_verify_subject'),
      htmlContent
    })

    const options = {
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'api-key': apiKey
      }
    }

    await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve()
            return
          }
          reject(new Error(`Brevo email failed: ${res.statusCode} ${data}`))
        })
      })

      req.on('error', reject)
      req.write(payload)
      req.end()
    })
  }

  async sendPasswordResetOtp({ toEmail, toName, otp, lang }) {
    const apiKey = process.env.BREVO_API_KEY
    const senderEmail = process.env.BREVO_SENDER_EMAIL
    const senderName = process.env.BREVO_SENDER_NAME || 'Fynco'
    const senderImageUrl = process.env.BREVO_SENDER_IMAGE_URL

    if (!apiKey || !senderEmail || !senderImageUrl) {
      throw new Error('Brevo email configuration missing')
    }

    const template = this.loadPasswordResetTemplate()
    const name = toName || toEmail
    const htmlContent = template.html
      .replace(/{{senderImageUrl}}/g, senderImageUrl)
      .replace(/{{otp}}/g, otp)
      .replace(/{{title}}/g, translate(lang, 'email_reset_title'))
      .replace(/{{greeting}}/g, translate(lang, 'email_greeting').replace('{{name}}', name))
      .replace(/{{body}}/g, translate(lang, 'email_reset_body'))
      .replace(/{{senderText}}/g, translate(lang, 'email_sender_text'))
      .replace(/{{footerNote}}/g, translate(lang, 'email_footer_note'))

    const payload = JSON.stringify({
      sender: {
        name: senderName,
        email: senderEmail
      },
      to: [
        {
          email: toEmail,
          name: name
        }
      ],
      subject: translate(lang, 'email_reset_subject'),
      htmlContent
    })

    const options = {
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'api-key': apiKey
      }
    }

    await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve()
            return
          }
          reject(new Error(`Brevo email failed: ${res.statusCode} ${data}`))
        })
      })

      req.on('error', reject)
      req.write(payload)
      req.end()
    })
  }
}

module.exports = new EmailService()
