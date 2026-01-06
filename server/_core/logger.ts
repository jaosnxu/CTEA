/**
 * CHU TEA - Unified Logging System
 * 
 * Centralized logging with:
 * - Environment-based log levels
 * - Structured logging (JSON in production, pretty in dev)
 * - Request/response logging
 * - Error tracking
 */

import pino from 'pino';

/**
 * Get log level from environment
 */
function getLogLevel(): pino.Level {
  const level = process.env.LOG_LEVEL?.toLowerCase();
  
  if (level && ['fatal', 'error', 'warn', 'info', 'debug', 'trace'].includes(level)) {
    return level as pino.Level;
  }
  
  // Default levels by environment
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

/**
 * Create logger instance
 */
export const logger = pino({
  level: getLogLevel(),
  
  // Pretty print in development
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    },
  } : undefined,
  
  // Base fields
  base: {
    env: process.env.NODE_ENV,
    app: 'chutea',
  },
  
  // Timestamp
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Create child logger with context
 */
export function createLogger(context: string) {
  return logger.child({ context });
}

/**
 * Express middleware for request logging
 */
export function requestLogger() {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    
    // Log request
    logger.info({
      type: 'request',
      method: req.method,
      url: req.url,
      ip: req.ip,
    });
    
    // Log response
    res.on('finish', () => {
      const duration = Date.now() - start;
      
      logger.info({
        type: 'response',
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration,
      });
    });
    
    next();
  };
}

/**
 * Log error with stack trace
 */
export function logError(error: Error, context?: string) {
  logger.error({
    context,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
  });
}

/**
 * Log business event
 */
export function logEvent(event: string, data?: any) {
  logger.info({
    type: 'event',
    event,
    data,
  });
}

/**
 * Log performance metric
 */
export function logMetric(metric: string, value: number, unit: string) {
  logger.debug({
    type: 'metric',
    metric,
    value,
    unit,
  });
}

export default logger;
