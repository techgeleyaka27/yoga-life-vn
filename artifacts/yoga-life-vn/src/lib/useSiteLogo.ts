import { useState, useEffect } from "react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "");
const CACHE_KEY = "yoga_logo_url";
const CACHE_TTL = 5 * 60 * 1000;

let _cached: string | null = null;
let _cachedAt = 0;

export function useSiteLogo() {
  const defaultLogo = `${import.meta.env.BASE_URL}images/logo.png`;
  const [logoUrl, setLogoUrl] = useState<string>(() => {
    if (_cached && Date.now() - _cachedAt < CACHE_TTL) return _cached;
    try {
      const stored = sessionStorage.getItem(CACHE_KEY);
      if (stored) return stored;
    } catch { /* ignore */ }
    return defaultLogo;
  });

  useEffect(() => {
    if (_cached && Date.now() - _cachedAt < CACHE_TTL) {
      setLogoUrl(_cached);
      return;
    }
    fetch(`${BASE}/api/cms/settings`)
      .then(r => r.json())
      .then(({ settings }) => {
        const url = settings?.logo_url || defaultLogo;
        _cached = url;
        _cachedAt = Date.now();
        try { sessionStorage.setItem(CACHE_KEY, url); } catch { /* ignore */ }
        setLogoUrl(url);
      })
      .catch(() => setLogoUrl(defaultLogo));
  }, []);

  return logoUrl;
}

export function clearLogoCache() {
  _cached = null;
  _cachedAt = 0;
  try { sessionStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}
