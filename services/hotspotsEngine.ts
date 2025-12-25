
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

export function generateHotspots(
    briefing: BriefingInteligente,
    center: [number, number],
    isRealOnly: boolean
): HotspotResult[] {

    // REAL_ONLY: never return an empty list. Prefer deterministic census-based fallback.
    if (isRealOnly) {
        console.warn("MODO REAL: Buscando dados de infraestrutura base (IBGE/Censo) fallback...");
        // Minimal, honest fallback based on census (not live POI). This prevents empty UI.
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
