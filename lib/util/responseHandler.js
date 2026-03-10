class ResponseHandler {
  sendSuccess(res, data, message) {
    return res.status(200).json({
      ok: true,
      message: message || 'Success',
      data: data
    });
  }

  sendCreated(res, data, message) {
    return res.status(201).json({
      ok: true,
      message: message || 'Created',
      data: data
    });
  }

  sendBadRequest(res, message) {
    return res.status(400).json({
      ok: false,
      message: message || 'Bad request'
    });
  }

  sendUnauthorized(res, message) {
    return res.status(401).json({
      ok: false,
      message: message || 'Unauthorized'
    });
  }

  sendForbidden(res, message) {
    return res.status(403).json({
      ok: false,
      message: message || 'Forbidden'
    });
  }

  sendNotFound(res, message) {
    return res.status(404).json({
      ok: false,
      message: message || 'Not found'
    });
  }

  sendConflict(res, message) {
    return res.status(409).json({
      ok: false,
      message: message || 'Conflict'
    });
  }

  sendUnprocessable(res, message) {
    return res.status(422).json({
      ok: false,
      message: message || 'Unprocessable entity'
    });
  }

  sendTooManyRequests(res, message) {
    return res.status(429).json({
      ok: false,
      message: message || 'Too many requests'
    });
  }

  sendServerError(res, message) {
    return res.status(500).json({
      ok: false,
      message: message || 'Something went wrong at server'
    });
  }
}

module.exports = new ResponseHandler();
