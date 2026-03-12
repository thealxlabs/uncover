"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const styles: Record<string, React.CSSProperties> = {
  nav: { borderBottom: "1px solid #1c1c1c", padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  wordmark: { fontWeight: 700, fontSize: 14, letterSpacing: "0.1em", textTransform: "uppercase" as const },
  navStatus: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#555", display: "flex", alignItems: "center", gap: 8 },
  pulse: { width: 6, height: 6, borderRadius: "50%", background: "#4ade80" },
  main: { maxWidth: 720, margin: "0 auto", padding: "64px 32px" },
  hero: { marginBottom: 56 },
  tag: { display: "inline-block", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#e8ff47", background: "rgba(232,255,71,0.07)", border: "1px solid rgba(232,255,71,0.2)", padding: "4px 10px", marginBottom: 24 },
  h1: { fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.05, marginBottom: 16, color: "#e8e8e8" },
  h1accent: { color: "#e8ff47" },
  sub: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, color: "#555", lineHeight: 1.8 },
  card: { background: "#0f0f0f", border: "1px solid #1c1c1c", padding: "28px 32px", marginBottom: 2 },
  label: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase" as const, color: "#333", marginBottom: 20, display: "block" },
  tabs: { display: "flex", gap: 1, marginBottom: 24 },
  tab: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" as const, padding: "10px 18px", border: "none", cursor: "pointer", transition: "all 0.1s" },
  tabActive: { background: "#e8ff47", color: "#000", fontWeight: 600 },
  tabInactive: { background: "#0f0f0f", color: "#555", border: "1px solid #1c1c1c" },
  input: { width: "100%", background: "#080808", border: "1px solid #1c1c1c", color: "#e8e8e8", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, padding: "12px 14px", outline: "none", boxSizing: "border-box" as const, marginBottom: 10 },
  btn: { width: "100%", background: "#e8ff47", color: "#000", border: "none", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontWeight: 600, padding: "14px", cursor: "pointer", marginTop: 4 },
  msgOk: { marginTop: 16, padding: "14px 18px", background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.2)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#4ade80", lineHeight: 1.7 },
  msgErr: { marginTop: 16, padding: "14px 18px", background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.2)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#f87171" },
  keyBox: { marginTop: 16, padding: "16px", background: "#080808", border: "1px solid rgba(232,255,71,0.2)" },
  keyLabel: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#555", marginBottom: 8, display: "block" },
  keyValue: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#e8ff47", wordBreak: "break-all" as const, lineHeight: 1.6 },
  docsSection: { marginTop: 2 },
  endpointRow: { background: "#0f0f0f", border: "1px solid #1c1c1c", borderTop: "none", padding: "14px 20px", display: "flex", alignItems: "center", gap: 14, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 },
  methodPost: { background: "rgba(74,222,128,0.08)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)", padding: "2px 8px", fontSize: 10, letterSpacing: "0.08em", minWidth: 38, textAlign: "center" as const },
  methodGet: { background: "rgba(96,165,250,0.08)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.2)", padding: "2px 8px", fontSize: 10, letterSpacing: "0.08em", minWidth: 38, textAlign: "center" as const },
  epPath: { color: "#e8e8e8", flex: 1 },
  epDesc: { color: "#333", fontSize: 11 },
  footer: { borderTop: "1px solid #1c1c1c", padding: "32px 32px", marginTop: 64, display: "flex", justifyContent: "space-between", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#333" },
};

export default function Home() {
  const [tab, setTab] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [apiKey, setApiKey] = useState("");

  const handleSubmit = async () => {
    setMsg(null);
    try {
      const endpoint = tab === "signup" ? "/api/auth/signup" : "/api/auth/signin";
      const body = tab === "signup" ? { email, password, name } : { email, password };
      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ type: "err", text: data.error || "Request failed" }); return; }

      if (tab === "signup") {
        setApiKey(data.apiKey.key);
        setMsg({ type: "ok", text: "Account created. Save your API key — it will not be shown again." });
      } else {
        setMsg({ type: "ok", text: `Signed in. You have ${data.apiKeys?.length ?? 0} API key(s) on this account.` });
      }
      setEmail(""); setPassword(""); setName("");
    } catch {
      setMsg({ type: "err", text: "Network error — is the API running?" });
    }
  };

  return (
    <>
      <nav style={styles.nav}>
        <span style={styles.wordmark}>Uncover</span>
        <span style={styles.navStatus}>
          <span style={styles.pulse} />
          API operational
        </span>
      </nav>

      <main style={styles.main}>
        <div style={styles.hero}>
          <div style={styles.tag}>v1.0.0 — Production</div>
          <h1 style={styles.h1}>
            Surface real problems<br />
            from <span style={styles.h1accent}>social data.</span>
          </h1>
          <p style={styles.sub}>
            Query Reddit, X, and HackerNews.<br />
            Receive structured pain points, trends, and AI analysis.
          </p>
        </div>

        {/* Auth Card */}
        <div style={styles.card}>
          <span style={styles.label}>Get Started</span>
          <div style={styles.tabs}>
            <button style={{ ...styles.tab, ...(tab === "signup" ? styles.tabActive : styles.tabInactive) }} onClick={() => setTab("signup")}>
              Sign Up
            </button>
            <button style={{ ...styles.tab, ...(tab === "signin" ? styles.tabActive : styles.tabInactive) }} onClick={() => setTab("signin")}>
              Sign In
            </button>
          </div>

          {tab === "signup" && (
            <input style={styles.input} type="text" placeholder="Name (optional)" value={name} onChange={e => setName(e.target.value)} />
          )}
          <input style={styles.input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input style={styles.input} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          <button style={styles.btn} onClick={handleSubmit}>
            {tab === "signup" ? "Create Account" : "Sign In"}
          </button>

          {msg && (
            <div style={msg.type === "ok" ? styles.msgOk : styles.msgErr}>
              {msg.text}
            </div>
          )}

          {apiKey && (
            <div style={styles.keyBox}>
              <span style={styles.keyLabel}>Your API Key — save this now</span>
              <div style={styles.keyValue}>{apiKey}</div>
            </div>
          )}
        </div>

        {/* Endpoints */}
        <div style={{ ...styles.card, marginTop: 40 }}>
          <span style={styles.label}>Endpoints</span>
        </div>
        <div style={styles.docsSection}>
          {[
            { method: "POST", path: "/api/auth/signup", desc: "Create account" },
            { method: "POST", path: "/api/auth/signin", desc: "Sign in" },
            { method: "POST", path: "/api/search", desc: "Submit search — Bearer token required" },
            { method: "GET", path: "/api/search/:id", desc: "Get results" },
            { method: "GET", path: "/api/billing/status", desc: "Plan & usage" },
            { method: "POST", path: "/api/billing/checkout", desc: "Upgrade plan" },
            { method: "POST", path: "/api/billing/portal", desc: "Manage subscription" },
          ].map((ep) => (
            <div key={ep.path} style={styles.endpointRow}>
              <span style={ep.method === "POST" ? styles.methodPost : styles.methodGet}>{ep.method}</span>
              <span style={styles.epPath}>{ep.path}</span>
              <span style={styles.epDesc}>{ep.desc}</span>
            </div>
          ))}
        </div>

        {/* CLI section */}
        <div style={{ ...styles.card, marginTop: 40 }}>
          <span style={styles.label}>CLI</span>
          <pre style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#555", lineHeight: 1.9, margin: 0 }}>
            <span style={{ color: "#e8ff47" }}>npm install -g @uncover/cli{"\n"}</span>
            <span style={{ color: "#e8e8e8" }}>uncover login{"\n"}</span>
            <span style={{ color: "#e8e8e8" }}>uncover scrape &quot;password manager frustrations&quot; --sources reddit,hackernews{"\n"}</span>
            <span style={{ color: "#e8e8e8" }}>uncover status</span>
          </pre>
        </div>
      </main>

      <footer style={styles.footer}>
        <span>Uncover &mdash; v1.0.0</span>
        <span>Surface real problems from social data</span>
      </footer>
    </>
  );
}
