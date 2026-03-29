import config from '../config/index.js';
import logger from '../utils/logger.js';

const YT_BASE = 'https://www.googleapis.com/youtube/v3';

/**
 * Search YouTube videos by keyword.
 * Cost: 100 quota units per call.
 */
async function searchVideos(keyword, maxResults, publishedAfter) {
  const params = new URLSearchParams({
    part: 'snippet',
    q: keyword,
    type: 'video',
    maxResults: String(Math.min(maxResults, 25)),
    order: 'date',
    relevanceLanguage: 'en',
    key: config.youtubeApiKey,
  });

  if (publishedAfter) {
    params.set('publishedAfter', new Date(publishedAfter).toISOString());
  }

  const res = await fetch(`${YT_BASE}/search?${params}`);
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 403) {
      logger.warn('[YouTube] Quota exceeded or forbidden');
      return [];
    }
    throw new Error(`YouTube search error ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.items || [];
}

/**
 * Fetch video statistics in bulk (up to 50 IDs).
 * Cost: 1 quota unit per call.
 */
async function fetchVideoStats(videoIds) {
  if (videoIds.length === 0) return {};

  const params = new URLSearchParams({
    part: 'statistics',
    id: videoIds.join(','),
    key: config.youtubeApiKey,
  });

  const res = await fetch(`${YT_BASE}/videos?${params}`);
  if (!res.ok) return {};

  const data = await res.json();
  const map = {};
  for (const item of data.items || []) {
    map[item.id] = item.statistics;
  }
  return map;
}

/**
 * Fetch top comments for a video.
 * Cost: 1 quota unit per call.
 */
async function fetchComments(videoId, maxResults = 10) {
  const params = new URLSearchParams({
    part: 'snippet',
    videoId,
    maxResults: String(maxResults),
    order: 'relevance',
    key: config.youtubeApiKey,
  });

  const res = await fetch(`${YT_BASE}/commentThreads?${params}`);
  if (!res.ok) return [];

  const data = await res.json();
  return (data.items || []).map(
    (item) => item.snippet.topLevelComment.snippet.textDisplay
  );
}

/**
 * Main scraper entry point.
 * @param {object} source - Prisma Source record with config JSON
 * @returns {{ posts: object[], metadata: object }}
 */
export async function scrapeYouTube(source) {
  const cfg = source.config || {};
  const keywords = cfg.keywords || ['saas review', 'startup tools'];
  const maxResults = cfg.maxResults || 10;
  const includeComments = cfg.includeComments !== false;

  if (!config.youtubeApiKey) {
    logger.warn('[YouTube] No API key configured, skipping');
    return { posts: [], metadata: { itemsFetched: 0, errors: 0, reason: 'no_api_key' } };
  }

  logger.info({ sourceId: source.id, keywords, maxResults }, '[YouTube] Starting scrape');

  let quotaUsed = 0;
  const allVideos = [];

  // Search for each keyword
  for (const keyword of keywords) {
    const results = await searchVideos(keyword, maxResults, source.lastScrapedAt);
    quotaUsed += 100;

    for (const item of results) {
      allVideos.push({
        videoId: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        channelTitle: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
        publishedAt: item.snippet.publishedAt,
        keyword,
      });
    }
  }

  // Deduplicate by videoId
  const seen = new Set();
  const uniqueVideos = allVideos.filter((v) => {
    if (seen.has(v.videoId)) return false;
    seen.add(v.videoId);
    return true;
  });

  // Fetch stats in bulk
  const videoIds = uniqueVideos.map((v) => v.videoId);
  const statsMap = await fetchVideoStats(videoIds);
  quotaUsed += 1;

  // Fetch comments for each video
  const posts = [];
  for (const video of uniqueVideos) {
    let commentText = '';
    if (includeComments) {
      try {
        const comments = await fetchComments(video.videoId, 5);
        quotaUsed += 1;
        commentText = comments
          .map((c) => c.replace(/<[^>]*>/g, ''))
          .join('\n');
      } catch {
        // Comments may be disabled - skip silently
      }
    }

    const stats = statsMap[video.videoId] || {};

    posts.push({
      externalId: video.videoId,
      title: video.title,
      body: [video.description, commentText].filter(Boolean).join('\n\n---\nComments:\n'),
      author: video.channelTitle || null,
      url: `https://youtube.com/watch?v=${video.videoId}`,
      metadata: {
        channelId: video.channelId,
        viewCount: parseInt(stats.viewCount || '0', 10),
        likeCount: parseInt(stats.likeCount || '0', 10),
        commentCount: parseInt(stats.commentCount || '0', 10),
        keyword: video.keyword,
      },
      publishedAt: new Date(video.publishedAt),
    });
  }

  logger.info({ count: posts.length, quotaUsed }, '[YouTube] Scrape complete');
  return { posts, metadata: { itemsFetched: posts.length, errors: 0, quotaUsed } };
}
