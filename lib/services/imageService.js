const sharp = require('sharp')

class ImageService {
  constructor() {
    this.compressProfileImage = this.compressProfileImage.bind(this)
  }

  defaults() {
    return {
      maxBytes: 150 * 1024,
      minBytes: 100 * 1024,
      maxWidth: 640,
      maxHeight: 640,
      minQuality: 45,
      maxQuality: 90
    }
  }

  async renderJpeg(buffer, options) {
    const { width, height, quality } = options
    return sharp(buffer)
      .rotate()
      .resize({ width, height, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer()
  }

  async compressProfileImage(buffer, overrides = {}) {
    const settings = { ...this.defaults(), ...overrides }
    let width = settings.maxWidth
    let height = settings.maxHeight
    let quality = 82

    if (!buffer || !buffer.length) {
      console.error('[ImageService] Empty buffer')
      throw new Error('Image buffer is empty')
    }

    let output = await this.renderJpeg(buffer, { width, height, quality })

    let attempts = 0
    while (output.length > settings.maxBytes && quality > settings.minQuality && attempts < 6) {
      quality = Math.max(settings.minQuality, quality - 8)
      output = await this.renderJpeg(buffer, { width, height, quality })
      attempts += 1
    }

    attempts = 0
    while (output.length > settings.maxBytes && attempts < 4) {
      width = Math.round(width * 0.85)
      height = Math.round(height * 0.85)
      quality = Math.max(settings.minQuality, quality - 4)
      output = await this.renderJpeg(buffer, { width, height, quality })
      attempts += 1
    }

    attempts = 0
    while (output.length < settings.minBytes && quality < settings.maxQuality && attempts < 3) {
      quality = Math.min(settings.maxQuality, quality + 4)
      output = await this.renderJpeg(buffer, { width, height, quality })
      attempts += 1
    }

    const result = {
      buffer: output,
      mimeType: 'image/jpeg',
      extension: 'jpg',
      size: output.length,
      quality,
      width,
      height
    }

    console.log('[ImageService] Compressed image', {
      size: result.size,
      quality: result.quality,
      width: result.width,
      height: result.height
    })

    return result
  }
}

module.exports = new ImageService()
