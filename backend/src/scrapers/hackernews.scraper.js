import logger from '../utils/logger.js';

const HN_API = 'https://hacker-news.firebaseio.com/v0';
const HN_ALGOLIA = 'https://hn.algolia.com/api/v1';

/**
 * Fetch a single HN item by ID.
 */
async function fetchItem(id) {
  const res = await fetch(`${HN_API}/item/${id}.json`);
  if (!res.ok) return null;
  return res.json();
}

/**
 * Fetch top-level comments (kids) for a story, up to `limit`.
 */
async function fetchComments(story, limit = 5) {
  if (!story.kids || story.kids.length === 0) return '';

  const ids = story.kids.slice(0, limit);
  const comments = await Promise.all(ids.map(fetchItem));
  return comments
    .filter((c) => c && c.text)
    .map((c) => c.text.replace(/<[^>]*>/g, ''))
    .join('\n\n');
}

/**
 * Scrape HN using Algolia search (keyword-based).
 */
async function scrapeBySearch(keywords, limit, lastScrapedAt) {
  const posts = [];

  for (const keyword of keywords) {
    const params = new URLSearchParams({
      query: keyword,
      tags: 'story',
      hitsPerPage: String(Math.min(limit, 50)),
    });

    if (lastScrapedAt) {
      params.set('numericFilters', `created_at_i>${Math.floor(new Date(lastScrapedAt).getTime() / 1000)}`);
    }

    const res = await fetch(`${HN_ALGOLIA}/search?${params}`);
    if (!res.ok) {
      logger.warn({ keyword, status: res.status }, '[HN] Algolia search failed');
      continue;
    }

    const data = await res.json();
    for (const hit of data.hits) {
      posts.push({
        externalId: String(hit.objectID),
        title: hit.title || '',
        body: hit.story_text || hit.url || '',
        author: hit.author || null,
        url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
        metadata: {
          score: hit.points,
          comments: hit.num_comments,
          tags: hit._tags,
          keyword,
        },
        publishedAt: new Date(hit.created_at),
      });
    }
  }

  return posts;
}

/**
 * Scrape HN top/new stories (general, no keyword).
 */
async function scrapeByStoryType(storyType, limit) {
  const endpoint = storyType === 'new' ? 'newstories' : 'topstories';
  const res = await fetch(`${HN_API}/${endpoint}.json`);
  if (!res.ok) throw new Error(`HN API error: ${res.status}`);

  const ids = (await res.json()).slice(0, limit);
  const posts = [];

  // Batch fetch in groups of 10
  for (let i = 0; i < ids.length; i += 10) {
    const batch = ids.slice(i, i + 10);
    const items = await Promise.all(batch.map(fetchItem));

    for (const item of items) {
      if (!item || item.type !== 'story') continue;

      const commentText = await fetchComments(item, 3);

      posts.push({
        externalId: String(item.id),
        title: item.title || '',
        body: [item.text, commentText].filter(Boolean).join('\n\n').replace(/<[^>]*>/g, '') || '',
        author: item.by || null,
        url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
        metadata: {
          score: item.score,
          comments: item.descendants || 0,
          type: item.type,
        },
        publishedAt: new Date(item.time * 1000),
      });
    }
  }

  return posts;
}

/**
 * Main scraper entry point.
 * @param {object} source - Prisma Source record with config JSON
 * @returns {{ posts: object[], metadata: object }}
 */
export async function scrapeHackerNews(source) {
  const config = source.config || {};
  const limit = config.limit || 30;
  const storyType = config.storyType || 'search';
  const keywords = config.keywords || ['startup', 'saas'];

  logger.info({ sourceId: source.id, storyType, limit }, '[HN] Starting scrape');

  let posts;
  if (storyType === 'search' && keywords.length > 0) {
    posts = await scrapeBySearch(keywords, limit, source.lastScrapedAt);
  } else {
    posts = await scrapeByStoryType(storyType, limit);
  }

  // Deduplicate by externalId within this batch
  const seen = new Set();
  const unique = posts.filter((p) => {
    if (seen.has(p.externalId)) return false;
    seen.add(p.externalId);
    return true;
  });

  logger.info({ count: unique.length }, '[HN] Scrape complete');
  return { posts: unique, metadata: { itemsFetched: unique.length, errors: 0 } };
}
