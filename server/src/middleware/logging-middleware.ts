/**
 * Request Logging Middleware
 *
 * Logs all incoming HTTP requests with:
 * - Request method, URL, and headers
 * - Response status and duration
 * - User information (if authenticated)
 * - Request ID for tracking
 */

import { Request, Response, NextFunction } from "express";
import { createLogger } from "../utils/logger";
import { nanoid } from "nanoid";

const logger = createLogger("HTTP");

export interface RequestWithId extends Request {
  id?: string;
  startTime?: number;
  _logged?: boolean; // Flag to prevent duplicate logging
}

/**
 * Request logging middleware
 */
export function loggingMiddleware(
  req: RequestWithId,
  res: Response,
  next: NextFunction
) {
  // Generate unique request ID
  const requestId = (req.headers["x-request-id"] as string) || nanoid(10);
  req.id = requestId;
  req.startTime = Date.now();

  // Create request logger with context
  const requestLogger = logger.withRequest(requestId);

  // Log incoming request
  requestLogger.http("Incoming request", {
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.headers["user-agent"],
  });

  // Capture response
  const originalSend = res.send.bind(res);
  const originalJson = res.json.bind(res);

  // Override res.send
  res.send = function (body: any) {
    logResponse(req, res, body);
    return originalSend(body);
  };

  // Override res.json
  res.json = function (body: any) {
    logResponse(req, res, body);
    return originalJson(body);
  };

  // Handle errors
  res.on("finish", () => {
    if (!res.headersSent) {
      logResponse(req, res);
    }
  });

  next();
}

/**
 * Log response details
 */
function logResponse(req: RequestWithId, res: Response, body?: any) {
  // Prevent duplicate logging
  if (req._logged) {
    return;
  }
  req._logged = true;

  const duration = req.startTime ? Date.now() - req.startTime : 0;
  const requestLogger = logger.withRequest(req.id || "unknown");

  const logData = {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    contentLength: res.get("content-length"),
  };

  // Determine log level based on status code
  if (res.statusCode >= 500) {
    requestLogger.error("Request failed", undefined, logData);
  } else if (res.statusCode >= 400) {
    requestLogger.warn("Request error", logData);
  } else {
    requestLogger.info("Request completed", logData);
  }
}

/**
 * Error logging middleware
 */
export function errorLoggingMiddleware(
  err: Error,
  req: RequestWithId,
  res: Response,
  next: NextFunction
) {
  const requestLogger = logger.withRequest(req.id || "unknown");

  requestLogger.error("Request error", err, {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
  });

  next(err);
}

/**
 * Add request ID to response headers
 */
export function requestIdMiddleware(
  req: RequestWithId,
  res: Response,
  next: NextFunction
) {
  if (req.id) {
    res.setHeader("X-Request-ID", req.id);
  }
  next();
}
