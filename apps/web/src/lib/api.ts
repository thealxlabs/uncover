const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function getKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("uncover_api_key");
}

export function saveKey(key: string) {
  localStorage.setItem("uncover_api_key", key);
}

export function clearKey() {
  localStorage.removeItem("uncover_api_key");
}

export function isLoggedIn(): boolean {
  return !!getKey();
}

async function apiFetch(path: string, options: RequestInit = {}, auth = true) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (auth) {
    const key = getKey();
    if (key) headers["Authorization"] = `Bearer ${key}`;
  }
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const json = await res.json();
  if (!res.ok) throw new Error((json as any).error || res.statusText);
  return json;
}

export const signup = (email: string, password: string, name?: string) =>
  apiFetch("/api/auth/signup", { method: "POST", body: JSON.stringify({ email, password, name }) }, false);

export const signin = (email: string, password: string) =>
  apiFetch("/api/auth/signin", { method: "POST", body: JSON.stringify({ email, password }) }, false);

export const getBillingStatus = () => apiFetch("/api/billing/status");
export const getKeys = () => apiFetch("/api/auth/keys");
export const createKey = (name: string) => apiFetch("/api/auth/keys", { method: "POST", body: JSON.stringify({ name }) });
export const deleteKey = (id: string) => apiFetch(`/api/auth/keys/${id}`, { method: "DELETE" });
export const getHistory = (limit = 10) => apiFetch(`/api/search/history?limit=${limit}`);
export const runSearch = (body: object) => apiFetch("/api/search", { method: "POST", body: JSON.stringify(body) });
export const createCheckout = (pack: string) => apiFetch("/api/billing/checkout", { method: "POST", body: JSON.stringify({ pack }) });
export const createPortal = () => apiFetch("/api/billing/portal", { method: "POST" });
