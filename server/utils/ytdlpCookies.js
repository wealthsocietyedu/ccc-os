const fs = require('fs');

// Returns ['--cookies', <path>] if YTDLP_COOKIES_FILE is set and points to a real file,
// otherwise []. Needed for age-restricted/login-gated YouTube videos and most Instagram
// posts, which yt-dlp refuses to fetch anonymously.
function cookieArgs() {
  const cookiesFile = process.env.YTDLP_COOKIES_FILE;
  if (cookiesFile && fs.existsSync(cookiesFile)) {
    return ['--cookies', cookiesFile];
  }
  return [];
}

module.exports = { cookieArgs };
