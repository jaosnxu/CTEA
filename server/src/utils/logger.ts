/**
 * Centralized Logging Service for CTEA
 *
 * Features:
 * - Structured logging with Winston
 * - Multiple log levels (error, warn, info, http, debug)
 * - File-based logging with daily rotation
 * - Console logging with colored output
 * - Request context tracking
 * - Production and development configurations
 */

import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";

const logDir = process.env.LOG_DIR || "logs";
const isProduction = process.env.NODE_ENV === "production";

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.metadata(),
  winston.format.json()
);

// Helper function to format metadata
const formatMetadata = (meta: any): string => {
  if (!meta.metadata || Object.keys(meta.metadata).length === 0) {
    return "";
  }
  return `\n${JSON.stringify(meta.metadata, null, 2)}`;
};

// Console format for development (pretty print)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = formatMetadata(meta);
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Create transports array
const transports: winston.transport[] = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    format: isProduction ? logFormat : consoleFormat,
    level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  })
);

// File transport for combined logs (production)
if (isProduction) {
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, "combined-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
      format: logFormat,
      level: "info",
    })
  );
}

// File transport for error logs
transports.push(
  new DailyRotateFile({
    filename: path.join(logDir, "error-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    maxSize: "20m",
    maxFiles: "30d",
    format: logFormat,
    level: "error",
  })
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  format: logFormat,
  transports,
  exitOnError: false,
});

/**
 * Logger with context support
 */
export class Logger {
  private context?: string;
  private requestId?: string;
  private userId?: string;

  constructor(context?: string, requestId?: string, userId?: string) {
    this.context = context;
    this.requestId = requestId;
    this.userId = userId;
  }

  private log(level: string, message: string, meta?: any) {
    const logMeta = {
      ...meta,
      context: this.context,
      requestId: this.requestId,
      userId: this.userId,
    };

    // Remove undefined values
    Object.keys(logMeta).forEach(key => {
      if (logMeta[key] === undefined) {
        delete logMeta[key];
      }
    });

    logger.log(level, message, logMeta);
  }

  error(message: string, error?: Error | any, meta?: any) {
    const errorMeta = {
      ...meta,
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : error,
    };
    this.log("error", message, errorMeta);
  }

  warn(message: string, meta?: any) {
    this.log("warn", message, meta);
  }

  info(message: string, meta?: any) {
    this.log("info", message, meta);
  }

  debug(message: string, meta?: any) {
    this.log("debug", message, meta);
  }

  http(message: string, meta?: any) {
    this.log("http", message, meta);
  }

  /**
   * Create a child logger with additional context
   */
  child(context: string): Logger {
    return new Logger(
      this.context ? `${this.context}:${context}` : context,
      this.requestId,
      this.userId
    );
  }

  /**
   * Create a logger with request context
   */
  withRequest(requestId: string, userId?: string): Logger {
    return new Logger(this.context, requestId, userId);
  }
}

/**
 * Default logger instance
 */
export const defaultLogger = new Logger();

/**
 * Create a logger for a specific module/context
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}

/**
 * Export winston logger for direct access
 */
export { logger as winstonLogger };

export default defaultLogger;
