/**
 * Custom URL scraper — fetches and extracts text content from any public URL.
 * Used for the "custom" source type, charged at 2 credits per search.
 */

import { checkRobotsAllowed } from "../lib/robots.js";
import { rateLimiter } from "../lib/rateLimiter.js";
import type { ScrapedPost } from "./scraper.js";

const USER_AGENT = "Uncover/1.0 (+https://uncover.thealxlabs.ca)";

// Domains that are blocked from custom scraping (social platforms with stricter ToS)
const BLOCKED_DOMAINS = new Set([
  "facebook.com", "instagram.com", "linkedin.com",
  "tiktok.com", "snapchat.com", "pinterest.com",
  "youtube.com", "netflix.com", "spotify.com",
]);

export interface CustomScrapeOptions {
  urls: string[];
  maxPagesPerUrl?: number; // default 1
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

function extractTextFromHtml(html: string): string {
  // Strip scripts, styles, nav, footer, header
  const cleaned = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.slice(0, 8000); // cap at 8k chars per page
}

export async function scrapeCustomUrls(
  urls: string[],
  options: CustomScrapeOptions = { urls: [] }
): Promise<ScrapedPost[]> {
  const posts: ScrapedPost[] = [];
  const maxPages = options.maxPagesPerUrl ?? 1;

  for (const rawUrl of urls.slice(0, 5)) { // max 5 URLs per search
    let url: string;
    try {
      const parsed = new URL(rawUrl);
      // Force HTTPS
      parsed.protocol = "https:";
      url = parsed.toString();
    } catch {
      console.warn(`[custom-scraper] Invalid URL: ${rawUrl}`);
      continue;
    }

    const domain = extractDomain(url);

    // Block restricted domains
    if (BLOCKED_DOMAINS.has(domain)) {
      console.warn(`[custom-scraper] Blocked domain: ${domain}`);
      continue;
    }

    // Check robots.txt
    const baseUrl = `https://${domain}`;
    try {
      const path = new URL(url).pathname;
      const allowed = await checkRobotsAllowed(baseUrl, path, USER_AGENT);
      if (!allowed) {
        console.warn(`[custom-scraper] robots.txt disallows: ${url}`);
        continue;
      }
    } catch {
      // If robots check fails, proceed cautiously
    }

    await rateLimiter.acquire("default");

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
      });
      clearTimeout(timer);

      if (!res.ok) {
        console.warn(`[custom-scraper] ${res.status} for ${url}`);
        continue;
      }

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
        console.warn(`[custom-scraper] Non-text content type: ${contentType}`);
        continue;
      }

      const html = await res.text();
      const text = extractTextFromHtml(html);

      if (text.length < 100) {
        console.warn(`[custom-scraper] Too little content from ${url}`);
        continue;
      }

      // Try to extract a title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch
        ? titleMatch[1].replace(/\s+/g, " ").trim().slice(0, 200)
        : domain;

      posts.push({
        title,
        text: text.slice(0, 3000),
        upvotes: 0,
        source: "reddit", // typed as reddit for compatibility — displayed as "web" in results
        url,
        timestamp: new Date().toISOString(),
        author: domain,
      });

      console.log(`[custom-scraper] Scraped ${url} — ${text.length} chars`);
    } catch (err) {
      console.error(`[custom-scraper] Error fetching ${url}:`, err);
    }
  }

  return posts;
}
