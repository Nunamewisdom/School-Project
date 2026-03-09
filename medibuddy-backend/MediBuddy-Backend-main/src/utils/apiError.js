/**
 * API Error Class
 * 
 * Custom error class for consistent error responses.
 * Per BACKEND_SKILL.md lines 122-132
 */
export class ApiError extends Error {
    constructor(status = 500, message = 'Internal Error', code = 'INTERNAL_ERROR', details = null) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }

    static badRequest(message = 'Bad Request', code = 'BAD_REQUEST', details = null) {
        return new ApiError(400, message, code, details);
    }

    static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED') {
        return new ApiError(401, message, code);
    }

    static forbidden(message = 'Forbidden', code = 'FORBIDDEN') {
        return new ApiError(403, message, code);
    }

    static notFound(message = 'Not Found', code = 'NOT_FOUND') {
        return new ApiError(404, message, code);
    }

    static conflict(message = 'Conflict', code = 'CONFLICT') {
        return new ApiError(409, message, code);
    }

    static tooManyRequests(message = 'Too Many Requests', code = 'RATE_LIMIT_EXCEEDED') {
        return new ApiError(429, message, code);
    }

    static internal(message = 'Internal Server Error', code = 'INTERNAL_ERROR') {
        return new ApiError(500, message, code);
    }
}
