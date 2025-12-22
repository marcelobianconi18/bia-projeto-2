
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

    // IN REAL_ONLY MODE:
    // We strictly DO NOT generate random or heuristic spots.
    // If we don't have real POI data (from Google Places or OSM POI search), we return EMPTY.
    // The prompt allows "Determinístico" based on sectors/density, but we don't have loaded sectors yet.
    // So, empty is the only honest answer.

    if (isRealOnly) {
        return [];
    }

    // OUTSIDE REAL_ONLY (Simulated Mode):
    // We can generate synthetic hotspots for demo purposes.
    const spots: HotspotResult[] = [];
    const count = 5;

    for (let i = 0; i < count; i++) {
        // Simple ring spread
        const angle = (i / count) * Math.PI * 2;
        const radius = 0.015; // roughly 1.5km

        spots.push({
            id: i + 1,
            rank: i + 1,
            lat: center[0] + Math.cos(angle) * radius,
            lng: center[1] + Math.sin(angle) * radius,
            name: `Hotspot Simulado ${i + 1}`,
            type: 'Cluster Demo',
            score: 85 - i * 2,
            audience_total: 10000 - i * 500, // Simulated number
            provenance: {
                // Strict Canonical: DataLabel = REAL | DERIVED | UNAVAILABLE
                // If mocking/simulating, use DERIVED (or UNAVAILABLE if strict real only).
                label: isRealOnly ? 'UNAVAILABLE' : 'DERIVED',
                source: isRealOnly ? 'UNAVAILABLE' : 'INTERNAL_MOCK',
                method: 'Heuristic Ring',
                notes: 'Dados simulados para demonstração.'
            }
        });
    }

    return spots;
}
