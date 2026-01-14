import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Load environment variables
const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const CALLBACK_URL = process.env.OAUTH_CALLBACK_URL;

if (!CLIENT_ID || !CLIENT_SECRET || !CALLBACK_URL) {
  throw new Error("Missing required environment variables for OAuth configuration.");
}

/**
 * OAuth callback handler
 * This route is hit by the OAuth provider after user authorization.
 */
router.get('/oauth/callback', (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code is missing from the query parameters.' });
  }

  // Perform token exchange
  fetch('https://oauth-provider.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: CALLBACK_URL,
    }),
  })
    .then(async (response) => {
      if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(`Token exchange failed: ${JSON.stringify(errorResponse)}`);
      }
      return response.json();
    })
    .then((tokenData) => {
      // Validate token and create session
      const { id_token, access_token } = tokenData;

      // Example: Decode JWT and extract user info
      const userInfo = jwt.decode(id_token);

      if (!userInfo) {
        throw new Error('Unable to decode user info from id_token');
      }

      // Respond with user info or initialize a session
      res.json({
        message: 'OAuth login successful!',
        user: userInfo,
        accessToken: access_token,
      });
    })
    .catch((error) => {
      console.error(error.message);
      res.status(500).json({ error: error.message });
    });
});

export default router;