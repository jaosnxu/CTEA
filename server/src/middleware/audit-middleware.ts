/**
 * Audit Middleware
 *
 * Automatically logs all API operations to the audit chain
 *
 * Features:
 * - Captures all successful operations
 * - Records operator information
 * - Tracks IP address and user agent
 * - Non-blocking (doesn't fail main operation)
 */

import { Request, Response, NextFunction } from "express";
import { AuditLogService } from "../services/audit-log-service";
import { AuditAction } from "@prisma/client";

export interface AuditMiddlewareOptions {
  auditLogService: AuditLogService;
  excludePaths?: string[];
}

/**
 * Create audit middleware
 */
export function createAuditMiddleware(options: AuditMiddlewareOptions) {
  const { auditLogService, excludePaths = [] } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip audit logging for excluded paths
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Skip audit logging for GET requests (read-only)
    if (req.method === "GET") {
      return next();
    }

    // Capture original methods
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    // Override res.json to capture response
    res.json = function (body: any) {
      // Log successful operations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logAuditEvent(req, body);
      }
      return originalJson(body);
    };

    // Override res.send to capture response
    res.send = function (body: any) {
      // Log successful operations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const parsedBody = typeof body === "string" ? JSON.parse(body) : body;
          logAuditEvent(req, parsedBody);
        } catch (error) {
          // Ignore parsing errors
        }
      }
      return originalSend(body);
    };

    async function logAuditEvent(req: Request, responseBody: any) {
      try {
        // Determine action based on HTTP method
        let action: AuditAction;
        switch (req.method) {
          case "POST":
            action = "INSERT";
            break;
          case "PUT":
          case "PATCH":
            action = "UPDATE";
            break;
          case "DELETE":
            action = "DELETE";
            break;
          default:
            return; // Skip other methods
        }

        // Extract table name and record ID from request
        const tableName = extractTableName(req);
        const recordId = extractRecordId(req, responseBody);

        if (!tableName || !recordId) {
          return; // Skip if we can't determine table/record
        }

        // Extract operator information
        const operator = extractOperator(req);

        // Create audit log
        await auditLogService.createAuditLog({
          tableName,
          recordId,
          action,
          diffBefore:
            action === "UPDATE" || action === "DELETE"
              ? req.body?.before
              : undefined,
          diffAfter:
            action === "INSERT" || action === "UPDATE"
              ? responseBody
              : undefined,
          operatorId: operator.id,
          operatorType: operator.type,
          operatorName: operator.name,
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers["user-agent"],
          requestId: req.headers["x-request-id"] as string,
        });
      } catch (error) {
        // Log error but don't fail the request
        console.error("❌ Failed to create audit log:", error);
      }
    }

    next();
  };
}

/**
 * Extract table name from request path
 * Examples:
 *   /api/stores/123 -> stores
 *   /api/admin/users/456 -> users
 */
function extractTableName(req: Request): string | null {
  const pathParts = req.path.split("/").filter(Boolean);

  // Find the first path part that looks like a table name (plural noun)
  for (let i = 0; i < pathParts.length; i++) {
    const part = pathParts[i];
    // Skip common prefixes
    if (part === "api" || part === "admin" || part === "v1" || part === "v2") {
      continue;
    }
    // Return the first non-prefix part
    return part;
  }

  return null;
}

/**
 * Extract record ID from request or response
 */
function extractRecordId(req: Request, responseBody: any): string | null {
  // Try to get ID from URL path
  const pathParts = req.path.split("/").filter(Boolean);
  const lastPart = pathParts[pathParts.length - 1];

  // Check if last part looks like an ID (UUID or number)
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      lastPart
    )
  ) {
    return lastPart;
  }
  if (/^\d+$/.test(lastPart)) {
    return lastPart;
  }

  // Try to get ID from request body
  if (req.body?.id) {
    return String(req.body.id);
  }

  // Try to get ID from response body
  if (responseBody?.id) {
    return String(responseBody.id);
  }
  if (responseBody?.data?.id) {
    return String(responseBody.data.id);
  }

  return null;
}

/**
 * Extract operator information from request
 */
function extractOperator(req: Request): {
  id?: string;
  type: "ADMIN" | "USER" | "SYSTEM" | "API";
  name?: string;
} {
  // Check for authenticated user
  const user = (req as any).user;
  if (user) {
    return {
      id: user.id || user.userId,
      type: user.role === "admin" ? "ADMIN" : "USER",
      name: user.name || user.username || user.email,
    };
  }

  // Check for API key
  const apiKey = req.headers["x-api-key"];
  if (apiKey) {
    return {
      type: "API",
      name: "API Client",
    };
  }

  // Default to SYSTEM
  return {
    type: "SYSTEM",
    name: "System",
  };
}
