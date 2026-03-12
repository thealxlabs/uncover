/**
 * Scraper service — real HTTP scraping for Reddit (JSON API), Twitter/X (Nitter), and HackerNews.
 * Respects robots.txt, crawl delays, and per-domain rate limits.
 */

import { checkRobotsAllowed, getCrawlDelay } from "../lib/robots.js";
import { rateLimiter } from "../lib/rateLimiter.js";

export interface ScrapedPost {
  title: string;
  text: string;
  upvotes: number;
  source: "reddit" | "twitter" | "hackernews";
  url: string;
  timestamp: string;
  subreddit?: string;
  author?: string;
}

export interface ScrapeOptions {
  /** Subreddits to exclude */
  excludeSubreddits?: string[];
  /** Keywords that if found in title/text will discard the post */
  excludeKeywords?: string[];
  /** Minimum upvote threshold */
  minUpvotes?: number;
  /** Only include posts newer than this many hours */
  maxAgeHours?: number;
}

const USER_AGENT = "Uncover/1.0 (+https://uncover.dev)";
const REDDIT_BASE = "https://www.reddit.com";

const DEFAULT_EXCLUDE_SUBREDDITS = new Set([
  "shitposting", "dankmemes", "memes", "funny", "gaming",
]);

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 12000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...options.headers },
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function scrapeReddit(query: string, limit = 20, options: ScrapeOptions = {}): Promise<ScrapedPost[]> {
  const { excludeSubreddits = [], excludeKeywords = [], minUpvotes = 0, maxAgeHours } = options;
  const blockedSubs = new Set([...DEFAULT_EXCLUDE_SUBREDDITS, ...excludeSubreddits.map(s => s.toLowerCase())]);
  const blockedKw = excludeKeywords.map(k => k.toLowerCase());

  const allowed = await checkRobotsAllowed(REDDIT_BASE, "/search.json", USER_AGENT);
  if (!allowed) { console.warn("[scraper] Reddit robots.txt blocks search — skipping"); return []; }

  await rateLimiter.acquire("reddit");

  const params = new URLSearchParams({
    q: query, sort: "relevance", t: "year",
    limit: String(Math.min(limit * 3, 100)), type: "link",
  });

  try {
    const response = await fetchWithTimeout(`${REDDIT_BASE}/search.json?${params}`);
    if (!response.ok) { console.error(`[scraper] Reddit ${response.status}`); return []; }

    const json: any = await response.json();
    const children: any[] = json?.data?.children ?? [];
    const posts: ScrapedPost[] = [];
    const cutoff = maxAgeHours ? Date.now() / 1000 - maxAgeHours * 3600 : 0;

    for (const child of children) {
      if (posts.length >= limit) break;
      const d = child.data;
      if (!d) continue;
      if (blockedSubs.has((d.subreddit ?? "").toLowerCase())) continue;
      if (maxAgeHours && d.created_utc < cutoff) continue;
      if ((d.ups ?? 0) < minUpvotes) continue;
      const fullText = `${d.title ?? ""} ${d.selftext ?? ""}`.toLowerCase();
      if (blockedKw.some(kw => fullText.includes(kw))) continue;
      const bodyText = (d.selftext ?? "").trim();
      if (bodyText.length < 10 && !d.title) continue;

      posts.push({
        title: d.title ?? "",
        text: bodyText.slice(0, 2000),
        upvotes: d.ups ?? 0,
        source: "reddit",
        url: `https://reddit.com${d.permalink}`,
        timestamp: new Date((d.created_utc ?? 0) * 1000).toISOString(),
        subreddit: d.subreddit,
        author: d.author,
      });
    }

    console.log(`[scraper] Reddit: ${posts.length} posts for "${query}"`);
    return posts;
  } catch (err) {
    console.error("[scraper] Reddit fetch error:", err);
    return [];
  }
}

const NITTER_INSTANCES = [
  "https://nitter.net",
  "https://nitter.it",
  "https://nitter.poast.org",
];

export async function scrapeTwitter(query: string, limit = 20, options: ScrapeOptions = {}): Promise<ScrapedPost[]> {
  const { excludeKeywords = [], minUpvotes = 0 } = options;
  const blockedKw = excludeKeywords.map(k => k.toLowerCase());

  for (const instance of NITTER_INSTANCES) {
    try {
      await rateLimiter.acquire("twitter");
      const allowed = await checkRobotsAllowed(instance, "/search", USER_AGENT);
      if (!allowed) continue;

      const params = new URLSearchParams({ q: `${query} -filter:retweets lang:en`, f: "tweets" });
      const response = await fetchWithTimeout(`${instance}/search?${params}`, { headers: { Accept: "text/html" } }, 10000);
      if (!response.ok) continue;

      const html = await response.text();
      const posts = parseNitterHtml(html, instance, blockedKw, minUpvotes, options.maxAgeHours);
      if (posts.length > 0) {
        console.log(`[scraper] Twitter: ${posts.length} tweets via ${instance}`);
        return posts.slice(0, limit);
      }
    } catch { continue; }
  }

  console.warn("[scraper] All Nitter instances failed");
  return [];
}

function parseNitterHtml(html: string, instance: string, blockedKw: string[], minUpvotes: number, maxAgeHours?: number): ScrapedPost[] {
  const posts: ScrapedPost[] = [];
  const tweetBlocks = html.match(/<div class="tweet-content[^>]*>([\s\S]*?)<\/div>/gi) ?? [];

  tweetBlocks.forEach((block) => {
    const text = block.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
    if (text.length < 20) return;
    if (blockedKw.some(kw => text.toLowerCase().includes(kw))) return;

    posts.push({
      title: text.slice(0, 120),
      text,
      upvotes: 0,
      source: "twitter",
      url: instance,
      timestamp: new Date().toISOString(),
    });
  });

  return posts;
}

export async function scrapeHackerNews(query: string, limit = 20, options: ScrapeOptions = {}): Promise<ScrapedPost[]> {
  const { excludeKeywords = [], minUpvotes = 0 } = options;
  const blockedKw = excludeKeywords.map(k => k.toLowerCase());

  await rateLimiter.acquire("hackernews");

  const params = new URLSearchParams({ query, tags: "story", numericFilters: `points>=${minUpvotes}`, hitsPerPage: String(limit) });

  try {
    const response = await fetchWithTimeout(`https://hn.algolia.com/api/v1/search?${params}`);
    if (!response.ok) return [];
    const json: any = await response.json();

    return (json?.hits ?? [])
      .filter((h: any) => !blockedKw.some(kw => `${h.title ?? ""} ${h.story_text ?? ""}`.toLowerCase().includes(kw)))
      .map((h: any) => ({
        title: h.title ?? "",
        text: (h.story_text ?? "").slice(0, 2000),
        upvotes: h.points ?? 0,
        source: "hackernews" as const,
        url: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
        timestamp: h.created_at ?? new Date().toISOString(),
        author: h.author,
      }));
  } catch (err) {
    console.error("[scraper] HackerNews error:", err);
    return [];
  }
}

export type Source = "reddit" | "twitter" | "hackernews";

export async function scrapeMultipleSources(
  query: string,
  sources: Source[],
  limit = 20,
  options: ScrapeOptions = {}
): Promise<ScrapedPost[]> {
  const perSource = Math.ceil(limit / sources.length);
  const results: ScrapedPost[] = [];

  await Promise.allSettled(sources.map(async (source) => {
    try {
      let data: ScrapedPost[] = [];
      if (source === "reddit") data = await scrapeReddit(query, perSource, options);
      else if (source === "twitter") data = await scrapeTwitter(query, perSource, options);
      else if (source === "hackernews") data = await scrapeHackerNews(query, perSource, options);
      results.push(...data);
    } catch (err) {
      console.error(`[scraper] Error scraping ${source}:`, err);
    }
  }));

  results.sort((a, b) => b.upvotes - a.upvotes);
  return results.slice(0, limit);
}
