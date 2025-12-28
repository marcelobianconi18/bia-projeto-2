import { buildApiUrl } from "./apiConfig";

const withTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 9000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const json = await res.json().catch(() => null);
    return { res, json };
  } finally {
    clearTimeout(timeout);
  }
};

export const fetchMetaHotspots = async (briefing: any, scope: any = {}, max = 20) => {
  try {
    const { res, json } = await withTimeout(buildApiUrl('/api/meta/hotspots'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ briefing, scope, max })
    }, 9000);

    if (!res) return { status: 'UNAVAILABLE', hotspots: [], provenance: { label: 'UNAVAILABLE', source: 'META_ADS' } };

    if (res.status === 501) {
      return { status: 'NOT_CONFIGURED', hotspots: [], provenance: json?.provenance || { label: 'NOT_CONFIGURED', source: 'META_ADS' }, message: json?.message };
    }

    if (!res.ok) {
      return { status: 'UNAVAILABLE', hotspots: [], provenance: json?.provenance || { label: 'UNAVAILABLE', source: 'META_ADS' } };
    }

    // Expecting { status, hotspots, provenance }
    return { status: json?.status || 'UNAVAILABLE', hotspots: json?.hotspots || [], provenance: json?.provenance || { label: 'UNAVAILABLE', source: 'META_ADS' } };
  } catch (err) {
    return { status: 'UNAVAILABLE', hotspots: [], provenance: { label: 'UNAVAILABLE', source: 'META_ADS', notes: 'Fetch error' } };
  }
};
