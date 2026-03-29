import logger from '../utils/logger.js';

const DEVTO_API = 'https://dev.to/api';

/**
 * Fetch articles from Dev.to by tag or keyword.
 */
async function fetchArticles(tag, perPage = 30, page = 1) {
  const params = new URLSearchParams({
    tag,
    per_page: String(perPage),
    page: String(page),
    state: 'rising',
  });

  const res = await fetch(`${DEVTO_API}/articles?${params}`, {
    headers: { 'User-Agent': 'MarketIntel/1.0' },
  });

  if (!res.ok) {
    logger.warn({ tag, status: res.status }, '[DevTo] API request failed');
    return [];
  }

  return res.json();
}

/**
 * Fetch comments for an article.
 */
async function fetchComments(articleId, limit = 5) {
  try {
    const res = await fetch(`${DEVTO_API}/comments?a_id=${articleId}&per_page=${limit}`, {
      headers: { 'User-Agent': 'MarketIntel/1.0' },
    });
    if (!res.ok) return [];
    const comments = await res.json();
    return comments
      .map((c) => c.body_html?.replace(/<[^>]*>/g, '') || '')
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Main scraper entry point.
 * @param {object} source - Prisma Source record with config JSON
 * @returns {{ posts: object[], metadata: object }}
 */
export async function scrapeDevTo(source) {
  const cfg = source.config || {};
  const tags = cfg.tags || ['saas', 'startup', 'productivity'];
  const perPage = cfg.perPage || 20;
  const includeComments = cfg.includeComments !== false;

  logger.info({ sourceId: source.id, tags, perPage }, '[DevTo] Starting scrape');

  const allArticles = [];

  for (const tag of tags) {
    try {
      const articles = await fetchArticles(tag, perPage);
      for (const article of articles) {
        allArticles.push({ ...article, _tag: tag });
      }
    } catch (err) {
      logger.warn({ tag, err: err.message }, '[DevTo] Failed to fetch tag');
    }
  }

  // Deduplicate by article ID
  const seen = new Set();
  const unique = allArticles.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });

  // Filter by lastScrapedAt if set
  const filtered = source.lastScrapedAt
    ? unique.filter((a) => new Date(a.published_at) > new Date(source.lastScrapedAt))
    : unique;

  const posts = [];

  for (const article of filtered) {
    let commentText = '';
    if (includeComments) {
      const comments = await fetchComments(article.id, 3);
      commentText = comments.join('\n\n');
    }

    posts.push({
      externalId: String(article.id),
      title: article.title,
      body: [article.description, commentText].filter(Boolean).join('\n\n---\nComments:\n'),
      author: article.user?.username || null,
      url: article.url,
      metadata: {
        reactions: article.public_reactions_count || 0,
        comments: article.comments_count || 0,
        readingTime: article.reading_time_minutes || 0,
        tags: article.tag_list || [],
        tag: article._tag,
      },
      publishedAt: new Date(article.published_at),
    });
  }

  logger.info({ count: posts.length }, '[DevTo] Scrape complete');
  return { posts, metadata: { itemsFetched: posts.length, errors: 0 } };
}
