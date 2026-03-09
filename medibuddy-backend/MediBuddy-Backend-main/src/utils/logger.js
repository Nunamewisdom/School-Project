import winston from 'winston';

/**
 * Logger Configuration
 * 
 * Winston logger with PII redaction.
 * Per BACKEND_SKILL.md lines 148-152
 */

// PII patterns to redact
const piiPatterns = [
    { regex: /\+?\d{10,15}/g, replacement: '[PHONE]' },
    { regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL]' },
];

// Custom format to redact PII
const redactPii = winston.format((info) => {
    let message = typeof info.message === 'string' ? info.message : JSON.stringify(info.message);

    for (const pattern of piiPatterns) {
        message = message.replace(pattern.regex, pattern.replacement);
    }

    info.message = message;
    return info;
});

// Create logger
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        redactPii(),
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'medibuddy-api' },
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
    logger.add(new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error'
    }));
    logger.add(new winston.transports.File({
        filename: 'logs/combined.log'
    }));
}

export default logger;
