"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signup, signin, saveKey } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [newKey, setNewKey] = useState("");

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      if (tab === "signup") {
        const data = await signup(email, password, name);
        saveKey(data.apiKey.key);
        setNewKey(data.apiKey.key);
        setTimeout(() => router.push("/dashboard"), 2500);
      } else {
        // signin returns user + apiKeys list (hashed, not raw)
        // User needs to paste their key
        setError("Sign in with your API key below — keys are hashed server-side and can't be retrieved.");
        setLoading(false);
        return;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyLogin = (key: string) => {
    if (!key.startsWith("sk_live_")) { setError("Invalid key format"); return; }
    saveKey(key);
    router.push("/dashboard");
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>UNCOVER</div>
        <p style={s.tagline}>Surface real problems from social data</p>

        <div style={s.tabs}>
          {(["signin", "signup"] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(""); }}
              style={{ ...s.tab, ...(tab === t ? s.tabActive : s.tabInactive) }}>
              {t === "signin" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {tab === "signup" && (
          <>
            <input style={s.input} placeholder="Name (optional)" value={name} onChange={e => setName(e.target.value)} />
            <input style={s.input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            <input style={s.input} type="password" placeholder="Password (min 8 chars)" value={password} onChange={e => setPassword(e.target.value)} />
            <button style={{ ...s.btn, opacity: loading ? 0.6 : 1 }} onClick={handleSubmit} disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </>
        )}

        {tab === "signin" && (
          <ApiKeyLogin onLogin={handleKeyLogin} />
        )}

        {error && <div style={s.error}>{error}</div>}

        {newKey && (
          <div style={s.keyBox}>
            <div style={s.keyLabel}>Your API Key — save this now, it will not be shown again</div>
            <div style={s.keyVal}>{newKey}</div>
            <div style={s.keyNote}>Redirecting to dashboard...</div>
          </div>
        )}
      </div>
    </div>
  );
}

function ApiKeyLogin({ onLogin }: { onLogin: (key: string) => void }) {
  const [key, setKey] = useState("");
  return (
    <div>
      <p style={{ fontFamily: "var(--mono)", fontSize: 12, color: "#555", marginBottom: 16, lineHeight: 1.7 }}>
        Paste your API key to access the dashboard. Keys start with <span style={{ color: "#e8ff47" }}>sk_live_</span>
      </p>
      <input style={s.input} placeholder="sk_live_..." value={key} onChange={e => setKey(e.target.value)} />
      <button style={s.btn} onClick={() => onLogin(key)}>Access Dashboard</button>
      <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#333", marginTop: 16, textAlign: "center" as const }}>
        No account? Switch to Sign Up above.
      </p>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", maxWidth: 420, background: "#0f0f0f", border: "1px solid #1c1c1c", padding: "40px 36px" },
  logo: { fontFamily: "var(--sans)", fontWeight: 800, fontSize: 20, letterSpacing: "0.12em", color: "#e8e8e8", marginBottom: 8 },
  tagline: { fontFamily: "var(--mono)", fontSize: 12, color: "#444", marginBottom: 36 },
  tabs: { display: "flex", gap: 1, marginBottom: 28 },
  tab: { flex: 1, fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" as const, padding: "10px", border: "none", cursor: "pointer" },
  tabActive: { background: "#e8ff47", color: "#000", fontWeight: 700 },
  tabInactive: { background: "#161616", color: "#555", border: "1px solid #222" },
  input: { width: "100%", background: "#080808", border: "1px solid #1c1c1c", color: "#e8e8e8", fontFamily: "var(--mono)", fontSize: 13, padding: "12px 14px", outline: "none", boxSizing: "border-box" as const, marginBottom: 10, display: "block" },
  btn: { width: "100%", background: "#e8ff47", color: "#000", border: "none", fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontWeight: 700, padding: "14px", cursor: "pointer" },
  error: { marginTop: 16, fontFamily: "var(--mono)", fontSize: 12, color: "#f87171", background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.15)", padding: "12px 14px", lineHeight: 1.6 },
  keyBox: { marginTop: 20, background: "#080808", border: "1px solid rgba(232,255,71,0.25)", padding: "18px" },
  keyLabel: { fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#555", marginBottom: 10 },
  keyVal: { fontFamily: "var(--mono)", fontSize: 12, color: "#e8ff47", wordBreak: "break-all" as const, lineHeight: 1.7, marginBottom: 12 },
  keyNote: { fontFamily: "var(--mono)", fontSize: 11, color: "#333" },
};
