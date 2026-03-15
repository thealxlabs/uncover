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

// Stripe webhook needs raw body — MUST come before express.json()
app.post(
  "/api/billing/webhook",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    req.url = "/webhook";
    (stripeRoutes as any)(req, res, next);
  }
);

app.use(
  cors({
    origin: process.env.WEB_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Landing page
app.get("/", (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Uncover API</title>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Syne:wght@700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #080808; color: #e8e8e8; font-family: 'Syne', sans-serif; min-height: 100vh; }
    .wrap { max-width: 820px; margin: 0 auto; padding: 0 32px; }
    nav { border-bottom: 1px solid #1c1c1c; padding: 20px 0; display: flex; align-items: center; justify-content: space-between; }
    .logo { font-weight: 800; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; }
    .live { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #555; display: flex; align-items: center; gap: 8px; }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: #4ade80; animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
    .hero { padding: 72px 0 56px; border-bottom: 1px solid #1c1c1c; }
    .tag { display: inline-block; font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #e8ff47; background: rgba(232,255,71,0.07); border: 1px solid rgba(232,255,71,0.2); padding: 4px 10px; margin-bottom: 24px; }
    h1 { font-size: clamp(40px, 6vw, 64px); font-weight: 800; letter-spacing: -0.03em; line-height: 1.0; margin-bottom: 16px; }
    h1 span { color: #e8ff47; }
    .sub { font-family: 'IBM Plex Mono', monospace; font-size: 13px; color: #555; line-height: 1.9; margin-bottom: 36px; }
    .btn { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; padding: 12px 20px; border: none; cursor: pointer; text-decoration: none; display: inline-block; font-weight: 600; }
    .btn-primary { background: #e8ff47; color: #000; }
    section { padding: 48px 0; border-bottom: 1px solid #1c1c1c; }
    .label { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: #2a2a2a; margin-bottom: 20px; display: block; }
    .packs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: #1c1c1c; border: 1px solid #1c1c1c; }
    .pack { background: #0f0f0f; padding: 22px 20px; }
    .pack-name { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #555; margin-bottom: 10px; }
    .pack-price { font-size: 28px; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 4px; }
    .pack-searches { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #555; }
    .pack-per { font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #333; margin-top: 6px; }
    .pack.best { background: rgba(232,255,71,0.04); border: 1px solid rgba(232,255,71,0.15); }
    .pack.best .pack-price { color: #e8ff47; }
    .endpoints { display: grid; gap: 1px; background: #1c1c1c; border: 1px solid #1c1c1c; }
    .ep { background: #0f0f0f; padding: 14px 20px; display: flex; align-items: center; gap: 16px; }
    .m { font-family: 'IBM Plex Mono', monospace; font-size: 10px; padding: 2px 8px; min-width: 40px; text-align: center; letter-spacing: 0.06em; }
    .m-post { background: rgba(74,222,128,0.08); color: #4ade80; border: 1px solid rgba(74,222,128,0.2); }
    .m-get { background: rgba(96,165,250,0.08); color: #60a5fa; border: 1px solid rgba(96,165,250,0.2); }
    .ep-path { font-family: 'IBM Plex Mono', monospace; font-size: 12px; flex: 1; }
    .ep-desc { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #333; }
    footer { padding: 36px 0; display: flex; justify-content: space-between; font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #2a2a2a; }
    @media(max-width:640px){ .packs{grid-template-columns:1fr 1fr} }
  </style>
</head>
<body>
<div class="wrap">
  <nav>
    <span class="logo">Uncover</span>
    <span class="live"><span class="dot"></span>API operational &bull; v1.0.0</span>
  </nav>
  <div class="hero">
    <div class="tag">Pay as you go</div>
    <h1>Surface real problems<br>from <span>social data.</span></h1>
    <p class="sub">Query Reddit, X, and HackerNews.<br>Buy searches when you need them. No subscription required.</p>
    <a href="/api/auth/signup" class="btn btn-primary">Get API Key</a>
  </div>
  <section>
    <span class="label">Credit Packs — buy once, use anytime</span>
    <div class="packs">
      <div class="pack">
        <div class="pack-name">Starter</div>
        <div class="pack-price">$5</div>
        <div class="pack-searches">50 searches</div>
        <div class="pack-per">$0.10 / search</div>
      </div>
      <div class="pack">
        <div class="pack-name">Growth</div>
        <div class="pack-price">$15</div>
        <div class="pack-searches">200 searches</div>
        <div class="pack-per">$0.075 / search</div>
      </div>
      <div class="pack best">
        <div class="pack-name">Pro</div>
        <div class="pack-price">$29</div>
        <div class="pack-searches">500 searches</div>
        <div class="pack-per">$0.058 / search</div>
      </div>
      <div class="pack">
        <div class="pack-name">Scale</div>
        <div class="pack-price">$79</div>
        <div class="pack-searches">2,000 searches</div>
        <div class="pack-per">$0.040 / search</div>
      </div>
    </div>
  </section>
  <section>
    <span class="label">Endpoints</span>
    <div class="endpoints">
      <div class="ep"><span class="m m-post">POST</span><span class="ep-path">/api/auth/signup</span><span class="ep-desc">Create account &amp; get API key</span></div>
      <div class="ep"><span class="m m-post">POST</span><span class="ep-path">/api/search</span><span class="ep-desc">Run a search — deducts 1 credit</span></div>
      <div class="ep"><span class="m m-get">GET</span><span class="ep-path">/api/search/:id</span><span class="ep-desc">Get results</span></div>
      <div class="ep"><span class="m m-get">GET</span><span class="ep-path">/api/billing/status</span><span class="ep-desc">Credit balance &amp; history</span></div>
      <div class="ep"><span class="m m-post">POST</span><span class="ep-path">/api/billing/checkout</span><span class="ep-desc">Buy a credit pack via Stripe</span></div>
    </div>
  </section>
  <footer>
    <span>Uncover &mdash; v1.0.0</span>
    <span>No subscriptions required. Credits never expire.</span>
  </footer>
</div>
</body>
</html>`);
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/billing", stripeRoutes);
app.use("/api/search", apiKeyAuth, searchRoutes);

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

app.listen(PORT, () => {
  console.log(
    `Uncover API on port ${PORT} — ${process.env.NODE_ENV || "development"}`
  );
});
