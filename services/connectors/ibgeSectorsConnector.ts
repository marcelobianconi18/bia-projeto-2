
import { buildApiUrl } from "../apiConfig";
import { IbgeOverlayBundle, Provenance } from "../../types";

export async function fetchIbgeSectors(municipioId: string): Promise<IbgeOverlayBundle | null> {
    try {
        const response = await fetch(buildApiUrl(`/api/ibge/sectors?municipioId=${municipioId}&format=geojson`));

        if (!response.ok) {
            console.warn(`[IBGE Sectors] Unavailable for ${municipioId}: ${response.status}`);
            return null; // Treated as UNAVAILABLE in UI
        }

        const data = await response.json();

        // Basic validation
        if (!data || data.type !== 'FeatureCollection') {
            throw new Error("Invalid GeoJSON format");
        }

        return {
            municipioId,
            year: '2022', // Censo
            sectors: data,
            stats: {}, // To be populated by stats connector if available
            provenance: {
                label: 'REAL',
                source: 'IBGE / Censo 2022',
                source_url: 'https://ftp.ibge.gov.br/'
            }
        };

    } catch (e: any) {
        console.error("[IBGE Sectors] Fetch failed:", e);
        return null; // Fail gracefully
    }
}
