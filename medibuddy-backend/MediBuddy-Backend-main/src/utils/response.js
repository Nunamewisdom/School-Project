/**
 * Response Helpers
 * 
 * Consistent response envelope per BACKEND_SKILL.md lines 26-52
 */

/**
 * Send success response
 */
export function sendSuccess(res, data = null, message = null, status = 200) {
    const response = {
        success: true,
        data,
        serverTime: new Date().toISOString()
    };

    if (message) {
        response.message = message;
    }

    return res.status(status).json(response);
}

/**
 * Send error response
 */
export function sendError(res, status = 500, message = 'Internal Error', code = 'INTERNAL_ERROR', details = null) {
    const response = {
        success: false,
        error: message,
        code,
        serverTime: new Date().toISOString()
    };

    if (details) {
        response.details = details;
    }

    return res.status(status).json(response);
}

/**
 * Async handler wrapper to catch errors
 */
export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
