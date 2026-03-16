"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface AdminStats {
  totalUsers: number;
  totalRevenue: number;
  totalSearches: number;
  totalCreditsOutstanding: number;
  recentUsers: Array<{ id: string; email: string; plan: string; credits: number; totalSpent: number; totalSearches: number; createdAt: string }>;
  recentSearches: Array<{ id: string; query: string; sources: string; status: string; cost: number; createdAt: string; user: { email: string } }>;
  revenueByDay: Array<{ date: string; revenue: number; searches: number }>;
}

const C = {
  bg: "#0a0a0a", surface: "#0f0f0f", border: "#1a1a1a",
  text: "#e0e0e0", textMuted: "#666", textDim: "#333",
  white: "#fff", black: "#000",
  green: "#22c55e", red: "#ef4444", yellow: "#eab308",
  radius: 10, radiusSm: 6, radiusLg: 14,
};

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" },
  nav: { borderBottom: `1px solid ${C.border}`, padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", background: C.surface },
  logo: { fontSize: 15, fontWeight: 600, color: C.white },
  badge: { fontSize: 11, color: C.yellow, background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.2)", padding: "3px 10px", borderRadius: 20 },
  body: { maxWidth: 1100, margin: "0 auto", padding: "32px 24px" },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 28 },
  statCard: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radiusLg, padding: "20px 22px" },
  statLabel: { fontSize: 12, color: C.textMuted, marginBottom: 8, display: "block" },
  statValue: { fontSize: 28, fontWeight: 700, letterSpacing: "-0.04em", color: C.white },
  sectionTitle: { fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 12, display: "block" },
  table: { width: "100%", borderCollapse: "collapse" as const, background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radiusLg, overflow: "hidden", marginBottom: 28 },
  th: { fontSize: 11, color: C.textMuted, padding: "11px 18px", textAlign: "left" as const, borderBottom: `1px solid ${C.border}`, fontWeight: 400, letterSpacing: "0.04em", textTransform: "uppercase" as const },
  td: { fontSize: 13, color: C.text, padding: "11px 18px", borderBottom: `1px solid #0f0f0f` },
  input: { background: "#0c0c0c", border: `1px solid ${C.border}`, borderRadius: C.radiusSm, color: C.text, fontSize: 13, padding: "9px 12px", outline: "none" },
  btn: { fontSize: 13, fontWeight: 500, padding: "9px 16px", border: "none", cursor: "pointer", borderRadius: C.radiusSm, background: C.white, color: C.black },
  btnGhost: { background: "transparent", color: C.textMuted, border: `1px solid ${C.border}` },
  error: { fontSize: 13, color: C.red, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: C.radiusSm, padding: "10px 14px", marginBottom: 14 },
  card: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radiusLg, padding: "22px 24px", marginBottom: 16 },
};

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [promoForm, setPromoForm] = useState({ code: "", credits: 10, maxUses: 1, expiresInDays: 30 });
  const [promoResult, setPromoResult] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "searches" | "promo">("overview");

  const login = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/api/admin/stats`, {
        headers: { "x-admin-password": password },
      });
      if (!res.ok) { setError("Invalid password"); return; }
      const data = await res.json();
      setStats(data); setAuthed(true);
    } catch { setError("Failed to connect"); }
    finally { setLoading(false); }
  };

  const refresh = async () => {
    const res = await fetch(`${API}/api/admin/stats`, {
      headers: { "x-admin-password": password },
    });
    if (res.ok) setStats(await res.json());
  };

  const createPromo = async () => {
    setPromoResult("");
    const res = await fetch(`${API}/api/admin/promo`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify(promoForm),
    });
    const data = await res.json();
    if (!res.ok) { setPromoResult(`Error: ${data.error}`); return; }
    setPromoResult(`Created: ${data.code} — ${data.credits} credits, ${data.maxUses} use(s)`);
  };

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div style={{ width: 360, background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radiusLg, padding: "32px 28px" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.white, marginBottom: 4 }}>Admin</div>
          <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 24 }}>Uncover dashboard</div>
          {error && <div style={s.error}>{error}</div>}
          <input type="password" style={{ ...s.input, width: "100%", marginBottom: 12, boxSizing: "border-box" as const }}
            placeholder="Admin password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && login()} />
          <button style={{ ...s.btn, width: "100%", opacity: loading ? 0.7 : 1 }} onClick={login} disabled={loading}>
            {loading ? "Checking..." : "Sign in"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <span style={s.logo}>Uncover</span>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={s.badge}>Admin</span>
          <button style={{ ...s.btn, ...s.btnGhost, fontSize: 12 }} onClick={refresh}>Refresh</button>
          <button style={{ ...s.btn, ...s.btnGhost, fontSize: 12 }} onClick={() => setAuthed(false)}>Sign out</button>
        </div>
      </nav>

      <div style={s.body}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, marginBottom: 28, background: "#0c0c0c", border: `1px solid ${C.border}`, borderRadius: C.radiusSm, padding: 3, width: "fit-content" }}>
          {(["overview", "users", "searches", "promo"] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              style={{ fontSize: 13, padding: "7px 16px", border: "none", cursor: "pointer", borderRadius: 4,
                ...(activeTab === t ? { background: "#1a1a1a", color: C.text, fontWeight: 500 } : { background: "transparent", color: C.textMuted }) }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === "overview" && stats && (
          <>
            <div style={s.statGrid}>
              <div style={s.statCard}>
                <span style={s.statLabel}>Total users</span>
                <div style={s.statValue}>{stats.totalUsers}</div>
              </div>
              <div style={s.statCard}>
                <span style={s.statLabel}>Total revenue</span>
                <div style={s.statValue}>${stats.totalRevenue.toFixed(2)}</div>
              </div>
              <div style={s.statCard}>
                <span style={s.statLabel}>Total searches</span>
                <div style={s.statValue}>{stats.totalSearches}</div>
              </div>
              <div style={s.statCard}>
                <span style={s.statLabel}>Credits outstanding</span>
                <div style={s.statValue}>{stats.totalCreditsOutstanding}</div>
              </div>
            </div>

            {stats.revenueByDay.length > 0 && (
              <div style={s.card}>
                <span style={s.sectionTitle}>Revenue last 7 days</span>
                <table style={{ ...s.table, marginBottom: 0, border: "none" }}>
                  <thead><tr>
                    <th style={s.th}>Date</th><th style={s.th}>Revenue</th><th style={s.th}>Searches</th>
                  </tr></thead>
                  <tbody>{stats.revenueByDay.map(d => (
                    <tr key={d.date}>
                      <td style={s.td}>{d.date}</td>
                      <td style={{ ...s.td, color: C.green }}>${d.revenue.toFixed(2)}</td>
                      <td style={{ ...s.td, color: C.textMuted }}>{d.searches}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === "users" && stats && (
          <>
            <span style={s.sectionTitle}>Recent users ({stats.totalUsers} total)</span>
            <table style={s.table}>
              <thead><tr>
                <th style={s.th}>Email</th><th style={s.th}>Plan</th><th style={s.th}>Credits</th><th style={s.th}>Spent</th><th style={s.th}>Searches</th><th style={s.th}>Joined</th>
              </tr></thead>
              <tbody>{stats.recentUsers.map(u => (
                <tr key={u.id}>
                  <td style={s.td}>{u.email}</td>
                  <td style={{ ...s.td, color: C.textMuted, textTransform: "capitalize" as const }}>{u.plan}</td>
                  <td style={{ ...s.td, color: u.credits > 0 ? C.green : C.textMuted }}>{u.credits}</td>
                  <td style={{ ...s.td, color: C.textMuted }}>${u.totalSpent.toFixed(2)}</td>
                  <td style={{ ...s.td, color: C.textMuted }}>{u.totalSearches}</td>
                  <td style={{ ...s.td, color: C.textMuted }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}</tbody>
            </table>
          </>
        )}

        {activeTab === "searches" && stats && (
          <>
            <span style={s.sectionTitle}>Recent searches</span>
            <table style={s.table}>
              <thead><tr>
                <th style={s.th}>Query</th><th style={s.th}>User</th><th style={s.th}>Sources</th><th style={s.th}>Status</th><th style={s.th}>Date</th>
              </tr></thead>
              <tbody>{stats.recentSearches.map(r => (
                <tr key={r.id}>
                  <td style={{ ...s.td, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{r.query}</td>
                  <td style={{ ...s.td, color: C.textMuted }}>{r.user.email}</td>
                  <td style={{ ...s.td, color: C.textMuted }}>{JSON.parse(r.sources).join(", ")}</td>
                  <td style={s.td}><span style={{ color: r.status === "completed" ? C.green : r.status === "failed" ? C.red : C.yellow, fontSize: 12, textTransform: "capitalize" as const }}>{r.status}</span></td>
                  <td style={{ ...s.td, color: C.textMuted }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}</tbody>
            </table>
          </>
        )}

        {activeTab === "promo" && (
          <div style={s.card}>
            <div style={{ fontSize: 14, fontWeight: 500, color: C.text, marginBottom: 6 }}>Create promo code</div>
            <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 20 }}>Generate a code that gives users free credits.</div>
            {promoResult && (
              <div style={{ ...s.card, background: promoResult.startsWith("Error") ? "rgba(239,68,68,0.06)" : "rgba(34,197,94,0.06)", border: `1px solid ${promoResult.startsWith("Error") ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)"}`, fontSize: 13, color: promoResult.startsWith("Error") ? C.red : C.green, marginBottom: 16 }}>
                {promoResult}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <span style={{ ...s.statLabel, marginBottom: 5 }}>Code <span style={{ color: C.textDim }}>(leave blank to auto-generate)</span></span>
                <input style={{ ...s.input, width: "100%", boxSizing: "border-box" as const }} placeholder="LAUNCH50"
                  value={promoForm.code} onChange={e => setPromoForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} />
              </div>
              <div>
                <span style={{ ...s.statLabel, marginBottom: 5 }}>Credits to grant</span>
                <input style={{ ...s.input, width: "100%", boxSizing: "border-box" as const }} type="number" min={1}
                  value={promoForm.credits} onChange={e => setPromoForm(p => ({ ...p, credits: parseInt(e.target.value) || 10 }))} />
              </div>
              <div>
                <span style={{ ...s.statLabel, marginBottom: 5 }}>Max uses</span>
                <input style={{ ...s.input, width: "100%", boxSizing: "border-box" as const }} type="number" min={1}
                  value={promoForm.maxUses} onChange={e => setPromoForm(p => ({ ...p, maxUses: parseInt(e.target.value) || 1 }))} />
              </div>
              <div>
                <span style={{ ...s.statLabel, marginBottom: 5 }}>Expires in (days)</span>
                <input style={{ ...s.input, width: "100%", boxSizing: "border-box" as const }} type="number" min={1}
                  value={promoForm.expiresInDays} onChange={e => setPromoForm(p => ({ ...p, expiresInDays: parseInt(e.target.value) || 30 }))} />
              </div>
            </div>
            <button style={s.btn} onClick={createPromo}>Create code</button>
          </div>
        )}
      </div>
    </div>
  );
}
