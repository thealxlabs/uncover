import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import searchRoutes from "./routes/search.js";
import authRoutes from "./routes/auth.js";
import stripeRoutes from "./routes/stripe.js";
import adminRoutes from "./routes/admin.js";
import redeemRoutes from "./routes/redeem.js";
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

app.use(cors({
  origin: process.env.WEB_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));

// Health
app.get("/health", (_req, res) => {
  res.json({ status: "ok", version: "1.0.0", timestamp: new Date().toISOString() });
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
    h1 { font-size: clamp(40px, 6vw, 64px); font-weight: 800; letter-spacing: -0.03em; line-height: 1.0; margin-bottom: 16px; }
    h1 span { color: #e8ff47; }
    .sub { font-family: 'IBM Plex Mono', monospace; font-size: 13px; color: #555; line-height: 1.9; margin-bottom: 36px; }
    .endpoints { display: grid; gap: 1px; background: #1c1c1c; border: 1px solid #1c1c1c; margin: 48px 0; }
    .ep { background: #0f0f0f; padding: 14px 20px; display: flex; align-items: center; gap: 16px; }
    .m { font-family: 'IBM Plex Mono', monospace; font-size: 10px; padding: 2px 8px; min-width: 40px; text-align: center; }
    .m-post { background: rgba(74,222,128,0.08); color: #4ade80; border: 1px solid rgba(74,222,128,0.2); }
    .m-get { background: rgba(96,165,250,0.08); color: #60a5fa; border: 1px solid rgba(96,165,250,0.2); }
    .ep-path { font-family: 'IBM Plex Mono', monospace; font-size: 12px; flex: 1; }
    .ep-desc { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #333; }
    footer { padding: 36px 0; font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #2a2a2a; }
  </style>
</head>
<body>
<div class="wrap">
  <nav>
    <span class="logo">Uncover API</span>
    <span class="live"><span class="dot"></span>Operational &bull; v1.0.0</span>
  </nav>
  <div class="hero">
    <h1>Surface real problems<br>from <span>social data.</span></h1>
    <p class="sub">REST API · NPM SDK · CLI</p>
  </div>
  <div class="endpoints">
    <div class="ep"><span class="m m-post">POST</span><span class="ep-path">/api/auth/signup</span><span class="ep-desc">Create account</span></div>
    <div class="ep"><span class="m m-post">POST</span><span class="ep-path">/api/search</span><span class="ep-desc">Run search (1 credit) or custom URL (2 credits)</span></div>
    <div class="ep"><span class="m m-get">GET</span><span class="ep-path">/api/search/:id</span><span class="ep-desc">Get results</span></div>
    <div class="ep"><span class="m m-get">GET</span><span class="ep-path">/api/billing/status</span><span class="ep-desc">Credit balance</span></div>
    <div class="ep"><span class="m m-post">POST</span><span class="ep-path">/api/billing/checkout</span><span class="ep-desc">Buy credits</span></div>
    <div class="ep"><span class="m m-post">POST</span><span class="ep-path">/api/billing/redeem</span><span class="ep-desc">Redeem promo code</span></div>
  </div>
  <footer>Uncover &mdash; Rate limit: 60 req/min · Search: 10 req/min</footer>
</div>
</body>
</html>`);
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/billing", stripeRoutes);
app.use("/api/billing", apiKeyAuth, redeemRoutes);
app.use("/api/search", apiKeyAuth, searchRoutes);
app.use("/api/admin", adminRoutes);

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

app.listen(PORT, () => {
  console.log(`Uncover API on port ${PORT} — ${process.env.NODE_ENV || "development"}`);
});
