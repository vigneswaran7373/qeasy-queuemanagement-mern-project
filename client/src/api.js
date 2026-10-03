const BASE = import.meta.env.VITE_API_URL || '/api';

export async function api(path, { method = 'GET', body, auth = false } = {}) {
  const token = auth ? localStorage.getItem('staffToken') : null;
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.message || 'Something went wrong'); e.status = res.status; throw e; }
  return data;
}

// Re-run `fn` every `ms` while mounted (used for live queue updates)
import { useEffect } from 'react';
export function usePoll(fn, ms, deps = []) {
  useEffect(() => {
    let stop = false;
    const run = () => { if (!stop && !document.hidden) fn(); };
    run();
    const id = setInterval(run, ms);
    return () => { stop = true; clearInterval(id); };
  }, deps); // eslint-disable-line
}
