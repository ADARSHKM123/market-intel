import logger from '../utils/logger.js';

const PH_API = 'https://www.producthunt.com/frontend/graphql';

/**
 * Fetch today's/recent Product Hunt posts via the public frontend GraphQL API.
 * No API key needed — this uses the same endpoint the PH website uses.
 */
async function fetchPosts(cursor, perPage = 20) {
  const query = `
    query HomePage($cursor: String) {
      homefeed(first: ${perPage}, after: $cursor) {
        edges {
          node {
            id
            name
            tagline
            description
            votesCount
            commentsCount
            createdAt
            url
            slug
            website
            topics {
              edges {
                node {
                  name
                  slug
                }
              }
            }
            makers {
              name
              username
            }
          }
        }
        pageInfo {
          endCursor
          hasNextPage
        }
      }
    }
  `;

  const res = await fetch(PH_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'MarketIntel/1.0',
    },
    body: JSON.stringify({ query, variables: { cursor } }),
  });

  if (!res.ok) {
    logger.warn({ status: res.status }, '[ProductHunt] API request failed');
    return { edges: [], pageInfo: { hasNextPage: false } };
  }

  const data = await res.json();
  return data?.data?.homefeed || { edges: [], pageInfo: { hasNextPage: false } };
}

/**
 * Main scraper entry point.
 * @param {object} source - Prisma Source record with config JSON
 * @returns {{ posts: object[], metadata: object }}
 */
export async function scrapeProductHunt(source) {
  const cfg = source.config || {};
  const maxPosts = cfg.maxPosts || 30;
  const pages = cfg.pages || 2;

  logger.info({ sourceId: source.id, maxPosts }, '[ProductHunt] Starting scrape');

  const allProducts = [];
  let cursor = null;

  for (let page = 0; page < pages; page++) {
    try {
      const result = await fetchPosts(cursor, Math.min(maxPosts, 20));
      const edges = result.edges || [];

      for (const edge of edges) {
        allProducts.push(edge.node);
      }

      if (!result.pageInfo?.hasNextPage) break;
      cursor = result.pageInfo.endCursor;
    } catch (err) {
      logger.warn({ page, err: err.message }, '[ProductHunt] Page fetch failed');
      break;
    }
  }

  // Filter by lastScrapedAt
  const filtered = source.lastScrapedAt
    ? allProducts.filter((p) => new Date(p.createdAt) > new Date(source.lastScrapedAt))
    : allProducts;

  const posts = filtered.slice(0, maxPosts).map((product) => {
    const topics = (product.topics?.edges || []).map((e) => e.node.name);
    const makers = (product.makers || []).map((m) => m.username).join(', ');

    return {
      externalId: String(product.id),
      title: `${product.name}: ${product.tagline}`,
      body: [
        product.description || product.tagline,
        topics.length ? `Topics: ${topics.join(', ')}` : '',
        makers ? `Makers: ${makers}` : '',
      ].filter(Boolean).join('\n\n'),
      author: makers || null,
      url: `https://www.producthunt.com/posts/${product.slug}`,
      metadata: {
        votes: product.votesCount || 0,
        comments: product.commentsCount || 0,
        topics,
        website: product.website,
      },
      publishedAt: new Date(product.createdAt),
    };
  });

  logger.info({ count: posts.length }, '[ProductHunt] Scrape complete');
  return { posts, metadata: { itemsFetched: posts.length, errors: 0 } };
}
