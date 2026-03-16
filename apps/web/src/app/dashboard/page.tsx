"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getBillingStatus, getKeys, getHistory, runSearch,
  createKey, deleteKey, createCheckout, createPortal, clearKey, isLoggedIn,
} from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Billing {
  plan: string; credits: number; totalSpent: number; totalSearches: number;
  isSubscriber: boolean;
  subscription: { creditsPerCycle: number; resetAt: string } | null;
  packs: Array<{ key: string; name: string; credits: number; price: string; perSearch: string }>;
  subscriptionPlans: Array<{ key: string; name: string; creditsPerCycle: number; price: string; perSearch: string }>;
  recentTransactions: Array<{ id: string; type: string; credits: number; amountCents: number; description: string; createdAt: string }>;
}
interface ApiKey { id: string; name: string; createdAt: string; lastUsed: string | null; }
interface HistoryItem { id: string; query: string; sources: string[]; status: string; cost: number; createdAt: string; }
interface Problem { text: string; frequency: number; sentiment: string; }
interface SearchResult { requestId: string; problems: Problem[]; summary: string; trends: string[]; postsAnalyzed: number; cost: number; creditsUsed: number; credits: { remaining: number }; }
type Tab = "overview" | "search" | "keys" | "billing";

const C = {
  bg: "#0a0a0a", surface: "#0f0f0f",
  border: "#1a1a1a", borderStrong: "#222",
  text: "#e0e0e0", textMuted: "#666", textDim: "#333",
  white: "#fff", black: "#000",
  green: "#22c55e", red: "#ef4444", yellow: "#eab308",
  radius: 10, radiusSm: 6, radiusLg: 14,
};

const s: Record<string, React.CSSProperties> = {
  shell: { minHeight: "100vh", display: "flex", flexDirection: "column", background: C.bg, fontFamily: "'Inter', system-ui, sans-serif", color: C.text },
  nav: { borderBottom: `1px solid ${C.border}`, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52, background: C.surface },
  navLeft: { display: "flex", alignItems: "center" },
  wordmark: { fontSize: 15, fontWeight: 600, letterSpacing: "-0.02em", color: C.white, marginRight: 28 },
  navTab: { fontSize: 13, padding: "0 14px", height: 52, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", borderBottom: "2px solid transparent" },
  navTabActive: { color: C.white, borderBottomColor: C.white },
  navTabInactive: { color: C.textMuted },
  navRight: { display: "flex", alignItems: "center", gap: 16 },
  planBadge: { fontSize: 11, color: C.textMuted, background: "#141414", border: `1px solid ${C.border}`, padding: "3px 10px", borderRadius: 20 },
  creditBadge: { fontSize: 13, color: C.white, fontWeight: 500 },
  logoutBtn: { fontSize: 13, color: C.textMuted, background: "transparent", border: "none", cursor: "pointer" },
  body: { flex: 1, padding: "32px 24px", maxWidth: 960, margin: "0 auto", width: "100%", boxSizing: "border-box" as const },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 28 },
  statCard: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radiusLg, padding: "20px 22px" },
  statLabel: { fontSize: 12, color: C.textMuted, marginBottom: 8, display: "block" },
  statValue: { fontSize: 28, fontWeight: 700, letterSpacing: "-0.04em", color: C.white },
  statSub: { fontSize: 12, color: C.textDim, marginTop: 4 },
  sectionHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  sectionTitle: { fontSize: 13, fontWeight: 500, color: C.text },
  table: { width: "100%", borderCollapse: "collapse" as const, background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radiusLg, overflow: "hidden" },
  th: { fontSize: 11, color: C.textMuted, padding: "11px 18px", textAlign: "left" as const, borderBottom: `1px solid ${C.border}`, fontWeight: 400, letterSpacing: "0.04em", textTransform: "uppercase" as const },
  td: { fontSize: 13, color: C.text, padding: "12px 18px", borderBottom: `1px solid #0f0f0f` },
  input: { background: "#0c0c0c", border: `1px solid ${C.border}`, borderRadius: C.radiusSm, color: C.text, fontSize: 13, padding: "9px 12px", outline: "none", boxSizing: "border-box" as const, width: "100%" },
  select: { background: "#0c0c0c", border: `1px solid ${C.border}`, borderRadius: C.radiusSm, color: C.text, fontSize: 13, padding: "9px 12px", outline: "none", cursor: "pointer" },
  btn: { fontSize: 13, fontWeight: 500, padding: "9px 16px", border: "none", cursor: "pointer", borderRadius: C.radiusSm },
  btnPrimary: { background: C.white, color: C.black },
  btnGhost: { background: "transparent", color: C.textMuted, border: `1px solid ${C.border}` },
  btnDanger: { background: "transparent", color: C.red, border: `1px solid rgba(239,68,68,0.2)` },
  row: { display: "flex", gap: 8, marginBottom: 10 },
  card: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radiusLg, padding: "22px 24px", marginBottom: 2 },
  empty: { fontSize: 13, color: C.textMuted, padding: "32px 20px", textAlign: "center" as const, background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radiusLg },
  error: { fontSize: 13, color: C.red, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: C.radiusSm, padding: "10px 14px", marginBottom: 14 },
  success: { fontSize: 13, color: C.green, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: C.radiusSm, padding: "10px 14px", marginBottom: 14 },
  segmented: { display: "flex", background: "#0c0c0c", border: `1px solid ${C.border}`, borderRadius: C.radiusSm, padding: 3, gap: 2, width: "fit-content", marginBottom: 18 },
  segBtn: { fontSize: 12, padding: "6px 14px", border: "none", cursor: "pointer", borderRadius: 4 },
  segActive: { background: "#1a1a1a", color: C.text, fontWeight: 500 },
  segInactive: { background: "transparent", color: C.textMuted },
};

export default function Dashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [billing, setBilling] = useState<Billing | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    try {
      const [b, h, k] = await Promise.all([getBillingStatus(), getHistory(5), getKeys()]);
      setBilling(b); setHistory(h.requests || []); setKeys(k.apiKeys || []);
    } catch { router.push("/login"); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("bought")) { setTab("billing"); load(); window.history.replaceState({}, "", "/dashboard"); }
  }, [load]);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
      <span style={{ fontSize: 13, color: C.textMuted }}>Loading...</span>
    </div>
  );

  return (
    <div style={s.shell}>
      <nav style={s.nav}>
        <div style={s.navLeft}>
          <span style={s.wordmark}>Uncover</span>
          {(["overview", "search", "keys", "billing"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ ...s.navTab, ...(tab === t ? s.navTabActive : s.navTabInactive) }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div style={s.navRight}>
          {billing && <span style={s.planBadge}>{billing.plan}</span>}
          {billing && <span style={s.creditBadge}>{billing.credits} credits</span>}
          <button style={s.logoutBtn} onClick={() => { clearKey(); router.push("/login"); }}>Sign out</button>
        </div>
      </nav>
      <div style={s.body}>
        {tab === "overview" && <OverviewTab billing={billing} history={history} setTab={setTab} />}
        {tab === "search" && <SearchTab onSearchDone={load} />}
        {tab === "keys" && <KeysTab keys={keys} onRefresh={load} />}
        {tab === "billing" && <BillingTab billing={billing} onRefresh={load} />}
      </div>
    </div>
  );
}

function OverviewTab({ billing, history, setTab }: { billing: Billing | null; history: HistoryItem[]; setTab: (t: Tab) => void }) {
  const credits = billing?.credits ?? 0;
  return (
    <div>
      <div style={s.statGrid}>
        <div style={s.statCard}>
          <span style={s.statLabel}>Credits remaining</span>
          <div style={{ ...s.statValue, color: credits > 0 ? C.white : C.red }}>{credits}</div>
          {credits === 0 && <button onClick={() => setTab("billing")} style={{ ...s.btn, ...s.btnPrimary, marginTop: 10, fontSize: 12 }}>Buy credits</button>}
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>Plan</span>
          <div style={{ ...s.statValue, fontSize: 20, textTransform: "capitalize" as const }}>{billing?.plan ?? "payg"}</div>
          <div style={s.statSub}>{billing?.isSubscriber ? "Subscription active" : "Pay as you go"}</div>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>Total searches</span>
          <div style={s.statValue}>{billing?.totalSearches ?? 0}</div>
          <div style={s.statSub}>All time</div>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>Total spent</span>
          <div style={s.statValue}>${(billing?.totalSpent ?? 0).toFixed(2)}</div>
        </div>
      </div>

      {billing?.subscription && (
        <div style={{ background: "#0f110f", border: "1px solid #1a2a1a", borderRadius: C.radiusLg, padding: "14px 18px", marginBottom: 20, fontSize: 13, color: C.textMuted, display: "flex", gap: 28 }}>
          <span>Subscription: <span style={{ color: C.green }}>{billing.subscription.creditsPerCycle} credits</span>/cycle</span>
          <span>Resets: <span style={{ color: C.text }}>{new Date(billing.subscription.resetAt).toLocaleDateString()}</span></span>
        </div>
      )}

      <div>
        <div style={s.sectionHead}>
          <span style={s.sectionTitle}>Recent searches</span>
          <button onClick={() => setTab("search")} style={{ ...s.btn, ...s.btnGhost, fontSize: 12 }}>New search</button>
        </div>
        {history.length === 0 ? (
          <div style={s.empty}>No searches yet. <button onClick={() => setTab("search")} style={{ color: C.white, background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>Run your first search →</button></div>
        ) : (
          <table style={s.table}>
            <thead><tr>
              <th style={s.th}>Query</th><th style={s.th}>Sources</th><th style={s.th}>Status</th><th style={s.th}>Date</th>
            </tr></thead>
            <tbody>{history.map(h => (
              <tr key={h.id}>
                <td style={{ ...s.td, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{h.query}</td>
                <td style={{ ...s.td, color: C.textMuted }}>{h.sources.join(", ")}</td>
                <td style={s.td}><StatusBadge status={h.status} /></td>
                <td style={{ ...s.td, color: C.textMuted }}>{new Date(h.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SearchTab({ onSearchDone }: { onSearchDone: () => void }) {
  const [mode, setMode] = useState<"social" | "custom">("social");
  const [query, setQuery] = useState("");
  const [sources, setSources] = useState<string[]>(["reddit"]);
  const [limit, setLimit] = useState(20);
  const [urls, setUrls] = useState<string[]>([""]);
  const [excludeKw, setExcludeKw] = useState("");
  const [excludeSubs, setExcludeSubs] = useState("");
  const [minUpvotes, setMinUpvotes] = useState(0);
  const [maxAge, setMaxAge] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState("");

  const toggleSrc = (src: string) => setSources(p => p.includes(src) ? p.filter(x => x !== src) : [...p, src]);

  const addUrl = () => { if (urls.length < 5) setUrls([...urls, ""]); };
  const updateUrl = (i: number, val: string) => { const u = [...urls]; u[i] = val; setUrls(u); };
  const removeUrl = (i: number) => setUrls(urls.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!query.trim()) { setError("Enter a search query"); return; }
    if (mode === "social" && !sources.length) { setError("Select at least one source"); return; }
    if (mode === "custom") {
      const validUrls = urls.filter(u => u.trim());
      if (!validUrls.length) { setError("Enter at least one URL"); return; }
    }
    setError(""); setLoading(true); setResult(null);

    try {
      let body: Record<string, unknown>;
      if (mode === "custom") {
        body = { query, urls: urls.filter(u => u.trim()), limit };
      } else {
        const opts: Record<string, unknown> = {};
        if (excludeKw) opts.excludeKeywords = excludeKw.split(",").map(k => k.trim()).filter(Boolean);
        if (excludeSubs) opts.excludeSubreddits = excludeSubs.split(",").map(s => s.trim()).filter(Boolean);
        if (minUpvotes > 0) opts.minUpvotes = minUpvotes;
        if (maxAge) opts.maxAgeHours = parseInt(maxAge, 10);
        body = { query, sources, limit, options: opts };
      }
      const data = await runSearch(body);
      setResult(data); onSearchDone();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ ...s.card, marginBottom: 16 }}>
        <div style={{ ...s.sectionHead, marginBottom: 18 }}>
          <span style={s.sectionTitle}>New search</span>
          <span style={{ fontSize: 12, color: C.textMuted }}>
            {mode === "custom" ? "2 credits per search" : "1 credit per search"}
          </span>
        </div>
        {error && <div style={s.error}>{error}</div>}

        {/* Mode toggle */}
        <div style={s.segmented}>
          <button style={{ ...s.segBtn, ...(mode === "social" ? s.segActive : s.segInactive) }} onClick={() => setMode("social")}>
            Social sources
          </button>
          <button style={{ ...s.segBtn, ...(mode === "custom" ? s.segActive : s.segInactive) }} onClick={() => setMode("custom")}>
            Custom URLs
            <span style={{ fontSize: 10, color: "#e8ff47", marginLeft: 6, background: "rgba(232,255,71,0.1)", padding: "1px 5px", borderRadius: 3 }}>2 credits</span>
          </button>
        </div>

        <div style={s.row}>
          <input style={s.input} placeholder={mode === "custom" ? "What are you analyzing? e.g. customer complaints" : '"CRM software frustrations"'}
            value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
          {mode === "social" && (
            <select style={{ ...s.select, width: 120 }} value={limit} onChange={e => setLimit(Number(e.target.value))}>
              {[10, 20, 30, 50].map(n => <option key={n} value={n}>{n} posts</option>)}
            </select>
          )}
        </div>

        {mode === "social" && (
          <>
            <div style={{ marginBottom: 16 }}>
              <span style={{ ...s.statLabel, marginBottom: 8 }}>Sources</span>
              <div style={{ display: "flex", gap: 20 }}>
                {["reddit", "twitter", "hackernews"].map(src => (
                  <label key={src} style={{ fontSize: 13, color: C.textMuted, display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
                    <input type="checkbox" checked={sources.includes(src)} onChange={() => toggleSrc(src)} />
                    {src}
                  </label>
                ))}
              </div>
            </div>
            <details style={{ marginBottom: 18 }}>
              <summary style={{ fontSize: 12, color: C.textMuted, cursor: "pointer", userSelect: "none" as const, marginBottom: 12 }}>Filters</summary>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, paddingTop: 10 }}>
                <div><span style={{ ...s.statLabel, marginBottom: 5 }}>Exclude keywords</span><input style={s.input} placeholder="spam, ad" value={excludeKw} onChange={e => setExcludeKw(e.target.value)} /></div>
                <div><span style={{ ...s.statLabel, marginBottom: 5 }}>Exclude subreddits</span><input style={s.input} placeholder="memes, AskReddit" value={excludeSubs} onChange={e => setExcludeSubs(e.target.value)} /></div>
                <div><span style={{ ...s.statLabel, marginBottom: 5 }}>Min upvotes</span><input style={s.input} type="number" min={0} value={minUpvotes} onChange={e => setMinUpvotes(Number(e.target.value) || 0)} /></div>
                <div><span style={{ ...s.statLabel, marginBottom: 5 }}>Max age (hours)</span><input style={s.input} type="number" placeholder="720 = 30 days" value={maxAge} onChange={e => setMaxAge(e.target.value)} /></div>
              </div>
            </details>
          </>
        )}

        {mode === "custom" && (
          <div style={{ marginBottom: 18 }}>
            <span style={{ ...s.statLabel, marginBottom: 10 }}>URLs to scrape <span style={{ color: C.textDim }}>(max 5)</span></span>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
              {urls.map((url, i) => (
                <div key={i} style={{ display: "flex", gap: 8 }}>
                  <input style={s.input} placeholder={`https://example.com/page`} value={url} onChange={e => updateUrl(i, e.target.value)} />
                  {urls.length > 1 && (
                    <button style={{ ...s.btn, ...s.btnDanger, padding: "9px 12px", flexShrink: 0 }} onClick={() => removeUrl(i)}>✕</button>
                  )}
                </div>
              ))}
              {urls.length < 5 && (
                <button style={{ ...s.btn, ...s.btnGhost, fontSize: 12, width: "fit-content" }} onClick={addUrl}>+ Add URL</button>
              )}
            </div>
            <div style={{ fontSize: 12, color: C.textDim, marginTop: 10, lineHeight: 1.7 }}>
              Scrapes any public website. Respects robots.txt. Social platforms (Facebook, Instagram, LinkedIn) are blocked.
            </div>
          </div>
        )}

        <button style={{ ...s.btn, ...s.btnPrimary, opacity: loading ? 0.7 : 1, minWidth: 120 }} onClick={submit} disabled={loading}>
          {loading ? "Searching..." : "Run search"}
        </button>
      </div>

      {loading && <div style={s.empty}>Scraping {mode === "custom" ? "custom URLs" : sources.join(", ")} and analyzing...</div>}
      {result && <SearchResults result={result} />}
    </div>
  );
}

function SearchResults({ result }: { result: SearchResult }) {
  return (
    <div style={s.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span style={s.sectionTitle}>{result.problems?.length ?? 0} problems · {result.postsAnalyzed} posts · {result.creditsUsed} credit{result.creditsUsed > 1 ? "s" : ""} used</span>
        <span style={{ fontSize: 12, color: C.textMuted }}>{result.credits?.remaining} remaining</span>
      </div>
      {result.summary && (
        <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.75, marginBottom: 20, background: "#0c0c0c", border: `1px solid ${C.border}`, borderRadius: C.radiusSm, padding: "14px 16px" }}>
          {result.summary}
        </div>
      )}
      {result.trends?.length > 0 && (
        <div style={{ marginBottom: 20, display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
          {result.trends.map((t, i) => (
            <span key={i} style={{ fontSize: 12, color: C.textMuted, background: "#111", border: `1px solid ${C.border}`, padding: "3px 10px", borderRadius: 20 }}>#{t}</span>
          ))}
        </div>
      )}
      {result.problems?.map((p, i) => (
        <div key={i} style={{ borderBottom: i < result.problems.length - 1 ? `1px solid #0f0f0f` : "none", paddingBottom: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, color: C.text }}>{p.text}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, background: "#141414", height: 3, borderRadius: 2 }}>
              <div style={{ height: "100%", width: `${(p.frequency / 10) * 100}%`, background: C.white, borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 12, color: p.sentiment === "frustrated" ? C.red : C.textMuted }}>{p.sentiment}</span>
            <span style={{ fontSize: 12, color: C.textDim }}>{p.frequency}/10</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function KeysTab({ keys, onRefresh }: { keys: ApiKey[]; onRefresh: () => void }) {
  const [newName, setNewName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) { setError("Enter a key name"); return; }
    setLoading(true); setError("");
    try { const data = await createKey(newName); setNewKey(data.key); setNewName(""); onRefresh(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Revoke this key?")) return;
    try { await deleteKey(id); onRefresh(); } catch (err) { console.error(err); }
  };

  return (
    <div>
      {error && <div style={s.error}>{error}</div>}
      {newKey && (
        <div style={s.success}>
          Key created — save it now, it won&apos;t be shown again:<br />
          <span style={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-all" as const }}>{newKey}</span>
        </div>
      )}
      <div style={{ ...s.row, marginBottom: 24 }}>
        <input style={s.input} placeholder="Key name e.g. Production" value={newName}
          onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCreate()} />
        <button style={{ ...s.btn, ...s.btnPrimary, opacity: loading ? 0.7 : 1, whiteSpace: "nowrap" as const }} onClick={handleCreate} disabled={loading}>
          Create key
        </button>
      </div>
      {keys.length === 0 ? <div style={s.empty}>No API keys yet.</div> : (
        <table style={s.table}>
          <thead><tr>
            <th style={s.th}>Name</th><th style={s.th}>Created</th><th style={s.th}>Last used</th><th style={s.th}></th>
          </tr></thead>
          <tbody>{keys.map(k => (
            <tr key={k.id}>
              <td style={s.td}>{k.name}</td>
              <td style={{ ...s.td, color: C.textMuted }}>{new Date(k.createdAt).toLocaleDateString()}</td>
              <td style={{ ...s.td, color: C.textMuted }}>{k.lastUsed ? new Date(k.lastUsed).toLocaleDateString() : "Never"}</td>
              <td style={{ ...s.td, textAlign: "right" as const }}>
                <button style={{ ...s.btn, ...s.btnDanger, padding: "5px 12px", fontSize: 12 }} onClick={() => handleDelete(k.id)}>Revoke</button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      )}
      <div style={{ ...s.card, marginTop: 24 }}>
        <span style={{ ...s.statLabel, display: "block", marginBottom: 10 }}>Usage example</span>
        <pre style={{ fontFamily: "monospace", fontSize: 12, color: C.textMuted, lineHeight: 1.8, margin: 0, overflowX: "auto" as const }}>
          {`curl -X POST ${API}/api/search \\
  -H "Authorization: Bearer sk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"query":"your topic","sources":["reddit"]}'`}
        </pre>
      </div>
    </div>
  );
}

function BillingTab({ billing, onRefresh }: { billing: Billing | null; onRefresh: () => void }) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [billingTab, setBillingTab] = useState<"credits" | "subscription" | "promo">("credits");
  const [error, setError] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoSuccess, setPromoSuccess] = useState("");

  const buyPack = async (pack: string) => {
    setLoadingKey(pack); setError("");
    try { const data = await createCheckout(pack); window.location.href = data.url; }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); setLoadingKey(null); }
  };

  const subscribe = async (plan: string) => {
    setLoadingKey(plan); setError("");
    try {
      const res = await fetch(`${API}/api/billing/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("uncover_api_key")}` },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); setLoadingKey(null); }
  };

  const portal = async () => {
    setLoadingKey("portal"); setError("");
    try { const data = await createPortal(); window.location.href = data.url; }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); setLoadingKey(null); }
  };

  const redeemPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true); setError(""); setPromoSuccess("");
    try {
      const res = await fetch(`${API}/api/billing/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("uncover_api_key")}` },
        body: JSON.stringify({ code: promoCode.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPromoSuccess(`${data.credits} credits added to your account!`);
      setPromoCode("");
      onRefresh();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Invalid promo code"); }
    finally { setPromoLoading(false); }
  };

  return (
    <div>
      <div style={{ ...s.sectionHead, marginBottom: 20 }}>
        <span style={s.sectionTitle}>Credits & billing</span>
        {billing?.isSubscriber && (
          <button style={{ ...s.btn, ...s.btnGhost }} onClick={portal} disabled={loadingKey === "portal"}>
            {loadingKey === "portal" ? "Redirecting..." : "Manage subscription"}
          </button>
        )}
      </div>

      {error && <div style={s.error}>{error}</div>}
      {promoSuccess && <div style={s.success}>{promoSuccess}</div>}

      <div style={{ ...s.card, marginBottom: 20, display: "flex", gap: 40, flexWrap: "wrap" as const }}>
        <div>
          <span style={s.statLabel}>Credit balance</span>
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-0.05em", color: (billing?.credits ?? 0) > 0 ? C.white : C.red, lineHeight: 1 }}>
            {billing?.credits ?? 0}
          </div>
          <div style={{ fontSize: 12, color: C.textDim, marginTop: 5 }}>searches remaining</div>
        </div>
        <div style={{ borderLeft: `1px solid ${C.border}`, paddingLeft: 40 }}>
          <span style={s.statLabel}>How credits work</span>
          <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 2 }}>
            1 credit = 1 social search<br />
            2 credits = 1 custom URL search<br />
            Credits never expire
          </div>
        </div>
      </div>

      <div style={{ ...s.segmented, marginBottom: 16 }}>
        {(["credits", "subscription", "promo"] as const).map(t => (
          <button key={t} onClick={() => setBillingTab(t)}
            style={{ ...s.segBtn, ...(billingTab === t ? s.segActive : s.segInactive) }}>
            {t === "credits" ? "Credit packs" : t === "subscription" ? "Subscriptions" : "Promo code"}
          </button>
        ))}
      </div>

      {billingTab === "credits" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 12 }}>
            {(billing?.packs ?? []).map(p => (
              <div key={p.key} style={{ ...s.card, ...(p.key === "pro_pack" ? { border: `1px solid ${C.borderStrong}` } : {}), marginBottom: 0 }}>
                <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>{p.name}</div>
                <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.04em", color: C.white, marginBottom: 4 }}>{p.price}</div>
                <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 2 }}>{p.credits} searches</div>
                <div style={{ fontSize: 11, color: C.textDim, marginBottom: 16 }}>{p.perSearch}</div>
                <button style={{ ...s.btn, ...(p.key === "pro_pack" ? s.btnPrimary : s.btnGhost), width: "100%", opacity: loadingKey === p.key ? 0.7 : 1 }}
                  onClick={() => buyPack(p.key)} disabled={!!loadingKey}>
                  {loadingKey === p.key ? "..." : "Buy"}
                </button>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: C.textDim }}>One-time payment. Credits never expire.</div>
        </div>
      )}

      {billingTab === "subscription" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 12 }}>
            {(billing?.subscriptionPlans ?? []).map(p => (
              <div key={p.key} style={{ ...s.card, ...(p.key === "team" ? { border: `1px solid ${C.borderStrong}` } : {}), marginBottom: 0 }}>
                <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>{p.name}</div>
                <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.04em", color: C.white, marginBottom: 4 }}>{p.price}</div>
                <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 2 }}>{p.creditsPerCycle} searches/mo</div>
                <div style={{ fontSize: 11, color: C.textDim, marginBottom: 16 }}>{p.perSearch} per search</div>
                {billing?.isSubscriber ? (
                  <button style={{ ...s.btn, ...s.btnGhost, width: "100%" }} onClick={portal}>Change plan</button>
                ) : (
                  <button style={{ ...s.btn, ...(p.key === "team" ? s.btnPrimary : s.btnGhost), width: "100%", opacity: loadingKey === p.key ? 0.7 : 1 }}
                    onClick={() => subscribe(p.key)} disabled={!!loadingKey}>
                    {loadingKey === p.key ? "..." : "Subscribe"}
                  </button>
                )}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: C.textDim }}>Credits added each billing cycle. Cancel anytime.</div>
        </div>
      )}

      {billingTab === "promo" && (
        <div style={s.card}>
          <div style={{ fontSize: 14, fontWeight: 500, color: C.text, marginBottom: 6 }}>Redeem a promo code</div>
          <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 20, lineHeight: 1.6 }}>
            Enter a promo code to add free credits to your account.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input style={s.input} placeholder="PROMO-CODE" value={promoCode}
              onChange={e => setPromoCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && redeemPromo()}
            />
            <button style={{ ...s.btn, ...s.btnPrimary, whiteSpace: "nowrap" as const, opacity: promoLoading ? 0.7 : 1 }}
              onClick={redeemPromo} disabled={promoLoading}>
              {promoLoading ? "..." : "Redeem"}
            </button>
          </div>
        </div>
      )}

      {billing?.recentTransactions && billing.recentTransactions.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ ...s.sectionHead, marginBottom: 12 }}>
            <span style={s.sectionTitle}>Transaction history</span>
          </div>
          <table style={s.table}>
            <thead><tr>
              <th style={s.th}>Description</th><th style={s.th}>Credits</th><th style={s.th}>Amount</th><th style={s.th}>Date</th>
            </tr></thead>
            <tbody>{billing.recentTransactions.map(t => (
              <tr key={t.id}>
                <td style={s.td}>{t.description}</td>
                <td style={{ ...s.td, color: t.credits > 0 ? C.green : C.red }}>{t.credits > 0 ? "+" : ""}{t.credits}</td>
                <td style={{ ...s.td, color: C.textMuted }}>{t.amountCents > 0 ? `$${(t.amountCents / 100).toFixed(2)}` : "—"}</td>
                <td style={{ ...s.td, color: C.textMuted }}>{new Date(t.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = status === "completed" ? C.green : status === "failed" ? C.red : C.yellow;
  return <span style={{ fontSize: 12, color, textTransform: "capitalize" as const }}>{status}</span>;
}
