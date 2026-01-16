# CTEA Logging System Documentation

## Overview

CTEA uses Winston for structured logging with support for multiple log levels, file-based logging with daily rotation, and contextual logging for better traceability.

## Features

- **Structured Logging**: All logs are structured with timestamps, context, and metadata
- **Multiple Log Levels**: error, warn, info, http, debug
- **File-Based Logging**: Automatic daily log rotation
- **Console Output**: Colored output in development, JSON in production
- **Request Tracking**: Automatic request ID assignment and tracking
- **Context Support**: Organize logs by module/component
- **Error Tracking**: Full stack trace capture for errors
- **Non-Blocking**: Logging never blocks application execution

## Log Levels

| Level | Usage | Examples |
|-------|-------|----------|
| `error` | System errors, exceptions | Failed database connections, unhandled errors |
| `warn` | Warning conditions | Deprecated API usage, missing optional config |
| `info` | General information | Server started, user logged in, operation completed |
| `http` | HTTP requests/responses | API calls, request details |
| `debug` | Detailed debugging | Query execution details, internal state |

## Configuration

The logging system is configured via environment variables:

```bash
# Log level (default: info in production, debug in development)
LOG_LEVEL=info

# Log directory (default: logs)
LOG_DIR=logs

# Node environment
NODE_ENV=production
```

## Log File Structure

```
logs/
├── combined-2026-01-16.log  # All logs (info and above, production only)
├── combined-2026-01-17.log
├── error-2026-01-16.log     # Error logs only
└── error-2026-01-17.log
```

**Retention Policy:**
- Combined logs: 14 days
- Error logs: 30 days
- Max file size: 20MB (auto-rotates)

## Usage

### Basic Logging

```typescript
import { createLogger } from './server/src/utils/logger';

const logger = createLogger('ModuleName');

// Log messages at different levels
logger.info('User logged in', { userId: '123' });
logger.warn('Cache miss', { key: 'user:123' });
logger.error('Database connection failed', error, { host: 'db.example.com' });
logger.debug('Query executed', { sql: 'SELECT * FROM users', duration: '15ms' });
```

### Request Context Logging

```typescript
import { createLogger } from './server/src/utils/logger';

const logger = createLogger('API');

// Create logger with request context
const requestLogger = logger.withRequest(requestId, userId);

requestLogger.info('Processing request', { 
  endpoint: '/api/orders',
  method: 'POST'
});
```

### Child Loggers

```typescript
import { createLogger } from './server/src/utils/logger';

const dbLogger = createLogger('Database');

// Create child logger for more specific context
const queryLogger = dbLogger.child('Query');
const migrationLogger = dbLogger.child('Migration');

queryLogger.info('Executing query', { sql: 'SELECT * FROM users' });
migrationLogger.info('Running migration', { version: '001' });
```

### Error Logging

```typescript
import { createLogger } from './server/src/utils/logger';

const logger = createLogger('ErrorHandler');

try {
  // Some operation
} catch (error) {
  // Logs error with full stack trace
  logger.error('Operation failed', error as Error, {
    operation: 'userRegistration',
    userId: '123'
  });
}
```

## HTTP Request Logging

The logging middleware automatically logs all HTTP requests:

```typescript
// Automatically added in server/_core/index.ts
import { loggingMiddleware, requestIdMiddleware } from './src/middleware/logging-middleware';

app.use(requestIdMiddleware);  // Adds X-Request-ID header
app.use(loggingMiddleware);    // Logs all requests
```

**Request Log Format:**
```json
{
  "timestamp": "2026-01-16 15:30:00",
  "level": "http",
  "message": "Incoming request",
  "context": "HTTP",
  "requestId": "abc123",
  "method": "POST",
  "url": "/api/orders",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

**Response Log Format:**
```json
{
  "timestamp": "2026-01-16 15:30:01",
  "level": "info",
  "message": "Request completed",
  "context": "HTTP",
  "requestId": "abc123",
  "method": "POST",
  "url": "/api/orders",
  "statusCode": 200,
  "duration": "145ms"
}
```

## Integration with Audit Logging

The logging system integrates seamlessly with CTEA's existing audit logging:

```typescript
import { createLogger } from './server/src/utils/logger';

const logger = createLogger('AuditLog');

// Audit events are logged with structured context
logger.info('Audit event registered', {
  eventId: 'EVT-20260116-000001',
  tableName: 'orders',
  recordId: '123',
  action: 'INSERT'
});
```

## Log Output Formats

### Development Mode (Pretty Print)

```
2026-01-16 15:30:00 [info]: User logged in
{
  "userId": "123",
  "context": "Auth"
}
```

### Production Mode (JSON)

```json
{
  "timestamp": "2026-01-16 15:30:00",
  "level": "info",
  "message": "User logged in",
  "context": "Auth",
  "userId": "123"
}
```

## Best Practices

### 1. Use Appropriate Log Levels

```typescript
// ✅ Good
logger.error('Failed to save order', error);
logger.warn('Product stock low', { productId: '123', stock: 5 });
logger.info('Order created', { orderId: '456' });
logger.debug('Cache lookup', { key: 'order:456', hit: true });

// ❌ Bad
logger.info('Error occurred');  // Should be error level
logger.error('User clicked button');  // Should be debug or not logged
```

### 2. Include Relevant Context

```typescript
// ✅ Good
logger.error('Database query failed', error, {
  query: 'SELECT * FROM orders',
  database: 'main',
  userId: '123'
});

// ❌ Bad
logger.error('Query failed');  // Missing context
```

### 3. Use Structured Metadata

```typescript
// ✅ Good
logger.info('Payment processed', {
  orderId: '123',
  amount: 50.00,
  currency: 'USD',
  paymentMethod: 'card'
});

// ❌ Bad
logger.info(`Payment processed: order 123, $50.00`);  // Harder to parse
```

### 4. Don't Log Sensitive Information

```typescript
// ✅ Good
logger.info('User authenticated', { userId: '123' });

// ❌ Bad
logger.info('User authenticated', { 
  userId: '123',
  password: 'secret123'  // Never log passwords!
});
```

## Testing

Run the logging system test:

```bash
npx tsx server/test-logging.ts
```

This will test:
- Default logger
- Context logger
- Request context logger
- Child logger
- Error logging with stack traces
- HTTP logger

## Troubleshooting

### Logs Not Appearing in Files

**Issue**: Logs show in console but not in files

**Solution**: 
- Check `NODE_ENV` is set to `production` for combined logs
- Error logs are always written to files
- Ensure `logs/` directory permissions are correct

### Log Files Growing Too Large

**Issue**: Log files using too much disk space

**Solution**:
- Logs automatically rotate daily
- Adjust retention in `server/src/utils/logger.ts`:
  ```typescript
  maxFiles: '7d'  // Keep logs for 7 days instead of 14
  ```

### Performance Impact

**Issue**: Concerned about logging performance

**Solution**:
- Logging is asynchronous and non-blocking
- File writes are buffered
- Adjust log level in production:
  ```bash
  LOG_LEVEL=warn  # Only log warnings and errors
  ```

## Migration Guide

If you have existing code using `console.log`, migrate to structured logging:

```typescript
// Before
console.log('[Auth] User logged in:', userId);
console.error('[Database] Connection failed:', error);

// After
import { createLogger } from './server/src/utils/logger';

const logger = createLogger('Auth');
logger.info('User logged in', { userId });

const dbLogger = createLogger('Database');
dbLogger.error('Connection failed', error);
```

## Examples

### Example 1: API Endpoint

```typescript
import { createLogger } from './server/src/utils/logger';

const logger = createLogger('OrderAPI');

export async function createOrder(req, res) {
  const requestLogger = logger.withRequest(req.id, req.user?.id);
  
  try {
    requestLogger.info('Creating order', { 
      items: req.body.items.length,
      total: req.body.total
    });
    
    const order = await orderService.create(req.body);
    
    requestLogger.info('Order created successfully', {
      orderId: order.id,
      total: order.total
    });
    
    res.json(order);
  } catch (error) {
    requestLogger.error('Failed to create order', error, {
      userId: req.user?.id,
      items: req.body.items
    });
    res.status(500).json({ error: 'Failed to create order' });
  }
}
```

### Example 2: Background Job

```typescript
import { createLogger } from './server/src/utils/logger';

const logger = createLogger('Jobs');

export async function processPayments() {
  const jobLogger = logger.child('PaymentProcessor');
  
  jobLogger.info('Starting payment processing job');
  
  const pendingPayments = await getpendingPayments();
  jobLogger.info('Found pending payments', { count: pendingPayments.length });
  
  for (const payment of pendingPayments) {
    try {
      await processPayment(payment);
      jobLogger.debug('Payment processed', { paymentId: payment.id });
    } catch (error) {
      jobLogger.error('Payment processing failed', error, {
        paymentId: payment.id,
        amount: payment.amount
      });
    }
  }
  
  jobLogger.info('Payment processing job completed');
}
```

## See Also

- [Audit Chain Verification](./AUDIT_CHAIN_VERIFICATION.md)
- [Winston Documentation](https://github.com/winstonjs/winston)
- [Log Levels RFC 5424](https://tools.ietf.org/html/rfc5424)
