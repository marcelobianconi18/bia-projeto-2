import { buildApiUrl } from './apiConfig';

const getEnv = () => {
  try {
    return (import.meta && import.meta.env) ? import.meta.env : {};
  } catch {
    return {};
  }
};

const isRealOnly = () => {
  const env = getEnv();
  if (typeof env.VITE_REAL_ONLY === 'string') return env.VITE_REAL_ONLY === 'true';
  if (typeof process !== 'undefined' && process.env && typeof process.env.VITE_REAL_ONLY === 'string') {
    return process.env.VITE_REAL_ONLY === 'true';
  }
  return false;
};

const withTimeout = async (url, options = {}, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeout);
  }
};

const verifyMetaConnection = async () => {
  try {
    const res = await withTimeout(buildApiUrl('/api/connectors/meta-ads/verify'));
    const json = await res.json().catch(() => null);
    return { status: json?.status || (res.ok ? 'REAL' : 'UNAVAILABLE'), data: json, provenance: json?.provenance };
  } catch (err) {
    return { status: 'UNAVAILABLE', data: null, provenance: { label: 'UNAVAILABLE', source: 'META_ADS', notes: 'Server unavailable' } };
  }
};

const metaTargetingSearch = async (query, kind) => {
  try {
    const res = await withTimeout(buildApiUrl('/api/meta-ads/targeting/search'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, kind })
    });
    const json = await res.json().catch(() => null);
    return { status: json?.status || 'UNAVAILABLE', results: json?.results || [], provenance: json?.provenance };
  } catch (err) {
    return { status: 'UNAVAILABLE', results: [], provenance: { label: 'UNAVAILABLE', source: 'META_ADS', notes: 'Server unavailable' } };
  }
};

const metaReachEstimate = async (payload) => {
  try {
    const res = await withTimeout(buildApiUrl('/api/meta-ads/reach-estimate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json().catch(() => null);
    return { status: json?.status || 'UNAVAILABLE', estimates: json?.estimates || null, provenance: json?.provenance };
  } catch (err) {
    return { status: 'UNAVAILABLE', estimates: null, provenance: { label: 'UNAVAILABLE', source: 'META_ADS', notes: 'Server unavailable' } };
  }
};

const buildBaseTargeting = (briefing) => {
  const gender = briefing.targetGender;
  const genders = gender === 'Mixed' ? ['M', 'F'] : gender === 'Male' ? ['M'] : gender === 'Female' ? ['F'] : [];
  return {
    geo: {
      city: briefing.geography.city,
      municipioId: briefing.geography.municipioId,
      lat: briefing.geography.lat,
      lng: briefing.geography.lng,
      state: briefing.geography.state,
      country: briefing.geography.country
    },
    ageRanges: briefing.targetAge || [],
    genders,
    objective: briefing.objective || 'N/A',
    operationalModel: briefing.operationalModel || undefined,
    positioning: briefing.marketPositioning || undefined
  };
};

const buildProvenance = (label, source, method, source_url, notes, attempts) => ({
  label,
  source,
  method,
  source_url,
  retrieved_at: new Date().toISOString(),
  notes,
  attempts
});

const extractKeywords = (text) => {
  const raw = String(text || '').toLowerCase();
  const stop = new Set(['de', 'da', 'do', 'para', 'com', 'sem', 'por', 'uma', 'um', 'que', 'e', 'a', 'o', 'as', 'os', 'no', 'na', 'nos', 'nas']);
  return raw
    .split(/[\s,.;:()]+/g)
    .map((w) => w.trim())
    .filter((w) => w.length > 3 && !stop.has(w));
};

const unique = (arr) => Array.from(new Set(arr));

export const buildMetaAdsPanel = async (briefingData) => {
  const realOnly = isRealOnly();
  const baseTargeting = buildBaseTargeting(briefingData);
  const tier = 5;

  const baseProvenance = buildProvenance('DERIVED', 'BIA', 'composition', undefined, 'Composicao do painel');
  const connection = {
    connected: Boolean(briefingData?.dataSources?.metaAds?.connected),
    accountId: briefingData?.dataSources?.metaAds?.adAccountId,
    businessId: briefingData?.dataSources?.metaAds?.businessId,
    pixelId: briefingData?.dataSources?.metaAds?.pixelId,
    datasetId: briefingData?.dataSources?.metaAds?.datasetId,
    lastVerifiedAt: undefined
  };

  if (realOnly) {
    return {
      status: 'UNAVAILABLE',
      connection: { ...connection, connected: false },
      baseTargeting,
      tier,
      refinements: [],
      estimates: { provenance: buildProvenance('UNAVAILABLE', 'META_ADS', 'REAL_ONLY', undefined, 'REAL_ONLY') },
      territory: {
        ibge: extractIbgeContext(briefingData),
        google: { timeseries168: null, provenance: buildProvenance('UNAVAILABLE', 'GOOGLE', 'REAL_ONLY', undefined, 'REAL_ONLY') },
        rfb: { poi_count: null, categories: [], provenance: buildProvenance('UNAVAILABLE', 'RFB', 'REAL_ONLY', undefined, 'REAL_ONLY') }
      },
      provenance: baseProvenance
    };
  }

  const metaStatus = connection.connected ? await verifyMetaConnection() : { status: 'NOT_CONFIGURED', data: null };
  const status = metaStatus?.status === 'REAL' ? 'REAL' : (metaStatus?.status || 'NOT_CONFIGURED');
  if (metaStatus?.data?.connection) {
    connection.connected = true;
    connection.lastVerifiedAt = metaStatus?.data?.connection?.lastVerifiedAt;
  }

  const refinements = await buildRefinements(briefingData, status);
  const estimates = await buildEstimates(status, baseTargeting, refinements);

  const territory = {
    ibge: extractIbgeContext(briefingData),
    google: await fetchGoogleTimeseries(briefingData),
    rfb: await fetchRfbSummary()
  };

  const exportPayload = buildExportPayload(status, refinements, baseTargeting);

  return {
    status,
    connection,
    baseTargeting,
    tier,
    refinements,
    estimates,
    territory,
    exportPayload,
    provenance: baseProvenance
  };
};

const extractIbgeContext = (briefingData) => {
  const ibge = briefingData?.ibgeData
    || briefingData?.geography?.selectedItems?.[0]?.ibgeData
    || null;

  if (!ibge) {
    return {
      population: null,
      income: null,
      provenance: buildProvenance('UNAVAILABLE', 'IBGE', 'missing', undefined, 'IBGE ausente no briefing')
    };
  }

  const prov = ibge.provenance || buildProvenance('PARTIAL_REAL', 'IBGE', 'briefing', undefined, 'IBGE sem provenance');
  return {
    population: typeof ibge.population === 'number' ? ibge.population : null,
    income: typeof ibge.income === 'number' ? ibge.income : null,
    provenance: {
      label: prov.label || 'PARTIAL_REAL',
      source: 'IBGE',
      method: prov.method,
      source_url: prov.source_url,
      retrieved_at: prov.retrieved_at,
      notes: prov.notes
    }
  };
};

const buildRefinements = async (briefingData, status) => {
  if (status !== 'REAL') return [];

  const keywords = unique([
    ...extractKeywords(briefingData.productDescription),
    ...extractKeywords(briefingData.usageDescription),
    ...extractKeywords(briefingData.contactMethod)
  ]).slice(0, 10);

  if (!keywords.length) return [];

  const searches = await Promise.all(
    keywords.map((q) => metaTargetingSearch(q, 'interest'))
  );

  const refinements = [];

  searches.forEach((result, idx) => {
    if (result.status !== 'REAL' || !Array.isArray(result.results)) return;
    const first = result.results[0];
    if (!first?.name || !first?.id) return;
    refinements.push({
      kind: 'INTEREST',
      name: first.name,
      metaId: first.id,
      rationale: `Derivado do briefing: "${keywords[idx]}"`,
      provenance: buildProvenance('REAL', 'META_ADS', 'targeting-search', undefined, result.provenance?.notes)
    });
  });

  return refinements;
};

const buildEstimates = async (status, baseTargeting, refinements) => {
  if (status !== 'REAL' || refinements.length === 0) {
    return { provenance: buildProvenance('UNAVAILABLE', 'META_ADS', 'missing', undefined, 'Sem estimativas') };
  }

  const payload = {
    baseTargeting,
    refinementsValidated: refinements.map((r) => ({ id: r.metaId, name: r.name, kind: r.kind }))
  };
  const res = await metaReachEstimate(payload);
  if (res.status !== 'REAL' || !res.estimates) {
    return { provenance: buildProvenance('UNAVAILABLE', 'META_ADS', 'reach-estimate', undefined, 'Meta sem estimativas') };
  }
  return {
    audience_size: res.estimates.audience_size,
    daily_reach: res.estimates.daily_reach,
    daily_leads: res.estimates.daily_leads,
    provenance: buildProvenance('REAL', 'META_ADS', 'reach-estimate', undefined, res.provenance?.notes)
  };
};

const fetchGoogleTimeseries = async (briefingData) => {
  try {
    const regionId = briefingData?.geography?.municipioId || briefingData?.geography?.city;
    if (!regionId) {
      return { timeseries168: null, provenance: buildProvenance('UNAVAILABLE', 'GOOGLE', 'missing', undefined, 'Sem regionId') };
    }
    const url = buildApiUrl(`/api/insights/timeseries168?source=GOOGLE_ADS&regionKind=MUNICIPIO&regionId=${encodeURIComponent(regionId)}&tz=America/Sao_Paulo&windowDays=28`);
    const res = await fetch(url);
    if (res.status === 501) {
      return { timeseries168: null, provenance: buildProvenance('NOT_CONFIGURED', 'GOOGLE', 'stub', undefined, 'Nao configurado') };
    }
    if (!res.ok) {
      return { timeseries168: null, provenance: buildProvenance('UNAVAILABLE', 'GOOGLE', 'fetch', undefined, `HTTP ${res.status}`) };
    }
    const data = await res.json();
    return { timeseries168: data, provenance: buildProvenance('REAL', 'GOOGLE', 'timeseries168', undefined, 'Google Ads timeseries') };
  } catch (err) {
    return { timeseries168: null, provenance: buildProvenance('UNAVAILABLE', 'GOOGLE', 'fetch', undefined, 'Erro ao buscar timeseries') };
  }
};

const fetchRfbSummary = async () => {
  try {
    const res = await fetch(buildApiUrl('/api/rfb/summary'));
    if (res.status === 501) {
      return { poi_count: null, categories: [], provenance: buildProvenance('NOT_CONFIGURED', 'RFB', 'stub', undefined, 'RFB nao configurado') };
    }
    if (!res.ok) {
      return { poi_count: null, categories: [], provenance: buildProvenance('UNAVAILABLE', 'RFB', 'fetch', undefined, `HTTP ${res.status}`) };
    }
    const data = await res.json();
    return {
      poi_count: typeof data?.poi_count === 'number' ? data.poi_count : null,
      categories: Array.isArray(data?.categories) ? data.categories : [],
      provenance: buildProvenance('REAL', 'RFB', 'summary', undefined, data?.notes)
    };
  } catch (err) {
    return { poi_count: null, categories: [], provenance: buildProvenance('UNAVAILABLE', 'RFB', 'fetch', undefined, 'Erro ao buscar RFB') };
  }
};

const buildExportPayload = (status, refinements, baseTargeting) => {
  const valid = status === 'REAL' && refinements.some((r) => r.metaId);
  if (!valid) return undefined;
  return {
    geo: baseTargeting.geo,
    ageRanges: baseTargeting.ageRanges,
    genders: baseTargeting.genders,
    interests: refinements.filter((r) => r.metaId).map((r) => ({ id: r.metaId, name: r.name, kind: r.kind })),
    exclusions: [],
    placements: []
  };
};
