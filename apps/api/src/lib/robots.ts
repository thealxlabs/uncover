/**
 * Robots.txt checker — fetches and parses robots.txt for a given host,
 * caching results for 24 hours to avoid redundant network calls.
 */

interface CachedRobots {
  rules: RobotsRule[];
  fetchedAt: number;
}

interface RobotsRule {
  userAgent: string;
  disallow: string[];
  allow: string[];
  crawlDelay?: number;
}

const cache = new Map<string, CachedRobots>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function fetchRobotsTxt(baseUrl: string): Promise<RobotsRule[]> {
  const cached = cache.get(baseUrl);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rules;
  }

  try {
    const response = await fetch(`${baseUrl}/robots.txt`, {
      headers: { "User-Agent": "Uncover/1.0" },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      // No robots.txt = everything allowed
      cache.set(baseUrl, { rules: [], fetchedAt: Date.now() });
      return [];
    }

    const text = await response.text();
    const rules = parseRobotsTxt(text);
    cache.set(baseUrl, { rules, fetchedAt: Date.now() });
    return rules;
  } catch {
    // Network error — assume allowed, don't cache
    return [];
  }
}

function parseRobotsTxt(text: string): RobotsRule[] {
  const rules: RobotsRule[] = [];
  let current: RobotsRule | null = null;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const directive = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();

    if (directive === "user-agent") {
      if (current) rules.push(current);
      current = { userAgent: value.toLowerCase(), disallow: [], allow: [] };
    } else if (current) {
      if (directive === "disallow" && value) {
        current.disallow.push(value);
      } else if (directive === "allow" && value) {
        current.allow.push(value);
      } else if (directive === "crawl-delay") {
        current.crawlDelay = parseFloat(value);
      }
    }
  }

  if (current) rules.push(current);
  return rules;
}

function matchesPath(pattern: string, path: string): boolean {
  // Convert robots.txt wildcard pattern to a simple match
  if (pattern.endsWith("$")) {
    return path === pattern.slice(0, -1);
  }
  if (pattern.includes("*")) {
    const parts = pattern.split("*");
    let pos = 0;
    for (const part of parts) {
      const idx = path.indexOf(part, pos);
      if (idx === -1) return false;
      pos = idx + part.length;
    }
    return true;
  }
  return path.startsWith(pattern);
}

/**
 * Returns true if the given path may be crawled by the given user agent.
 */
export async function checkRobotsAllowed(
  baseUrl: string,
  path: string,
  userAgent: string
): Promise<boolean> {
  const rules = await fetchRobotsTxt(baseUrl);
  if (rules.length === 0) return true;

  const agentToken = userAgent.split("/")[0].toLowerCase();

  // Find rules that apply: prefer specific agent match over wildcard
  const specificRules = rules.filter((r) => r.userAgent === agentToken);
  const wildcardRules = rules.filter((r) => r.userAgent === "*");
  const applicableRules = specificRules.length > 0 ? specificRules : wildcardRules;

  for (const rule of applicableRules) {
    // Check allow rules first (higher specificity wins in most implementations)
    for (const pattern of rule.allow) {
      if (matchesPath(pattern, path)) return true;
    }
    for (const pattern of rule.disallow) {
      if (matchesPath(pattern, path)) return false;
    }
  }

  return true; // No matching rule = allowed
}

/**
 * Returns the crawl delay (seconds) for the given user agent, or a default.
 */
export async function getCrawlDelay(
  baseUrl: string,
  userAgent: string,
  defaultDelayMs = 1000
): Promise<number> {
  const rules = await fetchRobotsTxt(baseUrl);
  const agentToken = userAgent.split("/")[0].toLowerCase();

  const match =
    rules.find((r) => r.userAgent === agentToken) ||
    rules.find((r) => r.userAgent === "*");

  if (match?.crawlDelay) {
    return match.crawlDelay * 1000;
  }
  return defaultDelayMs;
}
