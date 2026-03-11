const { translate } = require('../../i18n')

class ResponseHandler {
  sendSuccess(res, data, messageKey) {
    const message = translate(res.locals.lang, messageKey || 'common_success')
    return res.status(200).json({
      ok: true,
      message: message,
      data: data
    });
  }

  sendCreated(res, data, messageKey) {
    const message = translate(res.locals.lang, messageKey || 'common_created')
    return res.status(201).json({
      ok: true,
      message: message,
      data: data
    });
  }

  sendBadRequest(res, messageKey) {
    const message = translate(res.locals.lang, messageKey || 'common_bad_request')
    return res.status(400).json({
      ok: false,
      message: message
    });
  }

  sendUnauthorized(res, messageKey) {
    const message = translate(res.locals.lang, messageKey || 'common_unauthorized')
    return res.status(401).json({
      ok: false,
      message: message
    });
  }

  sendForbidden(res, messageKey) {
    const message = translate(res.locals.lang, messageKey || 'common_forbidden')
    return res.status(403).json({
      ok: false,
      message: message
    });
  }

  sendNotFound(res, messageKey) {
    const message = translate(res.locals.lang, messageKey || 'common_not_found')
    return res.status(404).json({
      ok: false,
      message: message
    });
  }

  sendConflict(res, messageKey) {
    const message = translate(res.locals.lang, messageKey || 'common_conflict')
    return res.status(409).json({
      ok: false,
      message: message
    });
  }

  sendUnprocessable(res, messageKey) {
    const message = translate(res.locals.lang, messageKey || 'common_unprocessable')
    return res.status(422).json({
      ok: false,
      message: message
    });
  }

  sendTooManyRequests(res, messageKey) {
    const message = translate(res.locals.lang, messageKey || 'common_too_many_requests')
    return res.status(429).json({
      ok: false,
      message: message
    });
  }

  sendServerError(res, messageKey) {
    const message = translate(res.locals.lang, messageKey || 'common_server_error')
    return res.status(500).json({
      ok: false,
      message: message
    });
  }
}

module.exports = new ResponseHandler();
