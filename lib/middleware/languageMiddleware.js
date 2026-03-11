const { getLanguageFromHeader } = require('../../i18n')

module.exports = function languageMiddleware(req, res, next) {
  const lang = getLanguageFromHeader(req)
  req.lang = lang
  res.locals.lang = lang
  next()
}
