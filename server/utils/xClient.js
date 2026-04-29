// server/utils/xClient.js
// X API client — OAuth 1.0a helpers

const { TwitterApi } = require('twitter-api-v2');

const APP_KEY = process.env.X_API_KEY;
const APP_SECRET = process.env.X_API_SECRET;

/**
 * Build an app-level client (for OAuth flow only)
 */
function buildAppClient() {
  if (!APP_KEY || !APP_SECRET) {
    throw new Error('X_API_KEY and X_API_SECRET must be set in environment variables');
  }
  return new TwitterApi({ appKey: APP_KEY, appSecret: APP_SECRET });
}

/**
 * Build a user-level client from stored account credentials
 * @param {Object} account - row from x_accounts table
 */
function buildXClient(account) {
  if (!APP_KEY || !APP_SECRET) {
    throw new Error('X_API_KEY and X_API_SECRET must be set in environment variables');
  }
  return new TwitterApi({
    appKey: APP_KEY,
    appSecret: APP_SECRET,
    accessToken: account.access_token,
    accessSecret: account.access_secret,
  });
}

/**
 * Step 1 of OAuth flow — get request token and auth URL
 * @param {string} callbackUrl
 * @returns {Promise<{oauth_token: string, oauth_token_secret: string, url: string}>}
 */
async function getRequestToken(callbackUrl) {
  const client = buildAppClient();
  const authLink = await client.generateAuthLink(callbackUrl, { linkMode: 'authorize' });
  return {
    oauth_token: authLink.oauth_token,
    oauth_token_secret: authLink.oauth_token_secret,
    url: authLink.url,
  };
}

/**
 * Step 2 of OAuth flow — exchange verifier for access token
 * @param {string} oauthToken - from step 1
 * @param {string} oauthTokenSecret - from step 1
 * @param {string} oauthVerifier - from X callback
 * @returns {Promise<{accessToken: string, accessSecret: string, screenName: string, userId: string}>}
 */
async function getAccessToken(oauthToken, oauthTokenSecret, oauthVerifier) {
  const client = new TwitterApi({
    appKey: APP_KEY,
    appSecret: APP_SECRET,
    accessToken: oauthToken,
    accessSecret: oauthTokenSecret,
  });
  const { accessToken, accessSecret, screenName, userId } = await client.login(oauthVerifier);
  return { accessToken, accessSecret, screenName, userId };
}

/**
 * Post a tweet from stored account credentials
 * @param {Object} account - row from x_accounts table
 * @param {string} text
 */
async function postTweet(account, text) {
  const client = buildXClient(account);
  const result = await client.v2.tweet(text);
  return result.data;
}

/**
 * Verify stored credentials are still valid
 * @param {Object} account - row from x_accounts table
 */
async function verifyCredentials(account) {
  try {
    const client = buildXClient(account);
    const me = await client.v2.me();
    return { valid: true, username: me.data.username, name: me.data.name };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

module.exports = { buildAppClient, buildXClient, getRequestToken, getAccessToken, postTweet, verifyCredentials };
