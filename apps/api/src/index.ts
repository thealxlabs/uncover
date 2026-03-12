import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import searchRoutes from "./routes/search.js";
import authRoutes from "./routes/auth.js";
import stripeRoutes from "./routes/stripe.js";
import { apiKeyAuth } from "./middleware/auth.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Stripe webhook needs raw body — must be registered before express.json()
app.post(
  "/api/billing/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const { default: stripeRouter } = await import("./routes/stripe.js");
    // Pass to the router's webhook handler
    stripeRouter(req, res, () => {});
  }
);

app.use(express.json({ limit: "1mb" }));
app.use(cors({
  origin: process.env.WEB_URL || "http://localhost:3000",
  credentials: true,
}));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", version: "1.0.0", timestamp: new Date().toISOString() });
});

// Homepage
app.get("/", (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Uncover API</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #080808;
      --surface: #0f0f0f;
      --border: #1c1c1c;
      --border-bright: #2a2a2a;
      --text: #e8e8e8;
      --muted: #555;
      --dim: #333;
      --accent: #e8ff47;
      --accent-dim: rgba(232,255,71,0.08);
      --green: #4ade80;
      --red: #f87171;
      --yellow: #fbbf24;
      --mono: 'IBM Plex Mono', monospace;
      --sans: 'Syne', sans-serif;
    }
    html { scroll-behavior: smooth; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--sans);
      min-height: 100vh;
      line-height: 1.6;
    }
    .wrap { max-width: 860px; margin: 0 auto; padding: 0 32px; }

    /* Nav */
    nav {
      border-bottom: 1px solid var(--border);
      padding: 20px 0;
    }
    nav .inner { display: flex; align-items: center; justify-content: space-between; }
    .wordmark { font-size: 15px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text); }
    .nav-status { display: flex; align-items: center; gap: 8px; font-family: var(--mono); font-size: 11px; color: var(--muted); }
    .pulse { width: 6px; height: 6px; border-radius: 50%; background: var(--green); animation: pulse 2s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

    /* Hero */
    .hero { padding: 80px 0 64px; border-bottom: 1px solid var(--border); }
    .version-tag {
      display: inline-block;
      font-family: var(--mono);
      font-size: 10px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--accent);
      background: var(--accent-dim);
      border: 1px solid rgba(232,255,71,0.2);
      padding: 4px 10px;
      border-radius: 2px;
      margin-bottom: 28px;
    }
    h1 {
      font-size: clamp(42px, 6vw, 68px);
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.0;
      margin-bottom: 20px;
      color: var(--text);
    }
    h1 span { color: var(--accent); }
    .hero-sub {
      font-size: 17px;
      color: var(--muted);
      max-width: 520px;
      line-height: 1.7;
      margin-bottom: 40px;
      font-family: var(--mono);
      font-weight: 400;
    }
    .hero-actions { display: flex; gap: 12px; flex-wrap: wrap; }
    .btn {
      font-family: var(--mono);
      font-size: 12px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      padding: 12px 20px;
      border-radius: 2px;
      border: 1px solid;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
      transition: all 0.15s;
    }
    .btn-primary { background: var(--accent); color: #000; border-color: var(--accent); font-weight: 600; }
    .btn-primary:hover { background: #d4eb00; }
    .btn-ghost { background: transparent; color: var(--muted); border-color: var(--border-bright); }
    .btn-ghost:hover { color: var(--text); border-color: var(--dim); }

    /* Sections */
    section { padding: 56px 0; border-bottom: 1px solid var(--border); }
    .section-label {
      font-family: var(--mono);
      font-size: 10px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--dim);
      margin-bottom: 32px;
    }

    /* Status grid */
    .status-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--border); border: 1px solid var(--border); }
    .status-row { background: var(--surface); padding: 14px 18px; display: flex; align-items: center; gap: 12px; font-family: var(--mono); font-size: 12px; }
    .dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .dot-green { background: var(--green); }
    .dot-yellow { background: var(--yellow); }
    .dot-red { background: var(--red); }
    .status-name { color: var(--text); flex: 1; }
    .status-badge { font-size: 10px; color: var(--muted); }

    /* Endpoints */
    .endpoints { display: grid; gap: 1px; background: var(--border); border: 1px solid var(--border); }
    .endpoint { background: var(--surface); padding: 16px 20px; display: flex; align-items: center; gap: 16px; }
    .method { font-family: var(--mono); font-size: 10px; font-weight: 500; padding: 3px 8px; border-radius: 2px; letter-spacing: 0.08em; min-width: 42px; text-align: center; }
    .method-post { background: rgba(74,222,128,0.1); color: var(--green); border: 1px solid rgba(74,222,128,0.2); }
    .method-get { background: rgba(96,165,250,0.1); color: #60a5fa; border: 1px solid rgba(96,165,250,0.2); }
    .ep-path { font-family: var(--mono); font-size: 13px; color: var(--text); flex: 1; }
    .ep-desc { font-family: var(--mono); font-size: 11px; color: var(--muted); }

    /* Code */
    .code-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: 2px; overflow: hidden; }
    .code-bar { padding: 10px 18px; background: #0a0a0a; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px; }
    .code-bar span { font-family: var(--mono); font-size: 10px; color: var(--muted); letter-spacing: 0.08em; }
    pre { padding: 24px; font-family: var(--mono); font-size: 12.5px; line-height: 1.8; color: #8a9bb0; overflow-x: auto; }
    .c-kw { color: #60a5fa; }
    .c-str { color: var(--green); }
    .c-num { color: var(--yellow); }
    .c-cmt { color: #333; }
    .c-key { color: #c4b5fd; }
    .c-acc { color: var(--accent); }

    /* Plans */
    .plans { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--border); border: 1px solid var(--border); }
    .plan { background: var(--surface); padding: 28px 24px; }
    .plan-name { font-family: var(--mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin-bottom: 12px; }
    .plan-price { font-size: 32px; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 4px; }
    .plan-price sub { font-size: 14px; font-weight: 400; color: var(--muted); vertical-align: baseline; }
    .plan-desc { font-family: var(--mono); font-size: 11px; color: var(--muted); margin-bottom: 20px; line-height: 1.6; }
    .plan-limit { font-family: var(--mono); font-size: 12px; color: var(--text); padding: 8px 0; border-top: 1px solid var(--border); }
    .plan.featured { background: var(--accent-dim); border: 1px solid rgba(232,255,71,0.15); }
    .plan.featured .plan-price { color: var(--accent); }

    footer { padding: 40px 0; }
    .footer-inner { display: flex; align-items: center; justify-content: space-between; }
    .footer-copy { font-family: var(--mono); font-size: 11px; color: var(--dim); }

    @media (max-width: 640px) {
      .status-grid, .plans { grid-template-columns: 1fr; }
      h1 { font-size: 38px; }
      .hero { padding: 48px 0 40px; }
    }
  </style>
</head>
<body>
  <nav>
    <div class="wrap">
      <div class="inner">
        <span class="wordmark">Uncover</span>
        <span class="nav-status"><span class="pulse"></span>API operational &bull; v1.0.0</span>
      </div>
    </div>
  </nav>

  <div class="wrap">
    <div class="hero">
      <div class="version-tag">v1.0.0 &mdash; Production</div>
      <h1>Surface real<br>problems from<br><span>social data.</span></h1>
      <p class="hero-sub">
        Query Reddit, X, and HackerNews.<br>
        Get structured pain points, trends, and AI analysis back.
      </p>
      <div class="hero-actions">
        <a href="/api/auth/signup" class="btn btn-primary">Get API Key</a>
        <a href="#endpoints" class="btn btn-ghost">View Endpoints</a>
      </div>
    </div>

    <section>
      <div class="section-label">System Status</div>
      <div class="status-grid">
        <div class="status-row"><span class="dot dot-green"></span><span class="status-name">Auth &amp; API keys</span><span class="status-badge">Operational</span></div>
        <div class="status-row"><span class="dot dot-green"></span><span class="status-name">Database</span><span class="status-badge">Operational</span></div>
        <div class="status-row"><span class="dot dot-green"></span><span class="status-name">Reddit scraping</span><span class="status-badge">Operational</span></div>
        <div class="status-row"><span class="dot dot-yellow"></span><span class="status-name">X / Twitter</span><span class="status-badge">Via Nitter</span></div>
        <div class="status-row"><span class="dot dot-green"></span><span class="status-name">HackerNews</span><span class="status-badge">Operational</span></div>
        <div class="status-row"><span class="dot dot-green"></span><span class="status-name">Stripe billing</span><span class="status-badge">Operational</span></div>
        <div class="status-row"><span class="dot dot-green"></span><span class="status-name">AI analysis</span><span class="status-badge">Operational</span></div>
        <div class="status-row"><span class="dot dot-green"></span><span class="status-name">Robots.txt compliance</span><span class="status-badge">Enforced</span></div>
      </div>
    </section>

    <section id="endpoints">
      <div class="section-label">Endpoints</div>
      <div class="endpoints">
        <div class="endpoint"><span class="method method-post">POST</span><span class="ep-path">/api/auth/signup</span><span class="ep-desc">Create account &amp; get API key</span></div>
        <div class="endpoint"><span class="method method-post">POST</span><span class="ep-path">/api/auth/signin</span><span class="ep-desc">Sign in, retrieve keys</span></div>
        <div class="endpoint"><span class="method method-post">POST</span><span class="ep-path">/api/search</span><span class="ep-desc">Submit search — Bearer token required</span></div>
        <div class="endpoint"><span class="method method-get">GET</span><span class="ep-path">/api/search/:id</span><span class="ep-desc">Retrieve previous results</span></div>
        <div class="endpoint"><span class="method method-get">GET</span><span class="ep-path">/api/billing/status</span><span class="ep-desc">Current plan &amp; usage</span></div>
        <div class="endpoint"><span class="method method-post">POST</span><span class="ep-path">/api/billing/checkout</span><span class="ep-desc">Create Stripe checkout session</span></div>
        <div class="endpoint"><span class="method method-post">POST</span><span class="ep-path">/api/billing/portal</span><span class="ep-desc">Customer billing portal</span></div>
        <div class="endpoint"><span class="method method-get">GET</span><span class="ep-path">/health</span><span class="ep-desc">Health check</span></div>
      </div>
    </section>

    <section>
      <div class="section-label">Quick Start</div>
      <div class="code-wrap">
        <div class="code-bar"><span>bash &mdash; uncover CLI</span></div>
        <pre><span class="c-cmt"># Install the CLI</span>
<span class="c-acc">npm install -g @uncover/cli</span>

<span class="c-cmt"># Authenticate</span>
<span class="c-acc">uncover login</span>

<span class="c-cmt"># Run a search</span>
<span class="c-acc">uncover scrape "password manager frustrations" --sources reddit,hackernews</span>

<span class="c-cmt"># Exclude noise</span>
<span class="c-acc">uncover scrape "CRM software problems" \
  --exclude-keywords spam,ad,promoted \
  --min-upvotes 10 \
  --max-age 720</span>

<span class="c-cmt"># Check usage</span>
<span class="c-acc">uncover status</span></pre>
      </div>
    </section>

    <section>
      <div class="section-label">API Example</div>
      <div class="code-wrap">
        <div class="code-bar"><span>typescript</span></div>
        <pre><span class="c-cmt">// Search with exclusion filters</span>
<span class="c-kw">const</span> res = <span class="c-kw">await</span> fetch(<span class="c-str">'/api/search'</span>, {
  method: <span class="c-str">'POST'</span>,
  headers: { Authorization: <span class="c-str">\`Bearer \${apiKey}\`</span> },
  body: JSON.stringify({
    query: <span class="c-str">'password manager frustrations'</span>,
    sources: [<span class="c-str">'reddit'</span>, <span class="c-str">'hackernews'</span>],
    limit: <span class="c-num">20</span>,
    options: {
      excludeSubreddits: [<span class="c-str">'AskReddit'</span>, <span class="c-str">'memes'</span>],
      excludeKeywords: [<span class="c-str">'sponsored'</span>, <span class="c-str">'ad'</span>],
      minUpvotes: <span class="c-num">5</span>,
      maxAgeHours: <span class="c-num">720</span>  <span class="c-cmt">// last 30 days</span>
    }
  })
});

<span class="c-kw">const</span> { problems, summary, trends } = <span class="c-kw">await</span> res.json();
<span class="c-cmt">// problems: [{ text, frequency, sentiment }]</span>
<span class="c-cmt">// trends:   ["pricing", "mobile UX", "export"]</span>
<span class="c-cmt">// summary:  "Most users struggle with..."</span></pre>
      </div>
    </section>

    <section>
      <div class="section-label">Pricing</div>
      <div class="plans">
        <div class="plan">
          <div class="plan-name">Free</div>
          <div class="plan-price">$0</div>
          <div class="plan-desc">For exploration and prototyping.</div>
          <div class="plan-limit">10 searches / month</div>
        </div>
        <div class="plan featured">
          <div class="plan-name">Pro</div>
          <div class="plan-price">$29<sub>/mo</sub></div>
          <div class="plan-desc">For teams building products.</div>
          <div class="plan-limit">500 searches / month</div>
        </div>
        <div class="plan">
          <div class="plan-name">Enterprise</div>
          <div class="plan-price">$199<sub>/mo</sub></div>
          <div class="plan-desc">For high-volume research.</div>
          <div class="plan-limit">10,000 searches / month</div>
        </div>
      </div>
    </section>

    <footer>
      <div class="footer-inner">
        <span class="footer-copy">Uncover &mdash; v1.0.0</span>
        <span class="footer-copy">Built with Node.js + Prisma</span>
      </div>
    </footer>
  </div>
</body>
</html>`);
});

// Public routes
app.use("/api/auth", authRoutes);
app.use("/api/billing", stripeRoutes);

// Protected routes
app.use("/api/search", apiKeyAuth, searchRoutes);

// 404
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

app.listen(PORT, () => {
  console.log(`Uncover API listening on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
