import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import searchRoutes from "./routes/search.js";
import authRoutes from "./routes/auth.js";
import { apiKeyAuth } from "./middleware/auth.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cors());

// Homepage
app.get("/", (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Uncover API</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e5e5e5; min-height: 100vh; }
    .hero { padding: 80px 40px 60px; max-width: 900px; margin: 0 auto; }
    .badge { display: inline-block; background: #1a1a1a; border: 1px solid #333; color: #888; font-size: 12px; padding: 4px 12px; border-radius: 20px; margin-bottom: 24px; }
    h1 { font-size: 52px; font-weight: 700; letter-spacing: -1.5px; margin-bottom: 16px; background: linear-gradient(135deg, #fff 0%, #888 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .subtitle { font-size: 18px; color: #666; line-height: 1.6; margin-bottom: 48px; max-width: 560px; }
    .section-title { font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #444; margin-bottom: 14px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 56px; }
    .card { background: #111; border: 1px solid #222; border-radius: 12px; padding: 22px 24px; }
    .card-icon { font-size: 22px; margin-bottom: 12px; }
    .card h3 { font-size: 15px; font-weight: 600; margin-bottom: 6px; color: #e5e5e5; }
    .card p { font-size: 13px; color: #555; line-height: 1.6; }
    .status-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 56px; }
    .status-item { background: #111; border: 1px solid #222; border-radius: 10px; padding: 14px 18px; display: flex; align-items: center; gap: 12px; font-size: 13px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .dot.green { background: #4ade80; }
    .dot.yellow { background: #facc15; }
    .dot.red { background: #f87171; }
    .status-label { color: #666; font-size: 11px; margin-left: auto; }
    .endpoints { display: grid; gap: 10px; margin-bottom: 56px; }
    .endpoint { background: #111; border: 1px solid #222; border-radius: 10px; padding: 18px 22px; display: flex; align-items: center; gap: 16px; }
    .method { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; min-width: 48px; text-align: center; letter-spacing: 0.5px; }
    .method.post { background: #1a2e1a; color: #4ade80; border: 1px solid #2d4a2d; }
    .method.get  { background: #1a2335; color: #60a5fa; border: 1px solid #2d3f5a; }
    .path { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 13px; color: #e5e5e5; flex: 1; }
    .desc { font-size: 12px; color: #555; }
    .code-block { background: #111; border: 1px solid #222; border-radius: 12px; padding: 24px; margin-bottom: 56px; }
    pre { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 13px; line-height: 1.7; color: #a8b5c8; white-space: pre-wrap; }
    .key { color: #60a5fa; } .str { color: #4ade80; } .num { color: #f59e0b; } .comment { color: #444; }
    .footer { padding: 40px; border-top: 1px solid #1a1a1a; text-align: center; color: #333; font-size: 13px; }
    .status-dot { display: inline-block; width: 8px; height: 8px; background: #4ade80; border-radius: 50%; margin-right: 6px; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    @media (max-width: 600px) { .grid2, .status-grid { grid-template-columns: 1fr; } h1 { font-size: 36px; } }
  </style>
</head>
<body>
  <div class="hero">
    <div class="badge"><span class="status-dot"></span>API Running · v0.1.0-alpha</div>
    <h1>Uncover API</h1>
    <p class="subtitle">Find real problems people talk about on Reddit and X, analyzed by AI. Send a topic, get structured pain points, trends, and insights back.</p>

    <div class="section-title" style="margin-bottom:20px">What it does</div>
    <div class="grid2">
      <div class="card">
        <div class="card-icon">🔍</div>
        <h3>Social Search</h3>
        <p>Searches Reddit and X (Twitter) for posts matching your query — complaints, questions, and discussions.</p>
      </div>
      <div class="card">
        <div class="card-icon">🤖</div>
        <h3>AI Analysis</h3>
        <p>Runs results through an LLM (Groq / OpenRouter) to extract distinct problems, frequency, and sentiment.</p>
      </div>
      <div class="card">
        <div class="card-icon">📊</div>
        <h3>Structured Output</h3>
        <p>Returns problems ranked by frequency, a summary paragraph, and key themes — ready to use in your code.</p>
      </div>
      <div class="card">
        <div class="card-icon">🔑</div>
        <h3>API Key Auth</h3>
        <p>Sign up to get a <code style="background:#1a1a1a;padding:2px 6px;border-radius:4px;font-size:12px">sk_live_</code> key. Pass it as a Bearer token on every request.</p>
      </div>
    </div>

    <div class="section-title" style="margin-bottom:14px">Current status</div>
    <div class="status-grid" style="margin-bottom:56px">
      <div class="status-item"><span class="dot green"></span>Auth &amp; API keys<span class="status-label">Working</span></div>
      <div class="status-item"><span class="dot green"></span>Database storage<span class="status-label">Working</span></div>
      <div class="status-item"><span class="dot yellow"></span>AI analysis<span class="status-label">Needs AI key</span></div>
      <div class="status-item"><span class="dot yellow"></span>Reddit scraping<span class="status-label">Mock data (alpha)</span></div>
      <div class="status-item"><span class="dot yellow"></span>X / Twitter<span class="status-label">Mock data (alpha)</span></div>
      <div class="status-item"><span class="dot red"></span>Billing / Stripe<span class="status-label">Coming soon</span></div>
    </div>

    <div class="section-title">Endpoints</div>
    <div class="endpoints">
      <div class="endpoint">
        <span class="method post">POST</span>
        <span class="path">/api/auth/signup</span>
        <span class="desc">Create account + get API key</span>
      </div>
      <div class="endpoint">
        <span class="method post">POST</span>
        <span class="path">/api/auth/signin</span>
        <span class="desc">Sign in, retrieve existing keys</span>
      </div>
      <div class="endpoint">
        <span class="method post">POST</span>
        <span class="path">/api/search</span>
        <span class="desc">Submit search — requires Bearer token</span>
      </div>
      <div class="endpoint">
        <span class="method get">GET</span>
        <span class="path">/api/search/:id</span>
        <span class="desc">Retrieve results of a previous search</span>
      </div>
      <div class="endpoint">
        <span class="method get">GET</span>
        <span class="path">/health</span>
        <span class="desc">Health check</span>
      </div>
    </div>

    <div class="section-title">Example</div>
    <div class="code-block"><pre><span class="comment">// 1. Sign up to get a key</span>
<span class="key">const</span> { apiKey } = <span class="key">await</span> fetch(<span class="str">'/api/auth/signup'</span>, {
  method: <span class="str">'POST'</span>,
  body: JSON.stringify({ email, password })
}).then(r => r.json());

<span class="comment">// 2. Search for problems</span>
<span class="key">const</span> results = <span class="key">await</span> fetch(<span class="str">'/api/search'</span>, {
  method: <span class="str">'POST'</span>,
  headers: { Authorization: <span class="str">\`Bearer \${apiKey.key}\`</span> },
  body: JSON.stringify({
    query: <span class="str">'password manager frustrations'</span>,
    sources: [<span class="str">'reddit'</span>],
    limit: <span class="num">20</span>
  })
}).then(r => r.json());

<span class="comment">// 3. Use the output</span>
results.problems   <span class="comment">// [{ text, frequency, sentiment }]</span>
results.summary    <span class="comment">// "Most users struggle with..."</span>
results.trends     <span class="comment">// ["pricing", "onboarding", "mobile"]</span></pre></div>
  </div>
  <div class="footer">Uncover · v0.1.0-alpha · Built with Node.js + Groq / OpenRouter</div>
</body>
</html>`);
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Public routes (no auth required)
app.use("/api/auth", authRoutes);

// Protected routes (require API key)
app.use("/api/search", apiKeyAuth, searchRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Uncover API listening on port ${PORT}`);
  console.log("Environment:", process.env.NODE_ENV || "development");
});
