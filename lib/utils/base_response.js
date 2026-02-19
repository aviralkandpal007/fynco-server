/// base response class to standardize API responses
/// this class can be extended to create specific response types if needed
class BaseResponse {
    constructor(status, message, data, extraCode) {
        this.status = status;
        this.message = message;
        this.data = data;
        this.extraCode = extraCode;
    }

    // method to send the response in a consistent format
    send(res) {
        res.status(this.status).json({
            message: this.message,
            data: this.data,
            extraCode: this.extraCode
        });
    }

    // static method to create a success response
    success(message, data = null, extraCode = null) {
        return new BaseResponse(200, message, data, extraCode);
    }

    // static method to create a created response
    created(message, data = null, extraCode = null) {
        return new Response(201, message, data, extraCode);
    }

    // static method to create an error response
    serverError(message, status = 500, data = null, extraCode = null) {
        return new Response(status, message, data, extraCode);
    }

    // static method to create a bad request response
    badRequest(message, data = null, extraCode = null) {
        return new Response(400, message, data, extraCode);
    }

    // static method to create an unauthorized response
    unauthorized(message, data = null, extraCode = null) {
        return new Response(401, message, data, extraCode);
    }

    // static method to create a not found response
    notFound(message, data = null, extraCode = null) {
        return new Response(404, message, data, extraCode);
    }

    // static method to create a forbidden response
    forbidden(message, data = null, extraCode = null) {
        return new Response(403, message, data, extraCode);
    }
}

module.exports = new BaseResponse();