# OAuth 2.0 Setup Guide

This guide explains how to configure and use the OAuth 2.0 Authorization Code Flow in the CTEA application.

## Overview

The application supports standard OAuth 2.0 authentication with OpenID Connect (OIDC) for user authentication. This allows integration with popular OAuth providers like Google, VK, Telegram, and other OIDC-compliant services.

## Architecture

### Components

1. **`server/_core/auth.ts`** - OAuth callback handler
   - Processes OAuth authorization callbacks
   - Exchanges authorization codes for tokens
   - Decodes and validates ID tokens
   - Extracts user information

2. **`server/_core/env.ts`** - Environment configuration
   - Validates required OAuth environment variables
   - Ensures proper configuration before startup

3. **Tests** - `server/_core/auth.test.ts`
   - Comprehensive integration tests
   - Covers all error scenarios and edge cases

### Flow Diagram

```
User → OAuth Provider → Authorization → Redirect with code
                                              ↓
                                    /oauth/callback endpoint
                                              ↓
                                    Exchange code for tokens
                                              ↓
                                    Decode and validate ID token
                                              ↓
                                    Extract user information
                                              ↓
                                    Create/update user session
                                              ↓
                                    Redirect to application
```

## Environment Variables

### Required Variables

The following environment variables must be set for OAuth to function:

| Variable              | Description                                          | Example                                         |
| --------------------- | ---------------------------------------------------- | ----------------------------------------------- |
| `OAUTH_CLIENT_ID`     | Client ID from your OAuth provider                   | `1234567890-abcdefg.apps.googleusercontent.com` |
| `OAUTH_CLIENT_SECRET` | Client secret from your OAuth provider               | `GOCSPX-abc123xyz`                              |
| `OAUTH_CALLBACK_URL`  | The callback URL registered with your OAuth provider | `https://your-domain.com/oauth/callback`        |
| `OAUTH_TOKEN_URL`     | Token endpoint of your OAuth provider                | `https://oauth2.googleapis.com/token`           |

### Optional Variables

These variables are used by the existing Manus OAuth system:

- `appId` - Manus application ID
- `oAuthServerUrl` - Manus OAuth server URL
- `cookieSecret` - Secret for signing session cookies
- `ownerOpenId` - OpenID of the system owner

## Configuration

### 1. Register Your Application

Register your application with your chosen OAuth provider:

#### Google OAuth 2.0

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Set application type to "Web application"
6. Add authorized redirect URI: `https://your-domain.com/oauth/callback`
7. Save the Client ID and Client Secret

#### VK OAuth

1. Go to [VK Developers](https://vk.com/dev)
2. Create a new application
3. Set redirect URI: `https://your-domain.com/oauth/callback`
4. Get your Application ID and Secure Key

#### Telegram Login

1. Create a bot via [@BotFather](https://t.me/BotFather)
2. Use `/setdomain` to set your domain
3. Get bot token and configure Telegram Login Widget

### 2. Set Environment Variables

Create a `.env` file or set environment variables:

```bash
# OAuth Configuration
OAUTH_CLIENT_ID=your_client_id_here
OAUTH_CLIENT_SECRET=your_client_secret_here
OAUTH_CALLBACK_URL=https://your-domain.com/oauth/callback
OAUTH_TOKEN_URL=https://oauth2.googleapis.com/token  # Or your provider's token endpoint
```

### 3. Configure OAuth Provider URLs

Different providers have different token endpoints:

```bash
# Google
OAUTH_TOKEN_URL=https://oauth2.googleapis.com/token

# VK
OAUTH_TOKEN_URL=https://oauth.vk.com/access_token

# Microsoft
OAUTH_TOKEN_URL=https://login.microsoftonline.com/common/oauth2/v2.0/token

# GitHub
OAUTH_TOKEN_URL=https://github.com/login/oauth/access_token
```

## Usage

### Initiating OAuth Flow

Direct users to your OAuth provider's authorization endpoint:

```
https://accounts.google.com/o/oauth2/v2/auth?
  client_id={OAUTH_CLIENT_ID}&
  redirect_uri={OAUTH_CALLBACK_URL}&
  response_type=code&
  scope=openid%20email%20profile&
  state={random_state_value}
```

### Parameters

- `client_id` - Your OAuth client ID
- `redirect_uri` - Must match `OAUTH_CALLBACK_URL`
- `response_type` - Must be `code` for Authorization Code Flow
- `scope` - Requested permissions (must include `openid` for OIDC)
- `state` - Random value for CSRF protection (recommended)

### Callback Processing

After user authorization, the OAuth provider redirects to your callback URL:

```
https://your-domain.com/oauth/callback?
  code=4/0AY0e-g5x_abc123&
  state=your_state_value
```

The `/oauth/callback` endpoint will:

1. Validate the `code` and `state` parameters
2. Exchange the code for access and ID tokens
3. Decode the ID token to extract user information
4. Create or update the user session
5. Redirect the user to the application

## API Reference

### POST /oauth/callback

Handles OAuth authorization callbacks.

#### Query Parameters

| Parameter | Type   | Required | Description                            |
| --------- | ------ | -------- | -------------------------------------- |
| `code`    | string | Yes      | Authorization code from OAuth provider |
| `state`   | string | Yes      | State parameter for CSRF protection    |

#### Response

**Success (302 Redirect)**

```
Location: /?oauth=success
```

**Error (400)**

```json
{
  "error": "Missing authorization code",
  "message": "The 'code' parameter is required"
}
```

**Error (500)**

```json
{
  "error": "OAuth callback failed",
  "message": "Token exchange failed: Invalid authorization code"
}
```

## Security Considerations

### Best Practices

1. **Always use HTTPS** - OAuth requires secure connections in production
2. **Validate state parameter** - Protects against CSRF attacks
3. **Store secrets securely** - Never commit secrets to version control
4. **Use short-lived tokens** - Implement token refresh if needed
5. **Validate ID tokens** - Always verify token signatures (future enhancement)

### Current Limitations

- ID token signature verification is not implemented (relies on HTTPS)
- Token refresh is not implemented
- Session management needs to be integrated (marked as TODO in code)

## Troubleshooting

### Common Issues

#### "OAuth not configured" Error

- **Cause**: Required environment variables are not set
- **Solution**: Verify all required environment variables are present

#### "Missing authorization code" Error

- **Cause**: OAuth provider didn't return a code
- **Solution**: Check OAuth provider configuration and redirect URI

#### "Token exchange failed" Error

- **Cause**: Invalid code, client credentials, or redirect URI mismatch
- **Solution**: Verify `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, and `OAUTH_CALLBACK_URL` match your provider's configuration

#### "Invalid ID token" Error

- **Cause**: Malformed or invalid ID token from provider
- **Solution**: Ensure your OAuth provider supports OpenID Connect and returns ID tokens

### Debug Mode

Enable debug logging by checking the server console output. All OAuth operations are logged with `[OAuth]` prefix.

## Testing

### Running Tests

```bash
npm test -- server/_core/auth.test.ts
```

### Test Coverage

The test suite includes:

- Environment variable validation
- Query parameter validation
- Token exchange success and failure cases
- ID token decoding and validation
- Error handling for various failure scenarios

## Integration with Existing OAuth System

This implementation works alongside the existing Manus OAuth system:

- **New OAuth Handler**: `/oauth/callback` - Standard OAuth 2.0/OIDC
- **Existing Manus Handler**: `/api/oauth/callback` - Manus-specific OAuth

Both systems can coexist. Choose the appropriate endpoint based on your authentication provider.

## Future Enhancements

- [ ] ID token signature verification using provider's public keys
- [ ] Token refresh implementation
- [ ] User session creation and management
- [ ] Support for additional OAuth flows (implicit, PKCE)
- [ ] Multi-provider support with dynamic configuration
- [ ] OAuth provider discovery via .well-known/openid-configuration

## References

- [OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749)
- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [VK OAuth Documentation](https://dev.vk.com/api/access-token/authcode-flow-user)

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review server logs for detailed error messages
3. Verify your OAuth provider configuration
4. Open an issue in the project repository
