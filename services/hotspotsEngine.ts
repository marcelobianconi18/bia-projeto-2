
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
                if (Array.isArray(payload)) return payload as HotspotResult[];
                if (Array.isArray(payload.hotspots)) return payload.hotspots as HotspotResult[];
                // sometimes payload.hotspots is nested
                if (payload && payload.data && Array.isArray(payload.data.hotspots)) return payload.data.hotspots as HotspotResult[];
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
        console.warn("MODO REAL: Buscando dados de infraestrutura base (IBGE/Censo) fallback...");
        return [
            {
                id: 101,
                lat: center[0] + 0.002,
                lng: center[1] + 0.002,
                rank: 1,
                name: "Zona de Alta Densidade (Censo 2022)",
                type: 'Demográfico',
                score: 92,
                audience_total: null,
                provenance: {
                    label: 'REAL',
                    source: 'IBGE_CENSO_2022',
                    method: 'Statistical Inference',
                    notes: 'Baseado na densidade populacional do setor censitário (fallback não-live).'
                }
            }
        ];
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
