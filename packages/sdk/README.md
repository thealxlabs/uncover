# @uncover/sdk

JavaScript/TypeScript SDK for the [Uncover API](https://uncover.dev). Surface real problems people talk about on Reddit, X, and HackerNews — analyzed by AI.

## Installation

```bash
npm install @uncover/sdk
```

## Quick Start

```typescript
import { Uncover } from "@uncover/sdk";

const uncover = new Uncover("sk_live_your_api_key");

const result = await uncover.search({
  query: "password manager frustrations",
  sources: ["reddit", "hackernews"],
  limit: 20,
});

console.log(result.summary);
// "Most users struggle with pricing, mobile app crashes, and steep setup..."

console.log(result.problems);
// [
//   { text: "Too expensive for personal use", frequency: 8, sentiment: "frustrated" },
//   { text: "Mobile app crashes constantly",  frequency: 7, sentiment: "frustrated" },
//   { text: "Import from browser is broken",  frequency: 5, sentiment: "disappointed" },
// ]

console.log(result.trends);
// ["pricing", "mobile", "browser extension", "support"]
```

## Get an API Key

```bash
curl -X POST https://api.uncover.dev/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"yourpassword"}'
```

Returns `{ apiKey: { key: "sk_live_..." } }`. Save it — it's only shown once.

Or sign up at [uncover.thealxlabs.ca](https://uncover.thealxlabs.ca).

## API Reference

### `new Uncover(apiKey, baseUrl?)`

```typescript
const uncover = new Uncover("sk_live_...");

// Custom base URL (e.g. self-hosted)
const uncover = new Uncover("sk_live_...", "https://your-api.com");
```

---

### `uncover.search(request)`

Run a search. Deducts 1 credit.

```typescript
const result = await uncover.search({
  query: "CRM software problems",         // required
  sources: ["reddit", "hackernews"],      // required — "reddit" | "twitter" | "hackernews"
  limit: 20,                              // optional, 1–50, default 20
  options: {
    excludeSubreddits: ["memes", "AskReddit"],  // filter out subreddits
    excludeKeywords:   ["sponsored", "ad"],     // filter out posts with these words
    minUpvotes:        10,                       // only include posts with 10+ upvotes
    maxAgeHours:       720,                      // only posts from last 30 days
  },
});
```

**Response:**

```typescript
{
  requestId:     string;
  status:        "completed" | "failed";
  query:         string;
  sources:       string[];
  postsAnalyzed: number;
  summary:       string;       // 2-3 sentence AI summary
  problems: [
    {
      text:      string;       // description of the problem
      frequency: number;       // 1–10, how often it appears
      sentiment: string;       // "frustrated" | "confused" | "disappointed" | "neutral"
    }
  ];
  trends:  string[];           // recurring themes
  cost:    number;             // $ cost of this search
  credits: { remaining: number };
}
```

---

### `uncover.getSearchStatus(requestId)`

Retrieve a previous search by ID.

```typescript
const result = await uncover.getSearchStatus("req_abc123");
```

---

### `uncover.waitForSearch(requestId, timeoutMs?, pollIntervalMs?)`

Poll until a search completes. Useful if you process searches asynchronously.

```typescript
const result = await uncover.waitForSearch(
  "req_abc123",
  30000,  // timeout after 30s (default)
  1000    // poll every 1s (default)
);
```

---

## Examples

### Find problems for product research

```typescript
import { Uncover } from "@uncover/sdk";

const uncover = new Uncover(process.env.UNCOVER_API_KEY!);

async function researchTopic(topic: string) {
  const result = await uncover.search({
    query: `${topic} problems complaints`,
    sources: ["reddit", "hackernews"],
    limit: 30,
    options: {
      minUpvotes: 5,
      maxAgeHours: 2160, // last 90 days
    },
  });

  return {
    summary: result.summary,
    topProblems: result.problems
      ?.sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5),
    themes: result.trends,
  };
}

const research = await researchTopic("project management software");
console.log(research);
```

### Filter noise aggressively

```typescript
const result = await uncover.search({
  query: "Notion productivity complaints",
  sources: ["reddit"],
  options: {
    excludeSubreddits: ["memes", "funny", "AskReddit", "teenagers"],
    excludeKeywords:   ["sponsored", "affiliate", "promo", "discount"],
    minUpvotes:        20,
    maxAgeHours:       720,
  },
});
```

### Use with multiple sources

```typescript
const result = await uncover.search({
  query: "Figma designer frustrations",
  sources: ["reddit", "twitter", "hackernews"],
  limit: 50,
});
```

---

## Error Handling

```typescript
try {
  const result = await uncover.search({ query: "...", sources: ["reddit"] });
} catch (err) {
  if (err.message.includes("Insufficient credits")) {
    // User needs to top up — redirect to billing
    console.log("Buy more credits at https://uncover.dev/dashboard");
  } else {
    console.error("Search failed:", err.message);
  }
}
```

---

## CLI

Prefer the command line? Install the CLI instead:

```bash
npm install -g @uncover/cli

uncover login
uncover scrape "password manager frustrations" --sources reddit,hackernews
uncover status
```

---

## Pricing

| Pack | Searches | Price |
|------|----------|-------|
| Starter | 50 | $5 |
| Growth | 200 | $15 |
| Pro | 500 | $29 |
| Scale | 2,000 | $79 |

Or subscribe for a monthly credit allowance (Builder $19/mo, Team $49/mo, Enterprise $149/mo).

Credits never expire. Subscribers can top up with PAYG packs.

---

## TypeScript

Fully typed. All request and response types are exported:

```typescript
import type {
  SearchRequest,
  SearchResponse,
  Problem,
  Source,
} from "@uncover/sdk";
```

---

## License

MIT
