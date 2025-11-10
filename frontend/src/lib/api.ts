const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  if (!API_BASE) {
    return path;
  }
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

export function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  return fetch(buildUrl(input), init);
}


