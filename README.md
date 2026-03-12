# Uncover

A SaaS API platform that discovers real user problems from Reddit and Twitter using Claude AI analysis.

## Features

- 🔍 Search Reddit and Twitter for real problems people mention
- 🤖 AI-powered analysis using Claude to identify common pain points
- 📊 Get structured insights: problems, trends, and summaries
- 🔌 REST API with per-request pricing
- 📦 NPM SDK for easy integration
- 🌐 Web dashboard for testing and management

## Project Structure

```
uncover/
├── apps/
│   ├── api/        # Node.js/Express backend API
│   ├── web/        # Next.js dashboard
│   └── docs/       # Documentation (coming soon)
├── packages/
│   ├── sdk/        # @uncover/sdk NPM package
│   └── db/         # Shared Prisma setup
└── prisma/         # Database schema
```

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis (for job queue - Phase 2)
- Anthropic API key

### 1. Setup Environment

```bash
# Clone and install dependencies
git clone <repo>
cd uncover
npm install

# Create .env file
cp .env.example .env

# Update .env with your credentials:
# - DATABASE_URL: PostgreSQL connection string
# - ANTHROPIC_API_KEY: Your Claude API key
```

### 2. Setup Database

```bash
# Initialize Prisma
cd apps/api
npx prisma migrate dev --name init

# This creates tables and seeds with demo data
```

### 3. Start Development Servers

```bash
# From root directory, start all services
npm run dev

# Or start individually:
# API: cd apps/api && npm run dev (port 3001)
# Web: cd apps/web && npm run dev (port 3000)
```

### 4. Test the API

```bash
# Sign up
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'

# You'll get back an API key like: sk_live_xxxxx

# Search
curl -X POST http://localhost:3001/api/search \
  -H "Authorization: Bearer sk_live_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "password manager frustrations",
    "sources": ["reddit"],
    "limit": 20
  }'
```

## Using the NPM SDK

```bash
npm install @uncover/sdk
```

```typescript
import { Uncover } from "@uncover/sdk";

const uncover = new Uncover("sk_live_xxxxx");

// Search
const results = await uncover.search({
  query: "project management tools problems",
  sources: ["reddit"],
  limit: 20,
});

console.log(results.problems);
console.log(results.summary);
console.log(results.trends);

// Or wait for async completion
const completed = await uncover.waitForSearch(results.requestId);
```

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Register new user
- `POST /api/auth/signin` - Sign in and get API keys

### Search (requires API key)

- `POST /api/search` - Submit a search request
- `GET /api/search/:requestId` - Get search status/results

## Development Roadmap

### Phase 1: MVP ✅ (Current)
- [x] Database schema
- [x] Express API backend
- [x] Basic search endpoint
- [x] Claude integration
- [x] Next.js web dashboard
- [x] NPM SDK package

### Phase 2: Production Ready
- [ ] Twitter/X scraping
- [ ] Rate limiting & quotas
- [ ] Redis job queue
- [ ] Stripe payments
- [ ] API documentation

### Phase 3: Enhanced Features
- [ ] Webhook support
- [ ] Advanced filtering
- [ ] More sources (HN, ProductHunt)
- [ ] Usage analytics

## Architecture

- **API**: Node.js + Express + TypeScript
- **Web**: Next.js + React
- **Database**: PostgreSQL + Prisma
- **Job Queue**: Bull + Redis (Phase 2)
- **AI**: Claude API (Haiku model)
- **Auth**: API keys + JWT (Web)

## Environment Variables

See `.env.example` for all available options.

## License

MIT
