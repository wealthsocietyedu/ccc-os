// server/utils/xClient.js
// Creates a TwitterApi client from stored account credentials

const { TwitterApi } = require('twitter-api-v2');

/**
 * Build a TwitterApi client from an x_accounts row
 * @param {Object} account - row from x_accounts table
 * @returns {TwitterApi}
 */
function buildXClient(account) {
  return new TwitterApi({
    appKey: account.api_key,
    appSecret: account.api_secret,
    accessToken: account.access_token,
    accessSecret: account.access_secret,
  });
}

/**
 * Post a tweet from an account row
 * @param {Object} account - row from x_accounts table
 * @param {string} text - tweet text (max 280 chars)
 * @returns {Promise<{id: string, text: string}>}
 */
async function postTweet(account, text) {
  const client = buildXClient(account);
  const result = await client.v2.tweet(text);
  return result.data;
}

/**
 * Verify credentials are valid
 * @param {Object} account - row from x_accounts table
 * @returns {Promise<{valid: boolean, username?: string, error?: string}>}
 */
async function verifyCredentials(account) {
  try {
    const client = buildXClient(account);
    const me = await client.v1.verifyCredentials();
    return { valid: true, username: me.screen_name, name: me.name };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

module.exports = { buildXClient, postTweet, verifyCredentials };
