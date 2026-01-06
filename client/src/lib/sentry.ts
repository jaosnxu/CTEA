/**
 * CHU TEA - Sentry Error Tracking (Frontend)
 * 
 * Centralized error tracking and performance monitoring for React
 */

import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry for frontend
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!dsn) {
    console.warn('[Sentry] DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || 'development',
    
    // Release tracking
    release: import.meta.env.VITE_APP_VERSION || '1.0.0',
    
    // Performance monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    
    // Replay session recording
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // Error filtering
    beforeSend(event, hint) {
      // Don't send errors in development
      if (import.meta.env.DEV) {
        console.debug('[Sentry] Event (not sent in dev):', event, hint);
        return null;
      }
      
      return event;
    },
    
    // Integrations
    integrations: [
      // React Router integration
      Sentry.browserTracingIntegration(),
      
      // Session replay
      Sentry.replayIntegration(),
    ],
  });

  console.info('[Sentry] Initialized for frontend');
}

/**
 * Capture exception with context
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (context) {
    Sentry.setContext('additional', context);
  }
  
  Sentry.captureException(error);
  console.error('[Sentry] Exception captured:', error, context);
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
  console.info('[Sentry] Message captured:', message, level, context);
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
 * React Error Boundary component
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;
