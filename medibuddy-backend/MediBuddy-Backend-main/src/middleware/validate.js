import { ZodError } from 'zod';

/**
 * Validation Middleware
 * 
 * Validates request body/query using Zod schemas.
 * Per BACKEND_SKILL.md lines 391-417
 */
export function validate(schema, source = 'body') {
    return async (req, res, next) => {
        try {
            const dataToValidate = source === 'query' ? req.query :
                source === 'params' ? req.params :
                    req.body;

            const result = schema.parse(dataToValidate);
            req.validated = result;
            next();
        } catch (err) {
            if (err instanceof ZodError) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    details: err.errors.map(e => ({
                        path: e.path.join('.'),
                        message: e.message
                    })),
                    serverTime: new Date().toISOString()
                });
            }
            next(err);
        }
    };
}

/**
 * Validate query parameters
 */
export function validateQuery(schema) {
    return validate(schema, 'query');
}

/**
 * Validate URL parameters
 */
export function validateParams(schema) {
    return validate(schema, 'params');
}
