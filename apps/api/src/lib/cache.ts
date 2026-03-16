/**
 * In-memory result cache keyed by query + sources + limit hash.
 * TTL: 1 hour. Prevents charging credits for identical searches
 * run within a short window.
 *
 * Note: this is process-level cache — on Render free tier with
 * single instance this works fine. If you ever scale to multiple
 * instances, replace with Redis.
 */

import crypto from "crypto";
import type { AnalyzedResult } from "../services/analyzer.js";
import type { ScrapedPost } from "../services/scraper.js";

interface CacheEntry {
  posts: ScrapedPost[];
  analysis: AnalyzedResult;
  cachedAt: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 60 * 60 * 1000; // 1 hour

export function getCacheKey(
  query: string,
  sources: string[],
  limit: number,
  options?: object
): string {
  const payload = JSON.stringify({
    query: query.toLowerCase().trim(),
    sources: [...sources].sort(),
    limit,
    options: options ?? {},
  });
  return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

export function getCached(key: string): CacheEntry | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry;
}

export function setCached(key: string, posts: ScrapedPost[], analysis: AnalyzedResult): void {
  cache.set(key, { posts, analysis, cachedAt: Date.now() });
}

// Cleanup expired entries every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.cachedAt > TTL_MS) cache.delete(key);
  }
}, 30 * 60 * 1000);
