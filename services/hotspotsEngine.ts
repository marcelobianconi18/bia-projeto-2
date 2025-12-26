
// This file does not contain a leading markdown fence.
import { BriefingInteligente, Provenance } from "../types";

export interface HotspotResult {
    id: number;
    lat: number;
    lng: number;
    rank: number;
    name: string;
    type: string;
    score?: number;
    audience_total?: number | null;
    provenance: Provenance;
}

const extractHotspotsFromPayload = (payload: any): HotspotResult[] | null => {
    if (Array.isArray(payload)) return payload as HotspotResult[];
    if (payload && Array.isArray(payload.hotspots)) return payload.hotspots as HotspotResult[];
    if (payload && payload.data && Array.isArray(payload.data.hotspots)) return payload.data.hotspots as HotspotResult[];
    return null;
};

const centroidFromGeometry = (geometry: any, fallback: [number, number]): [number, number] => {
    try {
        const coords =
            geometry?.type === 'Polygon' ? geometry?.coordinates?.[0]
                : geometry?.type === 'MultiPolygon' ? geometry?.coordinates?.[0]?.[0]
                    : null;
        if (!Array.isArray(coords) || coords.length === 0) return fallback;
        let sumX = 0;
        let sumY = 0;
        for (const pt of coords) {
            if (!Array.isArray(pt) || pt.length < 2) continue;
            sumX += Number(pt[0]) || 0;
            sumY += Number(pt[1]) || 0;
        }
        const n = coords.length || 1;
        return [sumY / n, sumX / n];
    } catch {
        return fallback;
    }
};

const getPopulationFromFeatureProps = (props: any): number => {
    const candidates = [
        props?.V001, // common IBGE export key
        props?.POP,
        props?.POPULACAO,
        props?.population,
        props?.pop
    ];
    for (const c of candidates) {
        const n = Number(c);
        if (Number.isFinite(n) && n > 0) return n;
    }
    return 0;
};

const fetchJsonWithTimeout = async (url: string, options: RequestInit, timeoutMs: number): Promise<{ ok: boolean; status?: number; json: any }> => {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
        const res = await fetch(url, { ...options, signal: controller ? controller.signal : undefined });
        const json = await res.json().catch(() => null);
        return { ok: res.ok, status: res.status, json };
    } catch (e) {
        return { ok: false, status: undefined, json: null };
    } finally {
        if (timer) clearTimeout(timer);
    }
};

const tryBuildIbgeStaticHotspots = async (
    briefing: BriefingInteligente,
    center: [number, number],
    max: number
): Promise<HotspotResult[] | null> => {
    const municipioId = (briefing as any)?.geography?.municipioId as string | undefined;
    if (!municipioId) return null;

    // Local static cache/API (preloaded census bundle), no external network required.
    const url = `http://localhost:3001/api/ibge/sectors?municipioId=${encodeURIComponent(municipioId)}&format=geojson`;
    const { ok, status, json } = await fetchJsonWithTimeout(url, { method: 'GET' }, 2500);
    if (!ok || !json || json.type !== 'FeatureCollection' || !Array.isArray(json.features)) {
        console.warn(`[REAL_ONLY] IBGE static sectors unavailable for municipioId=${municipioId}`, status);
        return null;
    }

    const fallbackCenter: [number, number] = center;
    const scored = (json.features as any[])
        .map((f, idx) => ({
            feature: f,
            idx,
            pop: getPopulationFromFeatureProps(f?.properties || {})
        }))
        .sort((a, b) => (b.pop || 0) - (a.pop || 0))
        .slice(0, Math.max(1, max));

    const maxPop = scored[0]?.pop || 1;
    const hotspots: HotspotResult[] = scored.map((item, i) => {
        const c = centroidFromGeometry(item.feature?.geometry, fallbackCenter);
        const props = item.feature?.properties || {};
        const id = Number(props?.id || props?.ID || props?.CD_SETOR || props?.CD_GEOCODI || (i + 1)) || (i + 1);
        const pop = item.pop || null;
        const score = Math.max(1, Math.min(100, Math.round(((item.pop || 0) / maxPop) * 100)));
        return {
            id,
            lat: c[0],
            lng: c[1],
            rank: i + 1,
            name: props?.NM_SETOR || props?.NOME || `Setor ${String(id)}`,
            type: 'Demográfico',
            score,
            audience_total: pop,
            provenance: {
                label: 'REAL',
                source: 'IBGE_CENSO_2022',
                method: 'local-static-sectors',
                source_url: 'https://ftp.ibge.gov.br/',
                notes: 'Fallback estático (Censo/IBGE pré-carregado localmente).'
            }
        };
    });

    return hotspots.length > 0 ? hotspots : null;
};

export async function generateHotspots(
    briefing: BriefingInteligente,
    center: [number, number],
    isRealOnly: boolean
): Promise<HotspotResult[]> {

    // If a Supabase Edge Function URL is configured, prefer that live query
    const edgeUrl = (typeof process !== 'undefined' && process.env.SUPABASE_EDGE_HOTSPOTS_URL)
        || (typeof (import.meta) !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_EDGE_HOTSPOTS_URL)
        || null;

    if (edgeUrl) {
        try {
            const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
            const timeout = 5000;
            const timer = controller ? setTimeout(() => controller.abort(), timeout) : null;

            const res = await fetch(edgeUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ briefing, center, isRealOnly }),
                signal: controller ? controller.signal : undefined
            });

            if (timer) clearTimeout(timer);

            if (res.ok) {
                const payload = await res.json();
                const extracted = extractHotspotsFromPayload(payload);
                if (extracted && (!isRealOnly || extracted.length > 0)) return extracted;
                if (isRealOnly) console.warn('Edge hotspots returned empty result in REAL_ONLY; using static fallback.');
            } else {
                console.warn('Edge hotspots returned non-ok status', res.status);
            }
        } catch (e) {
            // AbortError is expected on timeout; keep fallback deterministic
            console.warn('Supabase Edge hotspots call failed or timed out, falling back to local heuristics', e?.name || e?.message || e);
        }
    }

    // REAL_ONLY: never return an empty list. Prefer deterministic census-based fallback.
    if (isRealOnly) {
        const staticHotspots = await tryBuildIbgeStaticHotspots(briefing, center, 5);
        if (staticHotspots && staticHotspots.length > 0) return staticHotspots;

        // If static census bundle is not available, return a single explicit UNAVAILABLE placeholder (no hallucination).
        return [{
            id: 0,
            lat: center[0],
            lng: center[1],
            rank: 1,
            name: "Hotspot indisponível (sem base estática)",
            type: 'Indisponível',
            score: 0,
            audience_total: null,
            provenance: {
                label: 'UNAVAILABLE',
                source: 'IBGE',
                method: 'real_only_placeholder',
                notes: 'Sem hotspots live e sem bundle estático local (IBGE) disponível.'
            }
        }];
    }

    // OUTSIDE REAL_ONLY (Simulated Mode):
    const spots: HotspotResult[] = [];
    const count = 20;
    const audienceBase = briefing.marketPositioning === 'Popular' ? 14000
        : briefing.marketPositioning === 'CostBenefit' ? 12000
            : briefing.marketPositioning === 'Premium' ? 9000
                : briefing.marketPositioning === 'Luxury' ? 7000
                    : 10000;
    const genderWeight = briefing.targetGender && briefing.targetGender !== 'Mixed' ? 0.6 : 1;
    const ageWeight = briefing.targetAge && briefing.targetAge.length > 0 ? 0.8 : 1;
    const objectiveWeight = briefing.objective === 'DominateRegion' ? 1.15
        : briefing.objective === 'ValidateIdea' ? 0.85
            : 1;

    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const radius = 0.02; // roughly 2km

        spots.push({
            id: i + 1,
            rank: i + 1,
            lat: center[0] + Math.cos(angle) * radius,
            lng: center[1] + Math.sin(angle) * radius,
            name: `Hotspot Simulado ${i + 1}`,
            type: 'Cluster Demo',
            score: 85 - i * 2,
            audience_total: Math.max(1500, Math.round((audienceBase - i * 350) * genderWeight * ageWeight * objectiveWeight)),
            provenance: {
                label: 'DERIVED',
                source: 'INTERNAL_MOCK',
                method: 'Heuristic Ring',
                notes: 'Dados simulados para demonstração.'
            }
        });
    }

    return spots;
}
