/**
 * Log Sanitization Utility
 * 
 * Ensures sensitive data is masked before logging to prevent data leaks.
 * All logging operations MUST pass through this sanitizer.
 */

/**
 * List of sensitive field names (case-insensitive)
 */
const SENSITIVE_FIELDS = [
  'token',
  'password',
  'secret',
  'apikey',
  'api_key',
  'phone',
  'mobile',
  'card',
  'cardnumber',
  'card_number',
  'cvv',
  'cvc',
  'pin',
  'ssn',
  'passport',
  'license',
  'authorization',
  'bearer',
  'cookie',
  'session',
  'private',
  'credential',
  'otp',
  'verification_code',
  'verificationcode',
  'access_code',
  'accesscode',
];

/**
 * Fields that should NOT be treated as sensitive even if they match keywords
 */
const NON_SENSITIVE_FIELDS = [
  'code', // Error codes, status codes
  'statuscode',
  'status_code',
  'errorcode',
  'error_code',
  'responsecode',
  'response_code',
  'key', // Generic key fields (e.g., object keys)
  'id',
  'userid',
  'user_id',
];

/**
 * Mask sensitive string values
 * 
 * @param value - String to mask
 * @returns Masked string (first 2 chars + *** + last 2 chars)
 */
function maskString(value: string): string {
  if (value.length <= 4) {
    return '***';
  }
  return `${value.substring(0, 2)}***${value.substring(value.length - 2)}`;
}

/**
 * Check if a field name is sensitive
 * 
 * @param fieldName - Field name to check
 * @returns True if field is sensitive
 */
function isSensitiveField(fieldName: string): boolean {
  const lowerFieldName = fieldName.toLowerCase();
  
  // Check if explicitly non-sensitive
  if (NON_SENSITIVE_FIELDS.some(nonSensitive => lowerFieldName === nonSensitive)) {
    return false;
  }
  
  // Check if matches sensitive pattern
  return SENSITIVE_FIELDS.some(sensitive => lowerFieldName.includes(sensitive));
}

/**
 * Sanitize an object by masking sensitive fields
 * 
 * @param obj - Object to sanitize
 * @param maxDepth - Maximum recursion depth (default: 5)
 * @param currentDepth - Current recursion depth (internal)
 * @returns Sanitized object
 */
function sanitizeObject(obj: any, maxDepth: number = 5, currentDepth: number = 0): any {
  if (currentDepth >= maxDepth) {
    return '[Max Depth Reached]';
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, maxDepth, currentDepth + 1));
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveField(key)) {
      // Mask sensitive field
      if (typeof value === 'string') {
        sanitized[key] = maskString(value);
      } else {
        sanitized[key] = '***';
      }
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(value, maxDepth, currentDepth + 1);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Truncate long strings to prevent log overflow
 * 
 * @param str - String to truncate
 * @param maxLength - Maximum length (default: 500)
 * @returns Truncated string
 */
function truncateString(str: string, maxLength: number = 500): string {
  if (str.length <= maxLength) {
    return str;
  }
  return `${str.substring(0, maxLength)}... [truncated ${str.length - maxLength} chars]`;
}

/**
 * Main sanitization function for logging
 * 
 * Masks sensitive fields and truncates long strings.
 * 
 * @param obj - Object to sanitize
 * @param maxLength - Maximum string length (default: 500)
 * @returns Sanitized object safe for logging
 * 
 * @example
 * const data = {
 *   user: 'john',
 *   password: 'secret123',
 *   phone: '+1234567890',
 *   order: { id: 123, amount: 100 }
 * };
 * 
 * const safe = sanitizeForLog(data);
 * // Result: {
 * //   user: 'john',
 * //   password: '***',
 * //   phone: '+1***90',
 * //   order: { id: 123, amount: 100 }
 * // }
 */
export function sanitizeForLog(obj: any, maxLength: number = 500): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle strings
  if (typeof obj === 'string') {
    return truncateString(obj, maxLength);
  }

  // Handle objects and arrays
  if (typeof obj === 'object') {
    const sanitized = sanitizeObject(obj);
    
    // Return sanitized object directly (no JSON truncation to avoid parsing errors)
    return sanitized;
  }

  return obj;
}

/**
 * Sanitize error objects for logging
 * 
 * @param error - Error object
 * @returns Sanitized error info
 */
export function sanitizeError(error: any): any {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: truncateString(error.message, 500),
      stack: error.stack ? truncateString(error.stack, 1000) : undefined,
    };
  }
  return sanitizeForLog(error);
}

/**
 * Safe JSON stringify with sanitization
 * 
 * @param obj - Object to stringify
 * @param maxLength - Maximum output length
 * @returns Sanitized JSON string
 */
export function safeStringify(obj: any, maxLength: number = 1000): string {
  try {
    const sanitized = sanitizeForLog(obj, maxLength);
    return JSON.stringify(sanitized, null, 2);
  } catch (error) {
    return `[Stringify Error: ${(error as Error).message}]`;
  }
}
