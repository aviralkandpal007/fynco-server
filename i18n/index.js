const en = require('./en_messages')
const fr = require('./fr_messages')
const de = require('./de_messages')

const messages = { en, fr, de }

const DEFAULT_LANGUAGE = (process.env.DEFAULT_LANGUAGE || 'en').toLowerCase()
const SUPPORTED_LANGUAGES = Object.keys(messages)

const normalizeLanguage = (value) => {
  if (!value || typeof value !== 'string') {
    return null
  }

  const primary = value.split(',')[0].trim()
  if (!primary) {
    return null
  }

  const code = primary.split(';')[0].trim().toLowerCase()
  if (!code) {
    return null
  }

  const base = code.split('-')[0]
  return SUPPORTED_LANGUAGES.includes(base) ? base : null
}

const getLanguageFromHeader = (req) => {
  const raw = req.headers['x-language']
    || req.headers['x-language-code']
    || req.headers['accept-language']
    || ''

  return normalizeLanguage(raw) || DEFAULT_LANGUAGE
}

const isSupportedLanguage = (value) => Boolean(normalizeLanguage(value))

const translate = (lang, key) => {
  const normalized = normalizeLanguage(lang) || DEFAULT_LANGUAGE
  const dictionary = messages[normalized] || messages[DEFAULT_LANGUAGE] || {}
  return dictionary[key] || (messages[DEFAULT_LANGUAGE] && messages[DEFAULT_LANGUAGE][key]) || key
}

module.exports = {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  getLanguageFromHeader,
  isSupportedLanguage,
  normalizeLanguage,
  translate
}
