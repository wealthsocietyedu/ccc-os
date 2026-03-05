// server/scheduler/publish.js
// Platform publish functions built from official API documentation:
//   YouTube Data API v3: developers.google.com/youtube/v3/docs/videos/insert
//   Meta Graph API (Instagram + Facebook): developers.facebook.com/docs/graph-api

const axios = require('axios');
const FormData = require('form-data');
const { v4: uuid } = require('uuid');
const { getDB } = require('../db');

const GRAPH = 'https://graph.facebook.com/v21.0';
const GRAPH_VIDEO = 'https://graph-video.facebook.com/v21.0';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getFirstMedia(post) {
  try {
    const urls = JSON.parse(post.media_urls || '[]');
    return urls.length ? urls[0] : null;
  } catch { return null; }
}

function isVideoUrl(url) {
  return /\.(mp4|mov|avi|mkv|webm|m4v)/i.test(url.split('?')[0]);
}

// Poll fn() every `interval` ms until done or maxAttempts reached
async function poll(fn, { interval = 5000, maxAttempts = 24 } = {}) {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await fn();
    if (result.done) return result;
    await new Promise(r => setTimeout(r, interval));
  }
  throw new Error('Polling timed out');
}

// ─── YOUTUBE ──────────────────────────────────────────────────────────────────
// Ref: developers.google.com/youtube/v3/docs/videos/insert
// Upload type: resumable (POST metadata → get Location header → PUT binary)
// Required scope: https://www.googleapis.com/auth/youtube.upload
// Quota cost: 1600 units per upload (1500 for upload + 100 for insert)

async function publishToYouTube(conn, post) {
  const mediaUrl = getFirstMedia(post);

  if (!mediaUrl) {
    return { success: false, skipped: true, reason: 'YouTube requires a video file URL. Add a media URL to this post.' };
  }
  if (!isVideoUrl(mediaUrl)) {
    return { success: false, skipped: true, reason: 'YouTube requires a video file (.mp4, .mov, etc.).' };
  }

  // Step 1: Initiate resumable upload session.
  // POST to the upload endpoint with metadata. YouTube returns a session URI
  // in the Location response header — this is where the actual binary is sent.
  const initResp = await axios.post(
    'https://www.googleapis.com/upload/youtube/v3/videos',
    {
      snippet: {
        title: (post.title || 'New Video').slice(0, 100),
        description: post.caption || '',
        categoryId: '22',            // People & Blogs
        defaultLanguage: 'en',
        defaultAudioLanguage: 'en',
      },
      status: {
        privacyStatus: 'public',     // 'private' | 'unlisted' | 'public'
        selfDeclaredMadeForKids: false,
        embeddable: true,
      },
    },
    {
      params: {
        uploadType: 'resumable',
        part: 'snippet,status',
      },
      headers: {
        Authorization: `Bearer ${conn.access_token}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': 'video/*',
      },
    }
  );

  // The session URI is in the Location header — required for the binary upload
  const uploadUrl = initResp.headers.location;
  if (!uploadUrl) {
    throw new Error('YouTube did not return a resumable upload URI. Verify the OAuth token has the youtube.upload scope.');
  }

  // Step 2: Stream the video binary directly from the source URL to YouTube.
  // We proxy the stream so the video never lands on disk.
  const videoResp = await axios.get(mediaUrl, {
    responseType: 'stream',
    timeout: 300_000, // 5 min to start download
  });

  const contentType = videoResp.headers['content-type'] || 'video/mp4';
  const contentLength = videoResp.headers['content-length']; // may not always exist

  const uploadResp = await axios.put(uploadUrl, videoResp.data, {
    headers: {
      'Content-Type': contentType,
      ...(contentLength ? { 'Content-Length': contentLength } : {}),
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 600_000, // 10 min to complete upload
  });

  const videoId = uploadResp.data?.id;
  if (!videoId) throw new Error('YouTube upload completed but no video ID was returned.');

  console.log(`[YouTube] Published: https://www.youtube.com/watch?v=${videoId}`);
  return {
    success: true,
    platform_post_id: videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

// ─── INSTAGRAM ────────────────────────────────────────────────────────────────
// Ref: developers.facebook.com/docs/instagram-platform/instagram-graph-api/content-publishing
// API base: graph.facebook.com/v21.0 (NOT graph.instagram.com — that is the
//   Basic Display API which reached end-of-life on December 4, 2024)
// Flow: POST /{ig-user-id}/media → poll status_code → POST /{ig-user-id}/media_publish
// Required token: Instagram User Access Token with instagram_content_publish scope
// conn.handle must be the numeric IG user ID (set during OAuth)
// Rate limit: 25 API-published posts per 24-hour period

async function publishToInstagram(conn, post) {
  const mediaUrl = getFirstMedia(post);

  if (!mediaUrl) {
    return { success: false, skipped: true, reason: 'Instagram requires a media URL (image or video/Reel).' };
  }

  // conn.handle stores the numeric Instagram user ID, set during the OAuth callback
  const igUserId = conn.handle;
  if (!igUserId) throw new Error('Instagram user ID missing from connection. Reconnect the account to re-authorize.');

  const caption = (post.caption || post.title || '').slice(0, 2200);
  const isVideo = isVideoUrl(mediaUrl);

  // Step 1: Create a media container.
  // For Reels: media_type=REELS + video_url. share_to_feed=true posts to both
  // the Reels tab and the main feed. Video specs: H.264, 9:16 AR, 5–90s, 23–60fps.
  // For images: image_url only — media_type defaults to IMAGE, no field needed.
  const containerParams = { caption, access_token: conn.access_token };
  if (isVideo) {
    containerParams.media_type = 'REELS';
    containerParams.video_url = mediaUrl;
    containerParams.share_to_feed = 'true';
  } else {
    containerParams.image_url = mediaUrl;
  }

  const containerResp = await axios.post(`${GRAPH}/${igUserId}/media`, containerParams);
  const containerId = containerResp.data?.id;
  if (!containerId) throw new Error('Instagram did not return a media container ID.');

  // Step 2: Poll the container's status_code until FINISHED.
  // Videos require server-side processing; publishing before FINISHED returns 400.
  // Possible values: FINISHED | IN_PROGRESS | ERROR | EXPIRED
  if (isVideo) {
    await poll(async () => {
      const statusResp = await axios.get(`${GRAPH}/${containerId}`, {
        params: { fields: 'status_code', access_token: conn.access_token },
      });
      const code = statusResp.data?.status_code;
      if (code === 'FINISHED') return { done: true };
      if (code === 'ERROR')   throw new Error('Instagram video processing failed (ERROR status). Check video specs.');
      if (code === 'EXPIRED') throw new Error('Instagram media container expired before publishing.');
      return { done: false }; // IN_PROGRESS — keep waiting
    }, { interval: 5000, maxAttempts: 36 }); // up to 3 minutes
  }

  // Step 3: Publish the container. Returns the published media object ID.
  const publishResp = await axios.post(`${GRAPH}/${igUserId}/media_publish`, {
    creation_id: containerId,
    access_token: conn.access_token,
  });

  const mediaId = publishResp.data?.id;
  if (!mediaId) throw new Error('Instagram media_publish succeeded but returned no media ID.');

  console.log(`[Instagram] Published: ${mediaId}`);
  return { success: true, platform_post_id: mediaId };
}

// ─── FACEBOOK ─────────────────────────────────────────────────────────────────
// Ref: developers.facebook.com/docs/graph-api/video-uploads (chunked/resumable)
// Video upload endpoint: graph-video.facebook.com/v21.0/{page-id}/videos
// Three-phase chunked upload: start → transfer (loop) → finish
// conn.handle = Facebook Page ID
// conn.access_token = Page Access Token (not User token)
// Text-only posts use graph.facebook.com/{page-id}/feed with message param

async function publishToFacebook(conn, post) {
  const pageId = conn.handle;
  if (!pageId) throw new Error('Facebook Page ID missing from connection. Reconnect the account.');

  const mediaUrl = getFirstMedia(post);
  const isVideo = mediaUrl && isVideoUrl(mediaUrl);

  if (isVideo) {
    // ── Chunked video upload ──────────────────────────────────────────────
    // Must download the full video first to know file_size for the start phase.
    // graph-video.facebook.com is required for video uploads (not graph.facebook.com).
    const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB per chunk (max allowed: ~1 GB file)

    const videoResp = await axios.get(mediaUrl, { responseType: 'arraybuffer', timeout: 300_000 });
    const videoBuffer = Buffer.from(videoResp.data);
    const fileSize = videoBuffer.length;

    // Phase 1 — start: tell Facebook the file size, receive session ID + initial offsets + video ID
    const startForm = new FormData();
    startForm.append('upload_phase', 'start');
    startForm.append('file_size', fileSize);
    startForm.append('access_token', conn.access_token);

    const startResp = await axios.post(
      `${GRAPH_VIDEO}/${pageId}/videos`,
      startForm,
      { headers: startForm.getHeaders() }
    );

    const { upload_session_id, video_id } = startResp.data;
    let startOffset = parseInt(startResp.data.start_offset, 10);
    let endOffset   = parseInt(startResp.data.end_offset,   10);

    if (!upload_session_id) throw new Error('Facebook video upload: no session ID returned from start phase.');

    // Phase 2 — transfer: upload chunks until Facebook returns equal start/end offsets (done)
    while (startOffset < fileSize) {
      const chunk = videoBuffer.slice(startOffset, endOffset);

      const transferForm = new FormData();
      transferForm.append('upload_phase',    'transfer');
      transferForm.append('upload_session_id', upload_session_id);
      transferForm.append('start_offset',    startOffset);
      transferForm.append('video_file_chunk', chunk, { filename: 'chunk.mp4', contentType: 'application/octet-stream' });
      transferForm.append('access_token',    conn.access_token);

      const transferResp = await axios.post(
        `${GRAPH_VIDEO}/${pageId}/videos`,
        transferForm,
        { headers: transferForm.getHeaders(), maxBodyLength: Infinity }
      );

      startOffset = parseInt(transferResp.data.start_offset, 10);
      endOffset   = parseInt(transferResp.data.end_offset,   10);
    }

    // Phase 3 — finish: commit the upload with title/description, triggers Facebook processing
    const finishForm = new FormData();
    finishForm.append('upload_phase',    'finish');
    finishForm.append('upload_session_id', upload_session_id);
    finishForm.append('title',           (post.title || '').slice(0, 255));
    finishForm.append('description',     post.caption || post.title || '');
    finishForm.append('access_token',    conn.access_token);

    await axios.post(
      `${GRAPH_VIDEO}/${pageId}/videos`,
      finishForm,
      { headers: finishForm.getHeaders() }
    );

    console.log(`[Facebook] Published video: ${video_id}`);
    return { success: true, platform_post_id: video_id, url: `https://www.facebook.com/video/${video_id}` };

  } else {
    // ── Text / link post to Page feed ─────────────────────────────────────
    const feedParams = {
      message:      post.caption || post.title || '',
      access_token: conn.access_token,
    };
    // If an image URL is provided, include it as a link attachment
    if (mediaUrl) feedParams.link = mediaUrl;

    const feedResp = await axios.post(`${GRAPH}/${pageId}/feed`, feedParams);
    const postId = feedResp.data?.id;

    console.log(`[Facebook] Published feed post: ${postId}`);
    return { success: true, platform_post_id: postId };
  }
}

// ─── LINKEDIN ─────────────────────────────────────────────────────────────────
// Ref: learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/ugc-post-api
// conn.handle = author URN (e.g. urn:li:person:{id} or urn:li:organization:{id})
// Uses UGC Posts API v2 for text posts

async function publishToLinkedIn(conn, post) {
  const authorUrn = conn.handle; // urn:li:person:{id} or urn:li:organization:{id}
  if (!authorUrn) throw new Error('LinkedIn author URN missing. Reconnect the account.');

  const body = {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: (post.caption || post.title || '').slice(0, 3000) },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  };

  const response = await axios.post(
    'https://api.linkedin.com/v2/ugcPosts',
    body,
    {
      headers: {
        Authorization: `Bearer ${conn.access_token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
    }
  );

  // LinkedIn returns the post ID in the x-restli-id response header
  const platformPostId = response.headers['x-restli-id'] || response.data?.id || null;
  console.log(`[LinkedIn] Published UGC post: ${platformPostId}`);
  return { success: true, platform_post_id: platformPostId };
}

// ─── TIKTOK ───────────────────────────────────────────────────────────────────
// Ref: developers.tiktok.com/doc/content-posting-api-reference-direct-post
// Uses PULL_FROM_URL source — TikTok fetches the video itself (no binary upload)
// conn.handle = TikTok username/handle (for building the post URL)
// Required scope: video.publish

async function publishToTikTok(conn, post) {
  const mediaUrl = getFirstMedia(post);
  if (!mediaUrl || !isVideoUrl(mediaUrl)) {
    return { success: false, skipped: true, reason: 'TikTok requires a publicly accessible video URL (.mp4, .mov, etc.).' };
  }

  const caption = (post.caption || post.title || '').slice(0, 2200);

  // Initiate a direct post via URL pull — TikTok fetches the video from the URL
  const initResp = await axios.post(
    'https://open.tiktokapis.com/v2/post/publish/video/init/',
    {
      post_info: {
        title:                   caption,
        privacy_level:           'PUBLIC_TO_EVERYONE', // 'SELF_ONLY' | 'MUTUAL_FOLLOW_FRIENDS' | 'FOLLOWER_OF_CREATOR'
        disable_duet:            false,
        disable_stitch:          false,
        disable_comment:         false,
        video_cover_timestamp_ms: 1000,
      },
      source_info: {
        source:    'PULL_FROM_URL',
        video_url: mediaUrl,
      },
    },
    { headers: { Authorization: `Bearer ${conn.access_token}`, 'Content-Type': 'application/json' } }
  );

  const publishId = initResp.data?.data?.publish_id;
  if (!publishId) throw new Error('TikTok did not return a publish_id. Check the access token and video URL accessibility.');

  // Poll until TikTok finishes processing and publishing the video
  const statusResult = await poll(async () => {
    const statusResp = await axios.post(
      'https://open.tiktokapis.com/v2/post/publish/status/fetch/',
      { publish_id: publishId },
      { headers: { Authorization: `Bearer ${conn.access_token}`, 'Content-Type': 'application/json' } }
    );
    const status = statusResp.data?.data?.status;
    if (status === 'PUBLISH_COMPLETE') return { done: true, data: statusResp.data };
    if (status === 'FAILED') throw new Error(`TikTok publish failed: ${statusResp.data?.data?.fail_reason || 'unknown reason'}`);
    return { done: false }; // PROCESSING_UPLOAD | PROCESSING_DOWNLOAD — keep waiting
  }, { interval: 8000, maxAttempts: 30 }); // up to 4 minutes

  const postId = statusResult.data?.data?.publicaly_available_post_id?.[0] || publishId;
  console.log(`[TikTok] Published: ${publishId}`);
  return {
    success: true,
    platform_post_id: postId,
    url: `https://www.tiktok.com/@${conn.handle}/video/${postId}`,
  };
}

// ─── X / TWITTER ──────────────────────────────────────────────────────────────
// Ref: developer.twitter.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/post-tweets
// Video media upload: upload.twitter.com/1.1/media/upload.json (INIT/APPEND/FINALIZE)
// Text tweet: api.twitter.com/2/tweets
// conn.handle = Twitter @username (for building the tweet URL)

async function publishToTwitter(conn, post) {
  const text     = (post.caption || post.title || '').slice(0, 280);
  const mediaUrl = getFirstMedia(post);
  let mediaIds   = [];

  if (mediaUrl) {
    const mediaResp  = await axios.get(mediaUrl, { responseType: 'arraybuffer', timeout: 120_000 });
    const mediaBuffer = Buffer.from(mediaResp.data);
    const isVideo    = isVideoUrl(mediaUrl);
    const mimeType   = isVideo ? 'video/mp4' : (mediaUrl.match(/\.png/i) ? 'image/png' : 'image/jpeg');

    if (isVideo) {
      // Chunked upload for video: INIT → APPEND (loop) → FINALIZE → poll STATUS
      const CHUNK_SIZE  = 5 * 1024 * 1024; // 5 MB
      const totalBytes  = mediaBuffer.length;

      // INIT
      const initResp = await axios.post(
        'https://upload.twitter.com/1.1/media/upload.json',
        new URLSearchParams({ command: 'INIT', media_type: mimeType, total_bytes: totalBytes, media_category: 'tweet_video' }).toString(),
        { headers: { Authorization: `Bearer ${conn.access_token}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      const mediaId = initResp.data.media_id_string;

      // APPEND — upload in 5 MB chunks
      let segmentIndex = 0;
      for (let offset = 0; offset < totalBytes; offset += CHUNK_SIZE) {
        const chunk = mediaBuffer.slice(offset, offset + CHUNK_SIZE);
        const form  = new FormData();
        form.append('command',       'APPEND');
        form.append('media_id',      mediaId);
        form.append('segment_index', segmentIndex++);
        form.append('media',         chunk, { filename: 'video.mp4', contentType: mimeType });
        await axios.post('https://upload.twitter.com/1.1/media/upload.json', form, {
          headers: { Authorization: `Bearer ${conn.access_token}`, ...form.getHeaders() },
        });
      }

      // FINALIZE
      await axios.post(
        'https://upload.twitter.com/1.1/media/upload.json',
        new URLSearchParams({ command: 'FINALIZE', media_id: mediaId }).toString(),
        { headers: { Authorization: `Bearer ${conn.access_token}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      // Poll STATUS until processing completes
      await poll(async () => {
        const checkResp = await axios.get('https://upload.twitter.com/1.1/media/upload.json', {
          params:  { command: 'STATUS', media_id: mediaId },
          headers: { Authorization: `Bearer ${conn.access_token}` },
        });
        const state = checkResp.data?.processing_info?.state;
        if (state === 'succeeded') return { done: true };
        if (state === 'failed')    throw new Error('Twitter/X video processing failed.');
        return { done: false };
      }, { interval: 5000, maxAttempts: 24 });

      mediaIds = [mediaId];
    } else {
      // Simple image upload (single request, no chunking needed)
      const form = new FormData();
      form.append('media', mediaBuffer, { filename: 'image.jpg', contentType: mimeType });
      const uploadResp = await axios.post('https://upload.twitter.com/1.1/media/upload.json', form, {
        headers: { Authorization: `Bearer ${conn.access_token}`, ...form.getHeaders() },
      });
      mediaIds = [uploadResp.data.media_id_string];
    }
  }

  // Post the tweet
  const tweetBody = { text };
  if (mediaIds.length) tweetBody.media = { media_ids: mediaIds };

  const tweetResp = await axios.post(
    'https://api.twitter.com/2/tweets',
    tweetBody,
    { headers: { Authorization: `Bearer ${conn.access_token}`, 'Content-Type': 'application/json' } }
  );

  const tweetId  = tweetResp.data?.data?.id;
  const username = conn.handle?.replace('@', '');
  console.log(`[Twitter/X] Published tweet: ${tweetId}`);
  return {
    success: true,
    platform_post_id: tweetId,
    url: `https://twitter.com/${username}/status/${tweetId}`,
  };
}

// ─── THREADS ──────────────────────────────────────────────────────────────────
// Ref: developers.facebook.com/docs/threads/posts
// API base: graph.threads.net/v1.0
// Flow: POST /{threads-user-id}/threads → poll status → POST /{threads-user-id}/threads_publish
// conn.handle = numeric Threads user ID

async function publishToThreads(conn, post) {
  const THREADS = 'https://graph.threads.net/v1.0';
  const caption = (post.caption || post.title || '').slice(0, 500);
  const mediaUrl = getFirstMedia(post);

  const threadsUserId = conn.handle;
  if (!threadsUserId) throw new Error('Threads user ID missing from connection. Reconnect the account.');

  // Create media container
  const containerBody = { text: caption, access_token: conn.access_token };
  if (mediaUrl && isVideoUrl(mediaUrl)) {
    containerBody.media_type = 'VIDEO';
    containerBody.video_url  = mediaUrl;
  } else if (mediaUrl) {
    containerBody.media_type = 'IMAGE';
    containerBody.image_url  = mediaUrl;
  } else {
    containerBody.media_type = 'TEXT';
  }

  const containerResp = await axios.post(`${THREADS}/${threadsUserId}/threads`, containerBody);
  const creationId = containerResp.data?.id;
  if (!creationId) throw new Error('Threads did not return a container ID.');

  // Poll for processing completion (required for IMAGE and VIDEO containers)
  if (mediaUrl) {
    await poll(async () => {
      const statusResp = await axios.get(`${THREADS}/${creationId}`, {
        params: { fields: 'status', access_token: conn.access_token },
      });
      const status = statusResp.data?.status;
      if (status === 'FINISHED') return { done: true };
      if (status === 'ERROR')    throw new Error('Threads media processing failed.');
      return { done: false };
    }, { interval: 5000, maxAttempts: 24 });
  }

  // Publish the container
  const publishResp = await axios.post(`${THREADS}/${threadsUserId}/threads_publish`, {
    creation_id: creationId,
    access_token: conn.access_token,
  });

  const postId = publishResp.data?.id;
  console.log(`[Threads] Published: ${postId}`);
  return { success: true, platform_post_id: postId };
}

// ─── PINTEREST ────────────────────────────────────────────────────────────────
// Ref: developers.pinterest.com/docs/api/v5/pins-create
// conn.handle = Pinterest board ID (optionally set during OAuth; falls back to first board)

async function publishToPinterest(conn, post) {
  const PINTEREST = 'https://api.pinterest.com/v5';
  const mediaUrl   = getFirstMedia(post);
  const description = (post.caption || post.title || '').slice(0, 500);
  const title       = (post.title || '').slice(0, 100);

  if (!mediaUrl) {
    return { success: false, skipped: true, reason: 'Pinterest requires a media URL (image or video).' };
  }

  // Resolve target board: use stored board ID or fall back to the user's first board
  let boardId = conn.board_id || null;
  if (!boardId) {
    const boardsResp = await axios.get(`${PINTEREST}/boards`, {
      params:  { page_size: 1 },
      headers: { Authorization: `Bearer ${conn.access_token}` },
    });
    const board = boardsResp.data?.items?.[0];
    if (!board) {
      return { success: false, skipped: true, reason: 'No Pinterest boards found. Create a board first.' };
    }
    boardId = board.id;
  }

  const pinBody = {
    board_id:    boardId,
    title,
    description,
    link:        '',
    media_source: isVideoUrl(mediaUrl)
      ? { source_type: 'video_url', url: mediaUrl }
      : { source_type: 'image_url', url: mediaUrl },
  };

  const pinResp = await axios.post(`${PINTEREST}/pins`, pinBody, {
    headers: { Authorization: `Bearer ${conn.access_token}`, 'Content-Type': 'application/json' },
  });

  const pinId = pinResp.data?.id;
  console.log(`[Pinterest] Published pin: ${pinId}`);
  return { success: true, platform_post_id: pinId, url: `https://www.pinterest.com/pin/${pinId}/` };
}

// ─── PUBLISH LOG ──────────────────────────────────────────────────────────────

function writeLog(db, userId, brandId, postId, platform, status, platformPostId, errorMsg) {
  db.prepare(`
    INSERT INTO publish_log (id, user_id, brand_id, post_id, platform, status, platform_post_id, error_msg, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(uuid(), userId, brandId, postId, platform, status, platformPostId || null, errorMsg || null);
}

// ─── MAIN DISPATCHER ─────────────────────────────────────────────────────────

async function publishPost(post, userId) {
  const db           = getDB();
  const destinations = JSON.parse(post.destinations || '[]');
  const connections  = db.prepare(
    'SELECT * FROM platform_connections WHERE user_id = ? AND connected = 1'
  ).all(userId);

  const results  = [];
  let anySuccess = false;
  let anyFail    = false;

  for (const dest of destinations) {
    const conn = connections.find(c => c.platform === dest);
    if (!conn) {
      writeLog(db, userId, post.brand_id, post.id, dest, 'failed', null, 'Platform not connected');
      results.push({ platform: dest, success: false, error: 'Not connected' });
      anyFail = true;
      continue;
    }

    try {
      let result;
      switch (dest) {
        case 'youtube':   result = await publishToYouTube(conn, post);   break;
        case 'instagram': result = await publishToInstagram(conn, post); break;
        case 'linkedin':  result = await publishToLinkedIn(conn, post);  break;
        case 'facebook':  result = await publishToFacebook(conn, post);  break;
        case 'tiktok':    result = await publishToTikTok(conn, post);    break;
        case 'twitter':   result = await publishToTwitter(conn, post);   break;
        case 'threads':   result = await publishToThreads(conn, post);   break;
        case 'pinterest': result = await publishToPinterest(conn, post); break;
        default:
          result = { success: false, skipped: true, reason: `${dest} publishing not yet implemented` };
      }

      if (result.skipped) {
        writeLog(db, userId, post.brand_id, post.id, dest, 'skipped', null, result.reason);
        results.push({ platform: dest, ...result });
      } else {
        writeLog(db, userId, post.brand_id, post.id, dest, 'success', result.platform_post_id, null);
        results.push({ platform: dest, success: true, platform_post_id: result.platform_post_id, url: result.url });
        anySuccess = true;
      }
    } catch (err) {
      // Surface the most useful error message from API responses
      const errorMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Unknown error';
      console.error(`[Scheduler] ${dest} publish failed:`, errorMsg);
      writeLog(db, userId, post.brand_id, post.id, dest, 'failed', null, errorMsg);
      results.push({ platform: dest, success: false, error: errorMsg });
      anyFail = true;
    }
  }

  const allSkipped  = results.every(r => r.skipped);
  const finalStatus = allSkipped
    ? 'skipped'
    : (anyFail && !anySuccess) ? 'failed'
    : anyFail ? 'partial'
    : 'published';

  db.prepare(`
    UPDATE scheduled_posts SET status = ?, published_at = datetime('now'), updated_at = datetime('now') WHERE id = ?
  `).run(finalStatus, post.id);

  return { results, status: finalStatus };
}

module.exports = {
  publishPost,
  publishToYouTube,
  publishToInstagram,
  publishToLinkedIn,
  publishToFacebook,
  publishToTikTok,
  publishToTwitter,
  publishToThreads,
  publishToPinterest,
};
