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

  const handleSignup = async () => {
    if (!email || !password) { setError("Email and password required"); return; }
    setError("");
    setLoading(true);
    try {
      const data = await signup(email, password, name);
      saveKey(data.apiKey.key);
      setNewKey(data.apiKey.key);
      // Redirect after a short delay so the user can see and copy the key
      setTimeout(() => router.push("/dashboard"), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Signin validates email+password server-side, then redirects if they
  // already have a key stored. If not, falls through to ApiKeyLogin below.
  const handleSignin = async () => {
    if (!email || !password) { setError("Email and password required"); return; }
    setError("");
    setLoading(true);
    try {
      await signin(email, password);
      // Credentials valid — check if we have a stored key
      const stored = typeof window !== "undefined"
        ? localStorage.getItem("uncover_api_key")
        : null;
      if (stored) {
        router.push("/dashboard");
      } else {
        // Valid user but no key stored — show the key input
        setError("Credentials valid. Paste your saved API key below to continue.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyLogin = (key: string) => {
    if (!key.startsWith("sk_live_")) {
      setError("Invalid key format — expected sk_live_...");
      return;
    }
    saveKey(key);
    router.push("/dashboard");
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>UNCOVER</div>
        <p style={s.tagline}>Surface real problems from social data</p>

        <div style={s.tabs}>
          {(["signin", "signup"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(""); setNewKey(""); }}
              style={{ ...s.tab, ...(tab === t ? s.tabActive : s.tabInactive) }}
            >
              {t === "signin" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {/* Sign Up */}
        {tab === "signup" && !newKey && (
          <>
            <input
              style={s.input}
              placeholder="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              style={s.input}
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              style={s.input}
              type="password"
              placeholder="Password (min 8 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSignup()}
            />
            <button
              style={{ ...s.btn, opacity: loading ? 0.6 : 1 }}
              onClick={handleSignup}
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </>
        )}

        {/* Sign In — email+password to verify identity, then key input */}
        {tab === "signin" && (
          <>
            <input
              style={s.input}
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              style={s.input}
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSignin()}
            />
            <button
              style={{ ...s.btn, opacity: loading ? 0.6 : 1 }}
              onClick={handleSignin}
              disabled={loading}
            >
              {loading ? "Checking..." : "Verify Credentials"}
            </button>

            <div style={s.divider}>— then paste your API key —</div>
            <ApiKeyLogin onLogin={handleKeyLogin} />
          </>
        )}

        {error && <div style={s.error}>{error}</div>}

        {/* New key display — only on signup, shown once */}
        {newKey && (
          <div style={s.keyBox}>
            <div style={s.keyLabel}>Your API Key — copy it now, it won&apos;t be shown again</div>
            <div style={s.keyVal}>{newKey}</div>
            <div style={s.keyNote}>Redirecting to dashboard in 3s...</div>
          </div>
        )}
      </div>
    </div>
  );
}

function ApiKeyLogin({ onLogin }: { onLogin: (key: string) => void }) {
  const [key, setKey] = useState("");
  return (
    <div style={{ marginTop: 4 }}>
      <input
        style={s.input}
        placeholder="sk_live_..."
        value={key}
        onChange={(e) => setKey(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onLogin(key)}
      />
      <button style={s.btn} onClick={() => onLogin(key)}>
        Access Dashboard
      </button>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "#0f0f0f",
    border: "1px solid #1c1c1c",
    padding: "40px 36px",
  },
  logo: {
    fontFamily: "var(--sans)",
    fontWeight: 800,
    fontSize: 20,
    letterSpacing: "0.12em",
    color: "#e8e8e8",
    marginBottom: 8,
  },
  tagline: {
    fontFamily: "var(--mono)",
    fontSize: 12,
    color: "#444",
    marginBottom: 36,
  },
  tabs: { display: "flex", gap: 1, marginBottom: 28 },
  tab: {
    flex: 1,
    fontFamily: "var(--mono)",
    fontSize: 11,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    padding: "10px",
    border: "none",
    cursor: "pointer",
  },
  tabActive: { background: "#e8ff47", color: "#000", fontWeight: 700 },
  tabInactive: { background: "#161616", color: "#555", border: "1px solid #222" },
  input: {
    width: "100%",
    background: "#080808",
    border: "1px solid #1c1c1c",
    color: "#e8e8e8",
    fontFamily: "var(--mono)",
    fontSize: 13,
    padding: "12px 14px",
    outline: "none",
    boxSizing: "border-box" as const,
    marginBottom: 10,
    display: "block",
  },
  btn: {
    width: "100%",
    background: "#e8ff47",
    color: "#000",
    border: "none",
    fontFamily: "var(--mono)",
    fontSize: 12,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    fontWeight: 700,
    padding: "14px",
    cursor: "pointer",
    marginBottom: 8,
  },
  divider: {
    fontFamily: "var(--mono)",
    fontSize: 11,
    color: "#333",
    textAlign: "center" as const,
    margin: "20px 0 16px",
  },
  error: {
    marginTop: 16,
    fontFamily: "var(--mono)",
    fontSize: 12,
    color: "#f87171",
    background: "rgba(248,113,113,0.05)",
    border: "1px solid rgba(248,113,113,0.15)",
    padding: "12px 14px",
    lineHeight: 1.6,
  },
  keyBox: {
    marginTop: 20,
    background: "#080808",
    border: "1px solid rgba(232,255,71,0.25)",
    padding: "18px",
  },
  keyLabel: {
    fontFamily: "var(--mono)",
    fontSize: 10,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    color: "#555",
    marginBottom: 10,
  },
  keyVal: {
    fontFamily: "var(--mono)",
    fontSize: 12,
    color: "#e8ff47",
    wordBreak: "break-all" as const,
    lineHeight: 1.7,
    marginBottom: 12,
  },
  keyNote: { fontFamily: "var(--mono)", fontSize: 11, color: "#333" },
};
