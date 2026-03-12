// Scraper service for extracting data from Reddit/X
// Uses Claude in Chrome for reliable browser automation

export interface ScrapedPost {
  title: string;
  text: string;
  upvotes: number;
  source: "reddit" | "twitter";
  url: string;
  timestamp: string;
}

export async function scrapeReddit(query: string, limit: number = 20): Promise<ScrapedPost[]> {
  // This will be called by the Claude in Chrome MCP
  // For now, return mock data structure
  // TODO: Implement actual scraping with Claude in Chrome

  console.log(`Scraping Reddit for: ${query} (limit: ${limit})`);

  // Mock data for testing - varies by query
  if (query.toLowerCase().includes("password")) {
    return [
      {
        title: "Password managers are too expensive for individual users",
        text: "I want a password manager but they all cost $20-30/year. That's too much for a student.",
        upvotes: 234,
        source: "reddit",
        url: "https://reddit.com/r/security/comments/example",
        timestamp: new Date().toISOString(),
      },
      {
        title: "Learning curve on Bitwarden is too steep",
        text: "Switched to Bitwarden and spent 2 hours just understanding how to set up shared collections.",
        upvotes: 156,
        source: "reddit",
        url: "https://reddit.com/r/privacy/comments/example2",
        timestamp: new Date().toISOString(),
      },
    ];
  }
  return [
    {
      title: `Discussing: ${query}`,
      text: `Users sharing problems and experiences with ${query}. This is test data for the MVP.`,
      upvotes: 120,
      source: "reddit",
      url: "https://reddit.com/r/example",
      timestamp: new Date().toISOString(),
    },
  ];
}

export async function scrapeTwitter(query: string, limit: number = 20): Promise<ScrapedPost[]> {
  // This will be called by the Claude in Chrome MCP
  // For now, return mock data structure
  // TODO: Implement actual scraping with Claude in Chrome

  console.log(`Scraping Twitter for: ${query} (limit: ${limit})`);

  // Mock data for testing
  return [
    {
      title: "Mobile password manager app crashes constantly",
      text: "@passwordmanager app keeps crashing on my iPhone. Been like this for a week.",
      upvotes: 89,
      source: "twitter",
      url: "https://twitter.com/user/status/example",
      timestamp: new Date().toISOString(),
    },
  ];
}

export async function scrapeMultipleSources(
  query: string,
  sources: ("reddit" | "twitter")[],
  limit: number = 20
): Promise<ScrapedPost[]> {
  const results: ScrapedPost[] = [];

  for (const source of sources) {
    try {
      let data: ScrapedPost[] = [];
      if (source === "reddit") {
        data = await scrapeReddit(query, limit);
      } else if (source === "twitter") {
        data = await scrapeTwitter(query, limit);
      }
      results.push(...data);
    } catch (error) {
      console.error(`Error scraping ${source}:`, error);
      // Continue with other sources
    }
  }

  return results;
}
