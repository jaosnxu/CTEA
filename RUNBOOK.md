# CTEA Docker Compose Test Environment - RUNBOOK

## Overview

This document describes the Docker Compose-based test environment for CTEA application. This environment is **FOR INTERNAL TESTING ONLY** and should not be used in production.

## Architecture

The test environment consists of three services:

1. **PostgreSQL Database** (`postgres`) - Test database instance
2. **Mock OAuth Server** (`mock-oauth`) - Simulates OAuth provider
3. **CTEA Application** (`app`) - Main application service

## Prerequisites

- Docker Engine 20.10 or later
- Docker Compose v2.0 or later
- At least 4GB of available RAM
- Ports 3000, 4000, and 5432 must be available

## Quick Start

### 1. Start the Environment

```bash
docker compose up -d --build
```

This command will:
- Build the CTEA application Docker image
- Start PostgreSQL database
- Start Mock OAuth server
- Start CTEA application
- All services will run in the background

### 2. Check Service Status

```bash
docker compose ps
```

All three services should show as "healthy" status.

### 3. View Logs

View logs for all services:
```bash
docker compose logs -f
```

View logs for a specific service:
```bash
docker compose logs -f app        # Application logs
docker compose logs -f mock-oauth # Mock OAuth server logs
docker compose logs -f postgres   # Database logs
```

### 4. Access the Application

- **Application**: http://localhost:3000
- **Mock OAuth Server Info**: http://localhost:4000
- **Mock OAuth Health**: http://localhost:4000/health

### 5. Stop the Environment

```bash
docker compose down
```

To stop and remove all data (including database):
```bash
docker compose down -v
```

## Testing OAuth Flow

### Understanding the Mock OAuth Server

The mock OAuth server (`mock-oauth-server.cjs`) provides three endpoints:

1. **ExchangeToken** - Exchanges authorization code for access token
   - Endpoint: `POST /webdev.v1.WebDevAuthPublicService/ExchangeToken`
   - Request: `{ clientId, grantType, code, redirectUri }`
   - Response: `{ accessToken, refreshToken, expiresIn, tokenType }`

2. **GetUserInfo** - Gets user info from access token
   - Endpoint: `POST /webdev.v1.WebDevAuthPublicService/GetUserInfo`
   - Request: `{ accessToken }`
   - Response: `{ openId, name, email, platform, platforms }`

3. **GetUserInfoWithJwt** - Gets user info from JWT
   - Endpoint: `POST /webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`
   - Request: `{ jwtToken, projectId }`
   - Response: `{ openId, name, email, platform, platforms }`

### Mock Users

The mock server provides two test users:

**Test User 1** (default):
- OpenID: `test-open-id-001`
- Name: `Test User 1`
- Email: `testuser1@example.com`
- Platform: `email`

**Test User 2**:
- OpenID: `test-open-id-002`
- Name: `Test User 2`
- Email: `testuser2@example.com`
- Platform: `google`

### Testing the OAuth Callback

You can manually test the OAuth callback by calling:

```bash
curl "http://localhost:3000/api/oauth/callback?code=test-auth-code-123&state=aHR0cDovL2xvY2FsaG9zdDozMDAwLw=="
```

Where `state` is base64-encoded redirect URI (e.g., `http://localhost:3000/`).

The application will:
1. Exchange the code for an access token (via mock OAuth server)
2. Retrieve user info using the access token
3. Create or update the user in the database
4. Create a session token
5. Set a session cookie
6. Redirect to the home page

### Verifying OAuth Integration

1. Check that the mock OAuth server is responding:
```bash
curl http://localhost:4000/health
```

2. Test token exchange directly:
```bash
curl -X POST http://localhost:4000/webdev.v1.WebDevAuthPublicService/ExchangeToken \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "test-client-id",
    "grantType": "authorization_code",
    "code": "test-code",
    "redirectUri": "http://localhost:3000/api/oauth/callback"
  }'
```

3. Test getting user info:
```bash
# First get a token (from step 2), then:
curl -X POST http://localhost:4000/webdev.v1.WebDevAuthPublicService/GetUserInfo \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "mock-access-token-1000"}'
```

## Environment Variables

The application is configured with the following test environment variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `development` | Node environment |
| `PORT` | `3000` | Application port |
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection string |
| `OAUTH_SERVER_URL` | `http://mock-oauth:4000` | Mock OAuth server URL |
| `OAUTH_CLIENT_ID` | `test-client-id` | OAuth client ID |
| `OAUTH_CLIENT_SECRET` | `test-client-secret` | OAuth client secret |
| `OAUTH_CALLBACK_URL` | `http://localhost:3000/api/oauth/callback` | OAuth callback URL |
| `VITE_APP_ID` | `ctea-test-app` | Application ID |
| `VITE_OAUTH_PORTAL_URL` | `http://localhost:3000/oauth/login` | OAuth portal URL |
| `COOKIE_SECRET` | `test-cookie-secret-...` | Cookie signing secret |
| `API_KEY` | `test-api-key-...` | API key for testing |

**⚠️ WARNING**: These are test values only. Never use these in production!

## Database Access

To access the PostgreSQL database directly:

```bash
docker compose exec postgres psql -U ctea_test_user -d ctea_test
```

Or connect using a database client:
- Host: `localhost`
- Port: `5432`
- Database: `ctea_test`
- Username: `ctea_test_user`
- Password: `ctea_test_password`

## Troubleshooting

### Service won't start

1. Check if ports are already in use:
```bash
lsof -i :3000  # Application port
lsof -i :4000  # Mock OAuth port
lsof -i :5432  # PostgreSQL port
```

2. Check service logs:
```bash
docker compose logs <service-name>
```

### Application can't connect to database

1. Ensure PostgreSQL is healthy:
```bash
docker compose ps postgres
```

2. Check database logs:
```bash
docker compose logs postgres
```

3. Verify database connection from app container:
```bash
docker compose exec app wget -O- http://postgres:5432 || echo "Cannot reach database"
```

### Mock OAuth server not responding

1. Check mock OAuth logs:
```bash
docker compose logs mock-oauth
```

2. Verify it's listening:
```bash
docker compose exec app wget -O- http://mock-oauth:4000/health
```

### Application build fails

1. Check if all dependencies are available:
```bash
docker compose build --no-cache app
```

2. Check Node version compatibility in `Dockerfile.test`

### Health checks failing

Health checks may take up to 40 seconds to pass on initial startup. Be patient!

```bash
# Watch service status
watch -n 2 'docker compose ps'
```

## Resetting the Environment

To completely reset the test environment:

```bash
# Stop all services and remove volumes
docker compose down -v

# Remove built images
docker compose rm -f

# Rebuild and restart
docker compose up -d --build
```

## Development Workflow

### Making Changes

1. Make changes to your code
2. Rebuild and restart:
```bash
docker compose up -d --build
```

### Live Development

For faster iteration, you can mount the source code as a volume:

1. Stop the current environment:
```bash
docker compose down
```

2. Edit `docker-compose.yml` to add volumes to the `app` service:
```yaml
app:
  volumes:
    - .:/app
    - /app/node_modules  # Prevent overwriting node_modules
```

3. Change the command to use dev mode:
```yaml
app:
  command: pnpm run dev
```

4. Restart:
```bash
docker compose up -d
```

## Files

This test environment consists of:

- `docker-compose.yml` - Docker Compose configuration
- `Dockerfile.test` - Dockerfile for CTEA application
- `mock-oauth-server.cjs` - Mock OAuth server implementation
- `RUNBOOK.md` - This documentation

## Security Notes

⚠️ **IMPORTANT**: This test environment:

- Uses hardcoded test credentials
- Has no security hardening
- Uses a mock OAuth server (not a real OAuth provider)
- Should NEVER be exposed to the internet
- Should NEVER be used in production

For production deployment, see `DEPLOYMENT_GUIDE.md` and use proper:
- Real OAuth provider
- Secure credentials
- Environment-specific configuration
- TLS/SSL certificates
- Firewall rules
- Monitoring and logging

## Support

For issues or questions about this test environment:

1. Check the troubleshooting section above
2. Review service logs: `docker compose logs`
3. Verify environment prerequisites
4. Check that no business code was modified

## Changelog

- **2026-01-14**: Initial version
  - Docker Compose configuration with 3 services
  - Mock OAuth server for testing
  - Comprehensive runbook documentation
