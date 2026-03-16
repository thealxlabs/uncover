"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("uncover_api_key");
    if (stored) router.push("/dashboard");
  }, [router]);

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.navInner}>
          <span style={s.logo}>Uncover</span>
          <div style={s.navLinks}>
            <a href="#how" style={s.navLink}>Docs</a>
            <a href="#pricing" style={s.navLink}>Pricing</a>
            <a href="/login" style={s.navLink}>Sign in</a>
            <a href="/login" style={s.navBtn}>Get started</a>
          </div>
        </div>
      </nav>

      <main style={s.main}>
        <div style={s.badge}>Now in open beta</div>
        <h1 style={s.h1}>Surface real problems<br />from social data</h1>
        <p style={s.sub}>
          Query Reddit, X, and HackerNews. Get structured pain points,
          trends, and AI analysis back. No subscription required.
        </p>
        <div style={s.ctas}>
          <a href="/login" style={s.btnPrimary}>Get started for free</a>
          <a href="#how" style={s.btnSecondary}>See how it works →</a>
        </div>

        <div style={s.codeCard}>
          <div style={s.codeHeader}>
            <span style={s.codeLang}>Request</span>
          </div>
          <pre style={s.code}>{`curl -X POST https://api.uncover.thealxlabs.ca/api/search \\
  -H "Authorization: Bearer sk_live_..." \\
  -d '{"query":"password manager frustrations","sources":["reddit","hackernews"]}'`}</pre>
          <div style={s.codeHeader}>
            <span style={s.codeLang}>Response</span>
          </div>
          <pre style={s.code}>{`{
  "summary": "Users report steep pricing, poor mobile UX, complex onboarding...",
  "problems": [
    { "text": "Too expensive for personal use", "frequency": 8, "sentiment": "frustrated" },
    { "text": "Mobile app crashes constantly",  "frequency": 7, "sentiment": "frustrated" }
  ],
  "trends": ["pricing", "mobile", "browser extension"]
}`}</pre>
        </div>
      </main>

      <section id="how" style={s.section}>
        <div style={s.sectionInner}>
          <div style={s.sectionMeta}>
            <span style={s.sectionTag}>How it works</span>
            <h2 style={s.sectionH2}>From query to insights in seconds</h2>
            <p style={s.sectionSub}>We handle the scraping, filtering, and AI analysis. You get clean structured data.</p>
          </div>
          <div style={s.steps}>
            {[
              { n: "1", title: "Sign up & get your API key", desc: "Create an account in seconds. Your API key is generated instantly — no credit card required." },
              { n: "2", title: "Buy a credit pack", desc: "One credit equals one search. Packs start at $5 for 50 searches. Credits never expire." },
              { n: "3", title: "Run a search", desc: "POST your query to our API or use the dashboard. We scrape Reddit, X, and HackerNews in real time." },
              { n: "4", title: "Get structured insights", desc: "AI extracts pain points, sentiment scores, frequency, and trending themes from the raw data." },
            ].map((step) => (
              <div key={step.n} style={s.step}>
                <div style={s.stepN}>{step.n}</div>
                <div style={s.stepContent}>
                  <div style={s.stepTitle}>{step.title}</div>
                  <div style={s.stepDesc}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={s.section}>
        <div style={s.sectionInner}>
          <div style={s.sectionMeta}>
            <span style={s.sectionTag}>Data sources</span>
            <h2 style={s.sectionH2}>Real opinions, not curated content</h2>
          </div>
          <div style={s.sourceGrid}>
            {[
              { name: "Reddit", desc: "Real-time JSON API with subreddit, upvote, and age filtering. The richest source of product complaints on the internet." },
              { name: "HackerNews", desc: "Algolia-powered search across HN stories. High signal-to-noise, tech-focused audience." },
              { name: "X / Twitter", desc: "Via Nitter instances. Raw, unfiltered opinions without the algorithmic filter bubble." },
            ].map((src) => (
              <div key={src.name} style={s.sourceCard}>
                <div style={s.sourceName}>{src.name}</div>
                <div style={s.sourceDesc}>{src.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" style={s.section}>
        <div style={s.sectionInner}>
          <div style={s.sectionMeta}>
            <span style={s.sectionTag}>Pricing</span>
            <h2 style={s.sectionH2}>Buy once, use anytime</h2>
            <p style={s.sectionSub}>No subscriptions required. Credits never expire. Top up when you need to.</p>
          </div>
          <div style={s.pricingGrid}>
            {[
              { name: "Starter", price: "$5", searches: "50 searches", per: "$0.10 per search", highlight: false },
              { name: "Growth", price: "$15", searches: "200 searches", per: "$0.075 per search", highlight: false },
              { name: "Pro", price: "$29", searches: "500 searches", per: "$0.058 per search", highlight: true },
              { name: "Scale", price: "$79", searches: "2,000 searches", per: "$0.040 per search", highlight: false },
            ].map((p) => (
              <div key={p.name} style={{ ...s.priceCard, ...(p.highlight ? s.priceCardHL : {}) }}>
                {p.highlight && <div style={s.priceHL}>Most popular</div>}
                <div style={s.priceName}>{p.name}</div>
                <div style={s.priceAmount}>{p.price}</div>
                <div style={s.priceSearches}>{p.searches}</div>
                <div style={s.pricePer}>{p.per}</div>
                <a href="/login" style={{ ...s.priceBtn, ...(p.highlight ? s.priceBtnHL : {}) }}>
                  Get started
                </a>
              </div>
            ))}
          </div>
          <p style={s.pricingFootnote}>Also available: monthly subscriptions from $19/mo · Cancel anytime</p>
        </div>
      </section>

      <section style={{ ...s.section, borderBottom: "none" }}>
        <div style={{ ...s.sectionInner, textAlign: "center" as const, padding: "80px 32px" }}>
          <h2 style={{ ...s.sectionH2, fontSize: "clamp(28px, 4vw, 42px)", marginBottom: 16 }}>
            Start uncovering real problems today
          </h2>
          <p style={{ ...s.sectionSub, marginBottom: 32 }}>Free to sign up. No credit card required.</p>
          <a href="/login" style={s.btnPrimary}>Create free account</a>
        </div>
      </section>

      <footer style={s.footer}>
        <div style={s.footerInner}>
          <span style={s.footerLogo}>Uncover</span>
          <div style={s.footerLinks}>
            <a href="#how" style={s.footerLink}>Docs</a>
            <a href="#pricing" style={s.footerLink}>Pricing</a>
            <a href="/login" style={s.footerLink}>Sign in</a>
            <a href="/privacy" style={s.footerLink}>Privacy</a>
            <a href="/terms" style={s.footerLink}>Terms</a>
            <a href="https://thealxlabs.ca" style={s.footerLink}>TheAlxLabs</a>
          </div>
          <span style={s.footerCopy}>© 2026 Uncover</span>
        </div>
      </footer>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#0a0a0a", color: "#ededed", fontFamily: "'Inter', system-ui, -apple-system, sans-serif" },
  nav: { borderBottom: "1px solid #1f1f1f", position: "sticky" as const, top: 0, background: "rgba(10,10,10,0.85)", backdropFilter: "blur(12px)", zIndex: 50 },
  navInner: { maxWidth: 1100, margin: "0 auto", padding: "0 32px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" },
  logo: { fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em", color: "#fff" },
  navLinks: { display: "flex", alignItems: "center", gap: 4 },
  navLink: { fontSize: 14, color: "#777", textDecoration: "none", padding: "6px 12px", borderRadius: 6 },
  navBtn: { fontSize: 13, color: "#000", background: "#fff", padding: "7px 16px", borderRadius: 8, textDecoration: "none", fontWeight: 500, marginLeft: 8 },
  main: { maxWidth: 1100, margin: "0 auto", padding: "96px 32px 80px", textAlign: "center" as const },
  badge: { display: "inline-block", fontSize: 12, color: "#666", background: "#141414", border: "1px solid #252525", padding: "4px 14px", borderRadius: 20, marginBottom: 28 },
  h1: { fontSize: "clamp(40px, 6vw, 68px)", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1.08, marginBottom: 20, color: "#fff" },
  sub: { fontSize: 16, color: "#777", lineHeight: 1.7, marginBottom: 36, maxWidth: 500, margin: "0 auto 36px" },
  ctas: { display: "flex", gap: 12, justifyContent: "center", marginBottom: 56, flexWrap: "wrap" as const },
  btnPrimary: { fontSize: 14, fontWeight: 500, color: "#000", background: "#fff", padding: "10px 22px", borderRadius: 8, textDecoration: "none", display: "inline-block" },
  btnSecondary: { fontSize: 14, color: "#777", padding: "10px 22px", borderRadius: 8, textDecoration: "none", border: "1px solid #252525", display: "inline-block" },
  codeCard: { background: "#0f0f0f", border: "1px solid #1f1f1f", borderRadius: 12, overflow: "hidden", maxWidth: 680, margin: "0 auto", textAlign: "left" as const },
  codeHeader: { padding: "10px 18px", borderBottom: "1px solid #1a1a1a", background: "#0c0c0c" },
  codeLang: { fontSize: 11, color: "#444", letterSpacing: "0.04em" },
  code: { fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 12, color: "#888", padding: "18px", margin: 0, lineHeight: 1.75, overflowX: "auto" as const },
  section: { borderTop: "1px solid #141414", padding: "80px 0" },
  sectionInner: { maxWidth: 1100, margin: "0 auto", padding: "0 32px" },
  sectionMeta: { textAlign: "center" as const, marginBottom: 52 },
  sectionTag: { display: "inline-block", fontSize: 11, color: "#444", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 14 },
  sectionH2: { fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 700, letterSpacing: "-0.03em", color: "#fff", marginBottom: 12 },
  sectionSub: { fontSize: 15, color: "#666", lineHeight: 1.7, maxWidth: 460, margin: "0 auto" },
  steps: { border: "1px solid #1a1a1a", borderRadius: 12, overflow: "hidden" },
  step: { display: "flex", gap: 20, padding: "26px 28px", borderBottom: "1px solid #141414", background: "#0c0c0c", alignItems: "flex-start" },
  stepN: { width: 26, height: 26, borderRadius: "50%", background: "#161616", border: "1px solid #252525", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#555", flexShrink: 0, marginTop: 1 },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: 500, color: "#ddd", marginBottom: 5 },
  stepDesc: { fontSize: 13, color: "#555", lineHeight: 1.65 },
  sourceGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 },
  sourceCard: { background: "#0c0c0c", border: "1px solid #1a1a1a", borderRadius: 12, padding: "26px 22px" },
  sourceName: { fontSize: 14, fontWeight: 600, color: "#ddd", marginBottom: 8 },
  sourceDesc: { fontSize: 13, color: "#555", lineHeight: 1.65 },
  pricingGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 },
  priceCard: { background: "#0c0c0c", border: "1px solid #1a1a1a", borderRadius: 12, padding: "26px 22px", display: "flex", flexDirection: "column" as const, gap: 6 },
  priceCardHL: { background: "#111", border: "1px solid #2a2a2a" },
  priceHL: { fontSize: 11, color: "#666", letterSpacing: "0.06em", textTransform: "uppercase" as const },
  priceName: { fontSize: 13, color: "#555" },
  priceAmount: { fontSize: 38, fontWeight: 700, letterSpacing: "-0.04em", color: "#fff", lineHeight: 1, marginTop: 4 },
  priceSearches: { fontSize: 13, color: "#777" },
  pricePer: { fontSize: 12, color: "#3a3a3a", marginBottom: 6 },
  priceBtn: { fontSize: 13, color: "#666", background: "#141414", border: "1px solid #222", padding: "9px 16px", borderRadius: 8, textDecoration: "none", textAlign: "center" as const, marginTop: "auto" },
  priceBtnHL: { background: "#fff", color: "#000", border: "1px solid #fff" },
  pricingFootnote: { fontSize: 13, color: "#333", textAlign: "center" as const },
  footer: { borderTop: "1px solid #141414", padding: "32px 0" },
  footerInner: { maxWidth: 1100, margin: "0 auto", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 16 },
  footerLogo: { fontSize: 14, fontWeight: 600, color: "#333" },
  footerLinks: { display: "flex", gap: 24 },
  footerLink: { fontSize: 13, color: "#333", textDecoration: "none" },
  footerCopy: { fontSize: 13, color: "#2a2a2a" },
};
