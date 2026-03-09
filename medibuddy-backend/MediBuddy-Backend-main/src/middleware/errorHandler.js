import { ApiError } from '../utils/apiError.js';
import logger from '../utils/logger.js';

/**
 * Error Handler Middleware
 * 
 * Catches all errors and returns consistent envelope.
 * Per BACKEND_SKILL.md lines 135-139
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
    // Log error
    logger.error({
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        userId: req.userId?.toString() || 'anonymous'
    });

    // Handle known API errors
    if (err instanceof ApiError) {
        return res.status(err.status).json({
            success: false,
            error: err.message,
            code: err.code,
            details: err.details,
            serverTime: new Date().toISOString()
        });
    }

    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: Object.values(err.errors).map(e => ({
                path: e.path,
                message: e.message
            })),
            serverTime: new Date().toISOString()
        });
    }

    // Handle Mongoose cast errors (invalid ObjectId)
    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            error: `Invalid ${err.path}: ${err.value}`,
            code: 'INVALID_ID',
            serverTime: new Date().toISOString()
        });
    }

    // Handle duplicate key errors
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(409).json({
            success: false,
            error: `${field} already exists`,
            code: 'DUPLICATE_KEY',
            serverTime: new Date().toISOString()
        });
    }

    // Default to 500 internal error
    const status = err.status || 500;
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : err.message;

    return res.status(status).json({
        success: false,
        error: message,
        code: 'INTERNAL_ERROR',
        serverTime: new Date().toISOString()
    });
}

/**
 * Not Found Handler
 */
export function notFoundHandler(req, res) {
    return res.status(404).json({
        success: false,
        error: `Cannot ${req.method} ${req.path}`,
        code: 'NOT_FOUND',
        serverTime: new Date().toISOString()
    });
}
