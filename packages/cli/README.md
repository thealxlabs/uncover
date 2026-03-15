# @uncover/cli

Command-line interface for [Uncover](https://uncover.thealxlabs.ca) — surface real problems from Reddit, X, and HackerNews, analyzed by AI.

## Installation

```bash
npm install -g @uncover/cli
```

## Setup

```bash
uncover login
# or
uncover login --key sk_live_your_api_key
```

## Commands

### `uncover scrape <query>`

```bash
uncover scrape "password manager frustrations"
uncover scrape "CRM problems" --sources reddit,hackernews --limit 30
uncover scrape "Notion issues" \
  --exclude-subreddits memes,AskReddit \
  --exclude-keywords sponsored,ad \
  --min-upvotes 10 \
  --max-age 720
uncover scrape "project management" --json
```

| Flag | Description | Default |
|------|-------------|---------|
| `--sources` | `reddit`, `twitter`, `hackernews` | `reddit` |
| `--limit` | Posts to analyze (1–50) | `20` |
| `--exclude-subreddits` | Subreddits to skip | — |
| `--exclude-keywords` | Keywords to filter out | — |
| `--min-upvotes` | Minimum upvotes | `0` |
| `--max-age` | Max age in hours | — |
| `--json` | Raw JSON output | `false` |

### Other commands

```bash
uncover status    # credit balance & plan
uncover history   # recent searches
uncover keys      # list API keys
uncover logout    # remove saved key
```

## License

MIT — Copyright 2026 Alexander Wondwossen and TheAlxLabs
