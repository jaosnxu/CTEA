/**
 * CHU TEA - Sentry Error Tracking (Backend)
 * 
 * Centralized error tracking and performance monitoring
 */

import * as Sentry from '@sentry/node';
import { logger } from './logger';

/**
 * Initialize Sentry for backend
 */
export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  
  if (!dsn) {
    logger.warn('SENTRY_DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    
    // Release tracking
    release: process.env.npm_package_version || '1.0.0',
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Error filtering
    beforeSend(event, hint) {
      // Don't send errors in development
      if (process.env.NODE_ENV === 'development') {
        logger.debug({ event, hint }, 'Sentry event (not sent in dev)');
        return null;
      }
      
      return event;
    },
    
    // Integrations (auto-enabled in Sentry v8+)
    // No manual integration needed
  });

  logger.info('Sentry initialized for backend');
}

/**
 * Capture exception with context
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (context) {
    Sentry.setContext('additional', context);
  }
  
  Sentry.captureException(error);
  logger.error({ error, context }, 'Exception captured by Sentry');
}

/**
 * Capture message with severity
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
) {
  if (context) {
    Sentry.setContext('additional', context);
  }
  
  Sentry.captureMessage(message, level);
  logger.info({ message, level, context }, 'Message captured by Sentry');
}

/**
 * Set user context
 */
export function setUser(user: { id: string; email?: string; username?: string }) {
  Sentry.setUser(user);
}

/**
 * Clear user context
 */
export function clearUser() {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}

/**
 * Start transaction for performance monitoring
 */
export function startTransaction(name: string, op: string) {
  return Sentry.startSpan({
    name,
    op,
  }, () => {});
}

/**
 * Express error handler middleware
 */
export function sentryErrorHandler() {
  return (err: Error, req: any, res: any, next: any) => {
    // Capture error with request context
    Sentry.captureException(err, {
      contexts: {
        request: {
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: req.body,
        },
      },
    });
    
    next(err);
  };
}

/**
 * Flush Sentry events (for graceful shutdown)
 */
export async function flushSentry(timeout = 2000): Promise<boolean> {
  try {
    await Sentry.flush(timeout);
    logger.info('Sentry events flushed');
    return true;
  } catch (error) {
    logger.error({ error }, 'Failed to flush Sentry events');
    return false;
  }
}

/**
 * Graceful shutdown handler
 */
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, flushing Sentry events');
  await flushSentry();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, flushing Sentry events');
  await flushSentry();
});
