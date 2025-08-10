// src/utils/logger.ts
import winston from 'winston';
const logFormat = winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json());
export const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: logFormat,
    defaultMeta: { service: 'plato-mcp-server' },
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
});
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize(), winston.format.simple())
    }));
}
// Helper function for timing operations
export function withTiming(fn, label) {
    const start = Date.now();
    return fn().finally(() => {
        const duration = Date.now() - start;
        logger.info(`${label} completed in ${duration}ms`);
    });
}
//# sourceMappingURL=logger.js.map