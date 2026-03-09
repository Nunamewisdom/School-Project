import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/apiError.js';
import User from '../models/User.js';

/**
 * Auth Middleware
 * 
 * Verifies JWT access token and attaches user to request.
 * Per BACKEND_SKILL.md lines 92-104
 */
export async function auth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw ApiError.unauthorized('No token provided');
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const user = await User.findById(decoded.userId).select('-refreshTokenHash');

            if (!user) {
                throw ApiError.unauthorized('User not found');
            }

            if (user.deletedAt) {
                throw ApiError.unauthorized('Account has been deleted');
            }

            req.user = user;
            req.userId = user._id;
            next();
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                throw ApiError.unauthorized('Token expired', 'TOKEN_EXPIRED');
            }
            if (jwtError.name === 'JsonWebTokenError') {
                throw ApiError.unauthorized('Invalid token', 'INVALID_TOKEN');
            }
            throw jwtError;
        }
    } catch (error) {
        next(error);
    }
}

/**
 * Optional auth - doesn't fail if no token, but attaches user if valid
 */
export async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];

            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findById(decoded.userId).select('-refreshTokenHash');

                if (user && !user.deletedAt) {
                    req.user = user;
                    req.userId = user._id;
                }
            } catch (err) {
                // Ignore token errors for optional auth
            }
        }

        next();
    } catch (error) {
        next(error);
    }
}
