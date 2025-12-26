import { MetaAdsConfig, ConnectorResult } from '../../types';

const withTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeout);
  }
};

export const verifyMetaAds = async (config: MetaAdsConfig): Promise<ConnectorResult<any>> => {
  if (!config.connected) {
    return { status: 'NOT_CONFIGURED', provenance: 'UNAVAILABLE', data: null };
  }

  try {
    const res = await withTimeout('http://localhost:3001/api/connectors/meta-ads/verify');
    const json = await res.json().catch(() => null);
    if (res.status === 501) {
      return { status: 'NOT_CONFIGURED', provenance: 'UNAVAILABLE', data: null, notes: json?.message };
    }
    if (res.ok) {
      return { status: json?.status === 'REAL' ? 'SUCCESS' : 'UNAVAILABLE', provenance: json?.provenance?.label || 'UNAVAILABLE', data: json };
    }
    return { status: 'ERROR', provenance: 'UNAVAILABLE', data: null };
  } catch (err) {
    return { status: 'ERROR', provenance: 'UNAVAILABLE', data: null, notes: 'Server unavailable' };
  }
};

export const targetingSearch = async (query: string, kind: 'interest' | 'behavior' | 'demographic') => {
  try {
    const res = await withTimeout('http://localhost:3001/api/meta-ads/targeting/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, kind })
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      return { status: json?.status || 'UNAVAILABLE', results: [], provenance: json?.provenance || { label: 'UNAVAILABLE', source: 'META_ADS' } };
    }
    return { status: json?.status || 'UNAVAILABLE', results: json?.results || [], provenance: json?.provenance || { label: 'UNAVAILABLE', source: 'META_ADS' } };
  } catch (err) {
    return { status: 'UNAVAILABLE', results: [], provenance: { label: 'UNAVAILABLE', source: 'META_ADS', notes: 'Server unavailable' } };
  }
};

export const reachEstimate = async (payload: any) => {
  try {
    const res = await withTimeout('http://localhost:3001/api/meta-ads/reach-estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      return { status: json?.status || 'UNAVAILABLE', estimates: null, provenance: json?.provenance || { label: 'UNAVAILABLE', source: 'META_ADS' } };
    }
    return { status: json?.status || 'UNAVAILABLE', estimates: json?.estimates || null, provenance: json?.provenance || { label: 'UNAVAILABLE', source: 'META_ADS' } };
  } catch (err) {
    return { status: 'UNAVAILABLE', estimates: null, provenance: { label: 'UNAVAILABLE', source: 'META_ADS', notes: 'Server unavailable' } };
  }
};
