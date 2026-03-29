import logger from '../utils/logger.js';

const GH_API = 'https://api.github.com';

/**
 * Search GitHub repositories created recently with high stars.
 * Uses the public search API (no auth needed, 10 req/min rate limit).
 */
async function searchRepos(query, sort = 'stars', perPage = 30) {
  // Look for repos created in the last 7 days
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const dateStr = since.toISOString().split('T')[0];

  const params = new URLSearchParams({
    q: `${query} created:>${dateStr}`,
    sort,
    order: 'desc',
    per_page: String(perPage),
  });

  const res = await fetch(`${GH_API}/search/repositories?${params}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'MarketIntel/1.0',
    },
  });

  if (!res.ok) {
    if (res.status === 403) {
      logger.warn('[GitHub] Rate limited');
      return [];
    }
    throw new Error(`GitHub API error: ${res.status}`);
  }

  const data = await res.json();
  return data.items || [];
}

/**
 * Search trending topics via GitHub search for recently active repos.
 */
async function searchTrendingByStars(language, minStars = 10, perPage = 30) {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const dateStr = since.toISOString().split('T')[0];

  const langFilter = language ? ` language:${language}` : '';
  const params = new URLSearchParams({
    q: `stars:>${minStars} created:>${dateStr}${langFilter}`,
    sort: 'stars',
    order: 'desc',
    per_page: String(perPage),
  });

  const res = await fetch(`${GH_API}/search/repositories?${params}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'MarketIntel/1.0',
    },
  });

  if (!res.ok) return [];

  const data = await res.json();
  return data.items || [];
}

/**
 * Main scraper entry point.
 * @param {object} source - Prisma Source record with config JSON
 * @returns {{ posts: object[], metadata: object }}
 */
export async function scrapeGitHubTrending(source) {
  const cfg = source.config || {};
  const keywords = cfg.keywords || ['saas', 'developer-tools', 'productivity'];
  const languages = cfg.languages || [null]; // null = all languages
  const minStars = cfg.minStars || 5;
  const perPage = cfg.perPage || 20;

  logger.info({ sourceId: source.id, keywords, languages }, '[GitHub] Starting scrape');

  const allRepos = [];

  // Search by keywords
  for (const keyword of keywords) {
    try {
      const repos = await searchRepos(keyword, 'stars', perPage);
      for (const repo of repos) {
        allRepos.push({ ...repo, _keyword: keyword });
      }
    } catch (err) {
      logger.warn({ keyword, err: err.message }, '[GitHub] Keyword search failed');
    }
  }

  // Search trending by language
  for (const lang of languages) {
    try {
      const repos = await searchTrendingByStars(lang, minStars, perPage);
      for (const repo of repos) {
        allRepos.push({ ...repo, _keyword: lang || 'trending' });
      }
    } catch (err) {
      logger.warn({ lang, err: err.message }, '[GitHub] Language search failed');
    }
  }

  // Deduplicate by repo ID
  const seen = new Set();
  const unique = allRepos.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  const posts = unique.map((repo) => ({
    externalId: String(repo.id),
    title: `${repo.full_name}: ${repo.description || 'No description'}`,
    body: [
      repo.description,
      repo.topics?.length ? `Topics: ${repo.topics.join(', ')}` : '',
      `Stars: ${repo.stargazers_count} | Forks: ${repo.forks_count} | Language: ${repo.language || 'N/A'}`,
    ].filter(Boolean).join('\n\n'),
    author: repo.owner?.login || null,
    url: repo.html_url,
    metadata: {
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      watchers: repo.watchers_count,
      language: repo.language,
      topics: repo.topics || [],
      openIssues: repo.open_issues_count,
      keyword: repo._keyword,
    },
    publishedAt: new Date(repo.created_at),
  }));

  logger.info({ count: posts.length }, '[GitHub] Scrape complete');
  return { posts, metadata: { itemsFetched: posts.length, errors: 0 } };
}
