import { scrapeHackerNews } from './hackernews.scraper.js';
import { scrapeYouTube } from './youtube.scraper.js';
import { scrapeDevTo } from './devto.scraper.js';
import { scrapeGitHubTrending } from './github.scraper.js';
import { scrapeProductHunt } from './producthunt.scraper.js';

const scrapers = {
  hackernews: scrapeHackerNews,
  youtube: scrapeYouTube,
  devto: scrapeDevTo,
  github_trending: scrapeGitHubTrending,
  producthunt: scrapeProductHunt,
};

/**
 * Get the scraper function for a given source type.
 * @param {string} sourceType
 * @returns {Function|null}
 */
export function getScraper(sourceType) {
  return scrapers[sourceType] || null;
}

export const SUPPORTED_SOURCES = Object.keys(scrapers);
