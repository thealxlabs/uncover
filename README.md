# Uncover

Surface real problems from social data. Query Reddit, X, and HackerNews — get structured pain points, trends, and AI analysis back.

## What it does

- Real scraping of Reddit (JSON API), Twitter/X (via Nitter), and HackerNews (Algolia API)
- Respects `robots.txt` and crawl delays on all sources
- Configurable exclusion filters: subreddits, keywords, min upvotes, age
- AI analysis to extract problems, frequency, and sentiment
- Per-request billing via Stripe
- REST API + NPM SDK + CLI (`uncover` commands)

## Project Structure

```
uncover/
├── apps/
│   ├── api/        # Express API (port 3001)
│   └── web/        # Next.js dashboard (port 3000)
├── packages/
│   ├── cli/        # @uncover/cli — uncover commands
│   └── sdk/        # @uncover/sdk — NPM package
└── prisma/         # Database schema
```

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/thealxlabs/uncover
cd uncover
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your keys

# 3. Set up database
cd apps/api && npx prisma migrate dev --name init

# 4. Start servers
cd ../.. && npm run dev:all
```

## CLI

```bash
npm install -g @uncover/cli

# Authenticate
uncover login
uncover login --key sk_live_...

# Search
uncover scrape "password manager frustrations"
uncover scrape "CRM problems" --sources reddit,hackernews --limit 30

# Filtering
uncover scrape "project management" \
  --exclude-subreddits AskReddit,memes \
  --exclude-keywords sponsored,ad \
  --min-upvotes 10 \
  --max-age 720

# Account
uncover status
uncover keys
uncover history
uncover logout
```

## API

```bash
# Sign up
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"password123"}'

# Returns: { user, apiKey: { key: "sk_live_..." } }

# Search with filters
curl -X POST http://localhost:3001/api/search \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "query": "password manager frustrations",
    "sources": ["reddit", "hackernews"],
    "limit": 20,
    "options": {
      "excludeSubreddits": ["memes"],
      "excludeKeywords": ["sponsored"],
      "minUpvotes": 5,
      "maxAgeHours": 720
    }
  }'

# Billing
curl http://localhost:3001/api/billing/status \
  -H "Authorization: Bearer sk_live_..."

curl -X POST http://localhost:3001/api/billing/checkout \
  -H "Authorization: Bearer sk_live_..." \
  -d '{"plan":"pro"}'
```

## Stripe Setup

1. Create products in your Stripe dashboard for Pro ($29/mo) and Enterprise ($199/mo)
2. Copy the Price IDs into `.env`
3. Set up a webhook endpoint pointing to `/api/billing/webhook`
4. Copy the webhook secret into `STRIPE_WEBHOOK_SECRET`

Events handled: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`

## Environment Variables

See `.env.example` for all options.

## Plans

| Plan       | Searches/mo | Price  |
|------------|------------|--------|
| Free       | 10         | $0     |
| Pro        | 500        | $29/mo |
| Enterprise | 10,000     | $199/mo|
