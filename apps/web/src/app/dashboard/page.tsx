"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getBillingStatus,
  getKeys,
  getHistory,
  runSearch,
  createKey,
  deleteKey,
  createCheckout,
  createPortal,
  clearKey,
  isLoggedIn,
} from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Billing {
  plan: string;
  credits: number;
  totalSpent: number;
  totalSearches: number;
  isSubscriber: boolean;
  subscription: { creditsPerCycle: number; resetAt: string } | null;
  packs: Array<{
    key: string;
    name: string;
    credits: number;
    price: string;
    perSearch: string;
  }>;
  subscriptionPlans: Array<{
    key: string;
    name: string;
    creditsPerCycle: number;
    price: string;
    perSearch: string;
  }>;
  recentTransactions: Array<{
    id: string;
    type: string;
    credits: number;
    amountCents: number;
    description: string;
    createdAt: string;
  }>;
}

interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
  lastUsed: string | null;
}

interface HistoryItem {
  id: string;
  query: string;
  sources: string[];
  status: string;
  cost: number;
  createdAt: string;
}

interface Problem {
  text: string;
  frequency: number;
  sentiment: string;
}

interface SearchResult {
  requestId: string;
  problems: Problem[];
  summary: string;
  trends: string[];
  postsAnalyzed: number;
  cost: number;
  credits: { remaining: number };
}

type Tab = "overview" | "search" | "keys" | "billing";

const C = {
  bg: "#080808",
  surface: "#0f0f0f",
  border: "#1c1c1c",
  dim: "#1a1a1a",
  text: "#e8e8e8",
  muted: "#555",
  faint: "#2a2a2a",
  accent: "#e8ff47",
  accentDim: "rgba(232,255,71,0.07)",
  accentBorder: "rgba(232,255,71,0.18)",
  green: "#4ade80",
  red: "#f87171",
  yellow: "#fbbf24",
  blue: "#60a5fa",
  mono: "'IBM Plex Mono', monospace",
  sans: "'Syne', sans-serif",
};

const s: Record<string, React.CSSProperties> = {
  shell: { minHeight: "100vh", display: "flex", flexDirection: "column" },
  nav: {
    borderBottom: `1px solid ${C.border}`,
    padding: "0 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: 56,
    flexShrink: 0,
  },
  navLeft: { display: "flex", alignItems: "center", gap: 0 },
  wordmark: {
    fontFamily: C.sans,
    fontWeight: 800,
    fontSize: 14,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    color: C.text,
    marginRight: 32,
  },
  navTab: {
    fontFamily: C.mono,
    fontSize: 11,
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
    padding: "0 16px",
    height: 56,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    borderBottom: "2px solid transparent",
    transition: "all 0.1s",
  },
  navTabActive: { color: C.accent, borderBottomColor: C.accent },
  navTabInactive: { color: C.muted },
  navRight: { display: "flex", alignItems: "center", gap: 20 },
  planBadge: {
    fontFamily: C.mono,
    fontSize: 10,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    padding: "4px 10px",
    border: `1px solid ${C.faint}`,
    color: C.muted,
  },
  creditBadge: { fontFamily: C.mono, fontSize: 11, color: C.accent, letterSpacing: "0.05em" },
  logoutBtn: {
    fontFamily: C.mono,
    fontSize: 11,
    color: C.muted,
    background: "transparent",
    border: "none",
    cursor: "pointer",
  },
  body: {
    flex: 1,
    padding: "40px 32px",
    maxWidth: 1000,
    margin: "0 auto",
    width: "100%",
    boxSizing: "border-box" as const,
  },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 1,
    background: C.border,
    marginBottom: 32,
  },
  statCard: { background: C.surface, padding: "22px 24px" },
  statLabel: {
    fontFamily: C.mono,
    fontSize: 10,
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    color: C.muted,
    marginBottom: 10,
    display: "block",
  },
  statValue: {
    fontFamily: C.sans,
    fontSize: 32,
    fontWeight: 800,
    letterSpacing: "-0.03em",
    color: C.text,
  },
  statSub: { fontFamily: C.mono, fontSize: 11, color: C.muted, marginTop: 5 },
  sectionHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: C.mono,
    fontSize: 10,
    letterSpacing: "0.15em",
    textTransform: "uppercase" as const,
    color: C.muted,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    background: C.surface,
    border: `1px solid ${C.border}`,
  },
  th: {
    fontFamily: C.mono,
    fontSize: 10,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    color: C.muted,
    padding: "12px 20px",
    textAlign: "left" as const,
    borderBottom: `1px solid ${C.border}`,
    fontWeight: 400,
  },
  td: {
    fontFamily: C.mono,
    fontSize: 12,
    color: C.text,
    padding: "13px 20px",
    borderBottom: `1px solid ${C.dim}`,
  },
  input: {
    background: C.bg,
    border: `1px solid ${C.border}`,
    color: C.text,
    fontFamily: C.mono,
    fontSize: 13,
    padding: "11px 14px",
    outline: "none",
    boxSizing: "border-box" as const,
  },
  select: {
    background: C.bg,
    border: `1px solid ${C.border}`,
    color: C.text,
    fontFamily: C.mono,
    fontSize: 12,
    padding: "11px 14px",
    outline: "none",
    cursor: "pointer",
  },
  btn: {
    fontFamily: C.mono,
    fontSize: 11,
    letterSpacing: "0.07em",
    textTransform: "uppercase" as const,
    padding: "11px 18px",
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
  },
  btnPrimary: { background: C.accent, color: "#000" },
  btnGhost: {
    background: "transparent",
    color: C.muted,
    border: `1px solid ${C.faint}`,
  },
  btnDanger: {
    background: "transparent",
    color: C.red,
    border: `1px solid rgba(248,113,113,0.2)`,
  },
  row: { display: "flex", gap: 10, marginBottom: 10 },
  card: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    padding: "24px 28px",
    marginBottom: 2,
  },
  empty: {
    fontFamily: C.mono,
    fontSize: 12,
    color: C.muted,
    padding: "32px 20px",
    textAlign: "center" as const,
    background: C.surface,
    border: `1px solid ${C.border}`,
  },
  error: {
    fontFamily: C.mono,
    fontSize: 12,
    color: C.red,
    background: "rgba(248,113,113,0.05)",
    border: "1px solid rgba(248,113,113,0.15)",
    padding: "12px 16px",
    marginBottom: 16,
  },
  success: {
    fontFamily: C.mono,
    fontSize: 12,
    color: C.green,
    background: "rgba(74,222,128,0.05)",
    border: "1px solid rgba(74,222,128,0.15)",
    padding: "12px 16px",
    marginBottom: 16,
  },
};

export default function Dashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [billing, setBilling] = useState<Billing | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    try {
      const [b, h, k] = await Promise.all([
        getBillingStatus(),
        getHistory(5),
        getKeys(),
      ]);
      setBilling(b);
      setHistory(h.requests || []);
      setKeys(k.apiKeys || []);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("bought")) {
      setTab("billing");
      load();
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [load]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontFamily: C.mono, fontSize: 12, color: C.muted }}>
          Loading...
        </span>
      </div>
    );
  }

  return (
    <div style={s.shell}>
      <nav style={s.nav}>
        <div style={s.navLeft}>
          <span style={s.wordmark}>Uncover</span>
          {(["overview", "search", "keys", "billing"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                ...s.navTab,
                ...(tab === t ? s.navTabActive : s.navTabInactive),
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <div style={s.navRight}>
          {billing && <span style={s.planBadge}>{billing.plan}</span>}
          {billing && (
            <span style={s.creditBadge}>{billing.credits} credits</span>
          )}
          <button
            style={s.logoutBtn}
            onClick={() => {
              clearKey();
              router.push("/login");
            }}
          >
            Logout
          </button>
        </div>
      </nav>

      <div style={s.body}>
        {tab === "overview" && (
          <OverviewTab billing={billing} history={history} setTab={setTab} />
        )}
        {tab === "search" && <SearchTab onSearchDone={load} />}
        {tab === "keys" && <KeysTab keys={keys} onRefresh={load} />}
        {tab === "billing" && (
          <BillingTab billing={billing} onRefresh={load} />
        )}
      </div>
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────

function OverviewTab({
  billing,
  history,
  setTab,
}: {
  billing: Billing | null;
  history: HistoryItem[];
  setTab: (t: Tab) => void;
}) {
  const credits = billing?.credits ?? 0;
  return (
    <div>
      <div style={s.statGrid}>
        <div style={s.statCard}>
          <span style={s.statLabel}>Credits</span>
          <div
            style={{
              ...s.statValue,
              color: credits > 0 ? C.accent : C.red,
            }}
          >
            {credits}
          </div>
          <div style={s.statSub}>searches remaining</div>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>Plan</span>
          <div
            style={{
              ...s.statValue,
              fontSize: 24,
              textTransform: "uppercase" as const,
            }}
          >
            {billing?.plan ?? "payg"}
          </div>
          <div style={s.statSub}>
            {billing?.isSubscriber ? "subscription active" : "pay as you go"}
          </div>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>Total Searches</span>
          <div style={s.statValue}>{billing?.totalSearches ?? 0}</div>
          <div style={s.statSub}>all time</div>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>Total Spent</span>
          <div style={s.statValue}>
            ${(billing?.totalSpent ?? 0).toFixed(2)}
          </div>
          {credits === 0 && (
            <button
              onClick={() => setTab("billing")}
              style={{
                ...s.btn,
                ...s.btnPrimary,
                marginTop: 12,
                padding: "8px 14px",
                fontSize: 10,
              }}
            >
              Buy Credits
            </button>
          )}
        </div>
      </div>

      {billing?.subscription && (
        <div
          style={{
            background: C.accentDim,
            border: `1px solid ${C.accentBorder}`,
            padding: "14px 20px",
            marginBottom: 24,
            fontFamily: C.mono,
            fontSize: 12,
            color: C.muted,
            display: "flex",
            gap: 32,
          }}
        >
          <span>
            Subscription:{" "}
            <span style={{ color: C.accent }}>
              {billing.subscription.creditsPerCycle} credits
            </span>{" "}
            per cycle
          </span>
          <span>
            Next reset:{" "}
            <span style={{ color: C.text }}>
              {new Date(billing.subscription.resetAt).toLocaleDateString()}
            </span>
          </span>
        </div>
      )}

      <div style={{ marginBottom: 32 }}>
        <div style={s.sectionHead}>
          <span style={s.sectionTitle}>Recent Searches</span>
          <button
            onClick={() => setTab("search")}
            style={{ ...s.btn, ...s.btnGhost, fontSize: 10 }}
          >
            New Search
          </button>
        </div>
        {history.length === 0 ? (
          <div style={s.empty}>No searches yet.</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Query</th>
                <th style={s.th}>Sources</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Date</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td style={{ ...s.td, maxWidth: 320 }}>{h.query}</td>
                  <td style={{ ...s.td, color: C.muted }}>
                    {h.sources.join(", ")}
                  </td>
                  <td style={s.td}>
                    <StatusBadge status={h.status} />
                  </td>
                  <td style={{ ...s.td, color: C.muted }}>
                    {new Date(h.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Search ────────────────────────────────────────────────────────────────────

function SearchTab({ onSearchDone }: { onSearchDone: () => void }) {
  const [query, setQuery] = useState("");
  const [sources, setSources] = useState<string[]>(["reddit"]);
  const [limit, setLimit] = useState(20);
  const [excludeKw, setExcludeKw] = useState("");
  const [excludeSubs, setExcludeSubs] = useState("");
  const [minUpvotes, setMinUpvotes] = useState(0);
  const [maxAge, setMaxAge] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState("");

  const toggleSrc = (src: string) =>
    setSources((p) =>
      p.includes(src) ? p.filter((x) => x !== src) : [...p, src]
    );

  const submit = async () => {
    if (!query.trim()) { setError("Enter a search query"); return; }
    if (!sources.length) { setError("Select at least one source"); return; }
    setError("");
    setLoading(true);
    setResult(null);

    const opts: Record<string, unknown> = {};
    if (excludeKw)
      opts.excludeKeywords = excludeKw
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
    if (excludeSubs)
      opts.excludeSubreddits = excludeSubs
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    if (minUpvotes > 0) opts.minUpvotes = minUpvotes;
    if (maxAge) opts.maxAgeHours = parseInt(maxAge, 10);

    try {
      const data = await runSearch({ query, sources, limit, options: opts });
      setResult(data);
      onSearchDone();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ ...s.card, marginBottom: 24 }}>
        <div style={{ ...s.sectionHead, marginBottom: 20 }}>
          <span style={s.sectionTitle}>New Search — 1 credit per search</span>
        </div>
        {error && <div style={s.error}>{error}</div>}

        <div style={s.row}>
          <input
            style={{ ...s.input, flex: 1 }}
            placeholder='"CRM software frustrations"'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <select
            style={s.select}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            {[10, 20, 30, 50].map((n) => (
              <option key={n} value={n}>
                {n} posts
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <span style={{ ...s.statLabel, marginBottom: 8 }}>Sources</span>
          <div style={{ display: "flex", gap: 24 }}>
            {["reddit", "twitter", "hackernews"].map((src) => (
              <label
                key={src}
                style={{
                  fontFamily: C.mono,
                  fontSize: 12,
                  color: C.muted,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={sources.includes(src)}
                  onChange={() => toggleSrc(src)}
                  style={{ accentColor: C.accent }}
                />
                {src}
              </label>
            ))}
          </div>
        </div>

        <details style={{ marginBottom: 20 }}>
          <summary
            style={{
              fontFamily: C.mono,
              fontSize: 11,
              color: C.muted,
              cursor: "pointer",
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              marginBottom: 14,
              userSelect: "none" as const,
            }}
          >
            Exclusion Filters
          </summary>
          <div style={{ paddingTop: 14, display: "grid", gap: 10 }}>
            <div style={s.row}>
              <div style={{ flex: 1 }}>
                <span style={{ ...s.statLabel, marginBottom: 6 }}>
                  Exclude Keywords
                </span>
                <input
                  style={{ ...s.input, width: "100%" }}
                  placeholder="spam, ad, promoted"
                  value={excludeKw}
                  onChange={(e) => setExcludeKw(e.target.value)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ ...s.statLabel, marginBottom: 6 }}>
                  Exclude Subreddits
                </span>
                <input
                  style={{ ...s.input, width: "100%" }}
                  placeholder="memes, AskReddit"
                  value={excludeSubs}
                  onChange={(e) => setExcludeSubs(e.target.value)}
                />
              </div>
            </div>
            <div style={s.row}>
              <div style={{ flex: 1 }}>
                <span style={{ ...s.statLabel, marginBottom: 6 }}>
                  Min Upvotes
                </span>
                <input
                  style={{ ...s.input, width: "100%" }}
                  type="number"
                  min={0}
                  value={minUpvotes}
                  onChange={(e) =>
                    setMinUpvotes(Number(e.target.value) || 0)
                  }
                />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ ...s.statLabel, marginBottom: 6 }}>
                  Max Age (hours)
                </span>
                <input
                  style={{ ...s.input, width: "100%" }}
                  type="number"
                  placeholder="720 = 30 days"
                  value={maxAge}
                  onChange={(e) => setMaxAge(e.target.value)}
                />
              </div>
            </div>
          </div>
        </details>

        <button
          style={{
            ...s.btn,
            ...s.btnPrimary,
            opacity: loading ? 0.7 : 1,
            minWidth: 140,
          }}
          onClick={submit}
          disabled={loading}
        >
          {loading ? "Searching..." : "Run Search"}
        </button>
      </div>

      {loading && (
        <div style={s.empty}>
          Scraping {sources.join(", ")} and analyzing...
        </div>
      )}
      {result && <SearchResults result={result} />}
    </div>
  );
}

function SearchResults({ result }: { result: SearchResult }) {
  return (
    <div style={s.card}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <span style={s.sectionTitle}>
          {result.problems?.length ?? 0} problems — {result.postsAnalyzed}{" "}
          posts analyzed
        </span>
        <span style={{ fontFamily: C.mono, fontSize: 11, color: C.muted }}>
          {result.credits?.remaining} credits remaining
        </span>
      </div>
      {result.summary && (
        <div
          style={{
            fontFamily: C.mono,
            fontSize: 13,
            color: C.text,
            lineHeight: 1.8,
            marginBottom: 24,
            padding: "16px",
            background: C.bg,
            border: `1px solid ${C.border}`,
          }}
        >
          {result.summary}
        </div>
      )}
      {result.trends?.length > 0 && (
        <div
          style={{
            marginBottom: 24,
            display: "flex",
            flexWrap: "wrap" as const,
            gap: 8,
          }}
        >
          {result.trends.map((t, i) => (
            <span
              key={i}
              style={{
                fontFamily: C.mono,
                fontSize: 11,
                color: C.accent,
                background: C.accentDim,
                border: `1px solid ${C.accentBorder}`,
                padding: "4px 10px",
              }}
            >
              #{t}
            </span>
          ))}
        </div>
      )}
      {result.problems?.map((p, i) => (
        <div
          key={i}
          style={{
            borderBottom:
              i < result.problems.length - 1
                ? `1px solid ${C.dim}`
                : "none",
            paddingBottom: 16,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontFamily: C.sans,
              fontSize: 15,
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            {p.text}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                flex: 1,
                background: C.faint,
                height: 3,
                borderRadius: 2,
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(p.frequency / 10) * 100}%`,
                  background: C.accent,
                  borderRadius: 2,
                }}
              />
            </div>
            <span
              style={{
                fontFamily: C.mono,
                fontSize: 11,
                color:
                  p.sentiment === "frustrated" ? C.red : C.muted,
              }}
            >
              {p.sentiment}
            </span>
            <span style={{ fontFamily: C.mono, fontSize: 11, color: C.muted }}>
              {p.frequency}/10
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Keys ──────────────────────────────────────────────────────────────────────

function KeysTab({
  keys,
  onRefresh,
}: {
  keys: ApiKey[];
  onRefresh: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) { setError("Enter a key name"); return; }
    setLoading(true);
    setError("");
    try {
      const data = await createKey(newName);
      setNewKey(data.key);
      setNewName("");
      onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Revoke this key? This cannot be undone.")) return;
    try {
      await deleteKey(id);
      onRefresh();
    } catch (err: unknown) {
      console.error(err);
    }
  };

  return (
    <div>
      {error && <div style={s.error}>{error}</div>}
      {newKey && (
        <div style={s.success}>
          Key created — save it now, it won&apos;t be shown again:
          <br />
          <span style={{ color: C.accent, wordBreak: "break-all" }}>
            {newKey}
          </span>
        </div>
      )}

      <div style={{ ...s.row, marginBottom: 28 }}>
        <input
          style={{ ...s.input, flex: 1 }}
          placeholder="Key name e.g. Production"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <button
          style={{ ...s.btn, ...s.btnPrimary, opacity: loading ? 0.7 : 1 }}
          onClick={handleCreate}
          disabled={loading}
        >
          Create Key
        </button>
      </div>

      {keys.length === 0 ? (
        <div style={s.empty}>No API keys yet.</div>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Name</th>
              <th style={s.th}>Created</th>
              <th style={s.th}>Last Used</th>
              <th style={s.th}></th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id}>
                <td style={s.td}>{k.name}</td>
                <td style={{ ...s.td, color: C.muted }}>
                  {new Date(k.createdAt).toLocaleDateString()}
                </td>
                <td style={{ ...s.td, color: C.muted }}>
                  {k.lastUsed
                    ? new Date(k.lastUsed).toLocaleDateString()
                    : "Never"}
                </td>
                <td style={{ ...s.td, textAlign: "right" as const }}>
                  <button
                    style={{
                      ...s.btn,
                      ...s.btnDanger,
                      padding: "6px 12px",
                      fontSize: 10,
                    }}
                    onClick={() => handleDelete(k.id)}
                  >
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ ...s.card, marginTop: 28 }}>
        <span style={{ ...s.statLabel, display: "block", marginBottom: 10 }}>
          Usage
        </span>
        <pre
          style={{
            fontFamily: C.mono,
            fontSize: 12,
            color: C.muted,
            lineHeight: 1.9,
            margin: 0,
            overflowX: "auto",
          }}
        >
          {`curl -X POST ${API}/api/search \\
  -H "Authorization: Bearer sk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"query":"your topic","sources":["reddit"]}'`}
        </pre>
      </div>
    </div>
  );
}

// ── Billing ───────────────────────────────────────────────────────────────────

function BillingTab({
  billing,
  onRefresh,
}: {
  billing: Billing | null;
  onRefresh: () => void;
}) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [billingTab, setBillingTab] = useState<"credits" | "subscription">(
    "credits"
  );
  const [error, setError] = useState("");

  const buyPack = async (pack: string) => {
    setLoadingKey(pack);
    setError("");
    try {
      const data = await createCheckout(pack);
      window.location.href = data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setLoadingKey(null);
    }
  };

  const subscribe = async (plan: string) => {
    setLoadingKey(plan);
    setError("");
    try {
      const res = await fetch(`${API}/api/billing/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("uncover_api_key")}`,
        },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Subscribe failed");
      setLoadingKey(null);
    }
  };

  const portal = async () => {
    setLoadingKey("portal");
    setError("");
    try {
      const data = await createPortal();
      window.location.href = data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Portal failed");
      setLoadingKey(null);
    }
  };

  const packs = billing?.packs ?? [];
  const subPlans = billing?.subscriptionPlans ?? [];

  return (
    <div>
      <div style={{ ...s.sectionHead, marginBottom: 24 }}>
        <span style={s.sectionTitle}>Credits &amp; Billing</span>
        {billing?.isSubscriber && (
          <button
            style={{ ...s.btn, ...s.btnGhost }}
            onClick={portal}
            disabled={loadingKey === "portal"}
          >
            {loadingKey === "portal" ? "Redirecting..." : "Manage Subscription"}
          </button>
        )}
      </div>

      {error && <div style={s.error}>{error}</div>}

      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          padding: "24px 28px",
          marginBottom: 28,
          display: "flex",
          gap: 48,
          alignItems: "flex-start",
          flexWrap: "wrap" as const,
        }}
      >
        <div>
          <span style={s.statLabel}>Credit Balance</span>
          <div
            style={{
              fontFamily: C.sans,
              fontWeight: 800,
              fontSize: 44,
              letterSpacing: "-0.03em",
              color: (billing?.credits ?? 0) > 0 ? C.accent : C.red,
              lineHeight: 1,
            }}
          >
            {billing?.credits ?? 0}
          </div>
          <div
            style={{ fontFamily: C.mono, fontSize: 11, color: C.muted, marginTop: 6 }}
          >
            searches remaining
          </div>
        </div>
        <div style={{ borderLeft: `1px solid ${C.border}`, paddingLeft: 48 }}>
          <span style={s.statLabel}>How credits work</span>
          <div
            style={{ fontFamily: C.mono, fontSize: 12, color: C.muted, lineHeight: 2 }}
          >
            1 credit = 1 search
            <br />
            PAYG credits never expire
            <br />
            Subscription credits added each cycle
            <br />
            Both pools are shared
          </div>
        </div>
        {billing?.isSubscriber && billing.subscription && (
          <div style={{ borderLeft: `1px solid ${C.border}`, paddingLeft: 48 }}>
            <span style={s.statLabel}>Subscription</span>
            <div style={{ fontFamily: C.mono, fontSize: 12, color: C.text }}>
              <span style={{ color: C.accent }}>
                {billing.subscription.creditsPerCycle}
              </span>{" "}
              credits per cycle
              <br />
              <span style={{ color: C.muted }}>
                Resets{" "}
                {new Date(billing.subscription.resetAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: 1,
          marginBottom: 20,
          background: C.border,
        }}
      >
        {(["credits", "subscription"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setBillingTab(t)}
            style={{
              flex: 1,
              ...s.btn,
              padding: "12px",
              fontSize: 11,
              ...(billingTab === t
                ? s.btnPrimary
                : { background: C.surface, color: C.muted }),
            }}
          >
            {t === "credits" ? "Buy Credits (PAYG)" : "Subscribe (Monthly)"}
          </button>
        ))}
      </div>

      {billingTab === "credits" && (
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 1,
              background: C.border,
              marginBottom: 16,
            }}
          >
            {packs.map((p) => (
              <div
                key={p.key}
                style={{
                  background: p.key === "pro_pack" ? C.accentDim : C.surface,
                  border:
                    p.key === "pro_pack"
                      ? `1px solid ${C.accentBorder}`
                      : "none",
                  padding: "24px 20px",
                }}
              >
                <div style={{ ...s.statLabel, marginBottom: 10 }}>
                  {p.name}
                </div>
                <div
                  style={{
                    fontFamily: C.sans,
                    fontWeight: 800,
                    fontSize: 30,
                    letterSpacing: "-0.03em",
                    color: p.key === "pro_pack" ? C.accent : C.text,
                    marginBottom: 6,
                  }}
                >
                  {p.price}
                </div>
                <div
                  style={{ fontFamily: C.mono, fontSize: 12, color: C.muted, marginBottom: 4 }}
                >
                  {p.credits} searches
                </div>
                <div
                  style={{ fontFamily: C.mono, fontSize: 10, color: C.faint, marginBottom: 20 }}
                >
                  {p.perSearch}
                </div>
                <button
                  style={{
                    ...s.btn,
                    ...(p.key === "pro_pack" ? s.btnPrimary : s.btnGhost),
                    width: "100%",
                    opacity: loadingKey === p.key ? 0.7 : 1,
                  }}
                  onClick={() => buyPack(p.key)}
                  disabled={!!loadingKey}
                >
                  {loadingKey === p.key ? "..." : "Buy"}
                </button>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: C.mono, fontSize: 11, color: C.muted }}>
            One-time payment. Credits never expire. Stack with subscriptions.
          </div>
        </div>
      )}

      {billingTab === "subscription" && (
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 1,
              background: C.border,
              marginBottom: 16,
            }}
          >
            {subPlans.map((p) => (
              <div
                key={p.key}
                style={{
                  background: p.key === "team" ? C.accentDim : C.surface,
                  border:
                    p.key === "team" ? `1px solid ${C.accentBorder}` : "none",
                  padding: "28px 24px",
                }}
              >
                <div style={{ ...s.statLabel, marginBottom: 10 }}>
                  {p.name}
                </div>
                <div
                  style={{
                    fontFamily: C.sans,
                    fontWeight: 800,
                    fontSize: 30,
                    letterSpacing: "-0.03em",
                    color: p.key === "team" ? C.accent : C.text,
                    marginBottom: 6,
                  }}
                >
                  {p.price}
                </div>
                <div
                  style={{ fontFamily: C.mono, fontSize: 12, color: C.muted, marginBottom: 4 }}
                >
                  {p.creditsPerCycle} searches / mo
                </div>
                <div
                  style={{ fontFamily: C.mono, fontSize: 10, color: C.faint, marginBottom: 20 }}
                >
                  {p.perSearch} per search
                </div>
                {billing?.isSubscriber ? (
                  <button
                    style={{ ...s.btn, ...s.btnGhost, width: "100%" }}
                    onClick={portal}
                  >
                    Change Plan
                  </button>
                ) : (
                  <button
                    style={{
                      ...s.btn,
                      ...(p.key === "team" ? s.btnPrimary : s.btnGhost),
                      width: "100%",
                      opacity: loadingKey === p.key ? 0.7 : 1,
                    }}
                    onClick={() => subscribe(p.key)}
                    disabled={!!loadingKey}
                  >
                    {loadingKey === p.key ? "..." : "Subscribe"}
                  </button>
                )}
              </div>
            ))}
          </div>
          <div style={{ fontFamily: C.mono, fontSize: 11, color: C.muted }}>
            Credits added each billing cycle. Cancel anytime. Top up with PAYG
            packs if you go over.
          </div>
        </div>
      )}

      {billing?.recentTransactions && billing.recentTransactions.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div style={{ ...s.sectionHead, marginBottom: 12 }}>
            <span style={s.sectionTitle}>Transaction History</span>
          </div>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Description</th>
                <th style={s.th}>Credits</th>
                <th style={s.th}>Amount</th>
                <th style={s.th}>Date</th>
              </tr>
            </thead>
            <tbody>
              {billing.recentTransactions.map((t) => (
                <tr key={t.id}>
                  <td style={s.td}>{t.description}</td>
                  <td
                    style={{
                      ...s.td,
                      color: t.credits > 0 ? C.green : C.red,
                    }}
                  >
                    {t.credits > 0 ? "+" : ""}
                    {t.credits}
                  </td>
                  <td style={{ ...s.td, color: C.muted }}>
                    {t.amountCents > 0
                      ? `$${(t.amountCents / 100).toFixed(2)}`
                      : "—"}
                  </td>
                  <td style={{ ...s.td, color: C.muted }}>
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "completed"
      ? C.green
      : status === "failed"
      ? C.red
      : C.yellow;
  return (
    <span
      style={{
        fontFamily: C.mono,
        fontSize: 10,
        letterSpacing: "0.08em",
        color,
        textTransform: "uppercase" as const,
      }}
    >
      {status}
    </span>
  );
}

