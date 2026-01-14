const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 9000;

// Simple JWT creation (for testing only - not secure!)
function createMockJWT(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = Buffer.from('mock-signature').toString('base64url');
  return `${header}.${body}.${signature}`;
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check endpoint
  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'mock-oauth' }));
    return;
  }

  // OAuth token endpoint
  if (pathname === '/oauth/token' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      const params = new URLSearchParams(body);
      const code = params.get('code');
      const grantType = params.get('grant_type');

      console.log('[Mock OAuth] Token request:', { code, grantType });

      if (!code || grantType !== 'authorization_code') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'invalid_request',
          error_description: 'Missing code or invalid grant_type' 
        }));
        return;
      }

      // Generate mock tokens
      const idToken = createMockJWT({
        sub: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      });

      const accessToken = createMockJWT({
        sub: 'test-user-123',
        scope: 'openid email profile',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      });

      const response = {
        access_token: accessToken,
        id_token: idToken,
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh-token-' + Date.now(),
        scope: 'openid email profile'
      };

      console.log('[Mock OAuth] Returning tokens');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
    });
    return;
  }

  // OAuth authorization endpoint (for testing flow initiation)
  if (pathname === '/oauth/authorize' && req.method === 'GET') {
    const query = parsedUrl.query;
    const state = query.state || 'default-state';
    const redirectUri = query.redirect_uri;

    console.log('[Mock OAuth] Authorization request:', { state, redirectUri });

    if (!redirectUri) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<h1>Error: Missing redirect_uri</h1>');
      return;
    }

    // Simulate user consent and redirect back with authorization code
    const code = 'mock-auth-code-' + Date.now();
    const separator = redirectUri.includes('?') ? '&' : '?';
    const redirectUrl = `${redirectUri}${separator}code=${code}&state=${state}`;

    res.writeHead(302, { 'Location': redirectUrl });
    res.end();
    return;
  }

  // Manus OAuth endpoints (for compatibility)
  if (pathname === '/webdev.v1.WebDevAuthPublicService/ExchangeToken' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('[Mock Manus OAuth] ExchangeToken request:', data);

        const response = {
          accessToken: 'mock-manus-access-token-' + Date.now(),
          refreshToken: 'mock-manus-refresh-token',
          expiresIn: 3600
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  if (pathname === '/webdev.v1.WebDevAuthPublicService/GetUserInfo' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      const response = {
        openId: 'mock-user-openid-123',
        email: 'manus-test@example.com',
        name: 'Manus Test User',
        platform: 'email'
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
    });
    return;
  }

  // Default 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found', path: pathname }));
});

server.listen(PORT, () => {
  console.log(`Mock OAuth server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log(`  - GET  /health`);
  console.log(`  - GET  /oauth/authorize`);
  console.log(`  - POST /oauth/token`);
  console.log(`  - POST /webdev.v1.WebDevAuthPublicService/ExchangeToken`);
  console.log(`  - POST /webdev.v1.WebDevAuthPublicService/GetUserInfo`);
});
