# @uncover/cli

Command-line interface for [Uncover](https://uncover.thealxlabs.ca) — surface real problems from Reddit, X, and HackerNews, analyzed by AI.

## Installation

```bash
npm install -g @uncover/cli
```

## Setup

```bash
uncover login
```

You'll be prompted for your API key. Get one at [uncover.thealxlabs.ca](https://uncover.thealxlabs.ca) or via the API:

```bash
curl -X POST https://api.uncover.thealxlabs.ca/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"yourpassword"}'
```

Or pass a key directly:

```bash
uncover login --key sk_live_your_api_key
```

---

## Commands

### `uncover scrape <query>`

Run a search and print results.

```bash
uncover scrape "password manager frustrations"
```

```bash
# Specify sources
uncover scrape "CRM software problems" --sources reddit,hackernews

# Set result limit
uncover scrape "Figma complaints" --limit 30

# Filter noise
uncover scrape "Notion issues" \
  --exclude-subreddits memes,AskReddit \
  --exclude-keywords sponsored,ad \
  --min-upvotes 10 \
  --max-age 720

# Output raw JSON (pipe-friendly)
uncover scrape "project management" --json
```

**Flags:**

| Flag | Description | Default |
|------|-------------|---------|
| `--sources` | Comma-separated: `reddit`, `twitter`, `hackernews` | `reddit` |
| `--limit` | Number of posts to analyze (1–50) | `20` |
| `--exclude-subreddits` | Comma-separated subreddits to skip | — |
| `--exclude-keywords` | Comma-separated keywords to filter out | — |
| `--min-upvotes` | Only include posts with this many upvotes | `0` |
| `--max-age` | Only include posts from last N hours | — |
| `--json` | Output raw JSON instead of formatted output | `false` |

---

### `uncover status`

Show your current credit balance and plan.

```bash
uncover status
```

```
Plan:     payg
Credits:  142 remaining
Spent:    $15.00 total
```

---

### `uncover history`

Show your recent searches.

```bash
uncover history
uncover history --limit 20
```

---

### `uncover keys`

List your API keys.

```bash
uncover keys
```

---

### `uncover login`

Save your API key locally.

```bash
uncover login
uncover login --key sk_live_...
```

---

### `uncover logout`

Remove your saved API key.

```bash
uncover logout
```

---

## Examples

### Quick product research

```bash
uncover scrape "monday.com frustrations" --sources reddit,hackernews --limit 30
```

### Pipe JSON into jq

```bash
uncover scrape "Slack problems" --json | jq '.problems[:3]'
```

### Use in a shell script

```bash
#!/bin/bash
QUERY="$1"
uncover scrape "$QUERY" \
  --sources reddit,hackernews \
  --min-upvotes 5 \
  --max-age 720 \
  --json > research.json

echo "Saved to research.json"
```

### Use a custom API endpoint (self-hosted)

```bash
UNCOVER_API_URL=https://your-api.com uncover scrape "your query"
```

---

## Pricing

| Pack | Searches | Price |
|------|----------|-------|
| Starter | 50 | $5 |
| Growth | 200 | $15 |
| Pro | 500 | $29 |
| Scale | 2,000 | $79 |

Or subscribe: Builder $19/mo · Team $49/mo · Enterprise $149/mo

Buy credits at [uncover.thealxlabs.ca/dashboard](https://uncover.thealxlabs.ca/dashboard).

---

## SDK

Prefer to use Uncover programmatically? Use the SDK:

```bash
npm install @uncover/sdk
```

```typescript
import { Uncover } from "@uncover/sdk";
const uncover = new Uncover("sk_live_...");
const result = await uncover.search({ query: "...", sources: ["reddit"] });
```

---

## License

MIT — Copyright 2026 Alexander Wondwossen and TheUnCoverTeam
