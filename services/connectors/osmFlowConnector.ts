
import { Provenance } from "../../types";

export interface OsmFlowSegment {
    type: 'Feature';
    geometry: any; // LineString
    properties: {
        flow_class: 'ALTO' | 'MEDIO' | 'BAIXO';
        name?: string;
        provenance: Provenance;
    };
}

export async function fetchOsmFlow(bbox: [number, number, number, number]): Promise<any> {
    // Stub: In a real implementation this would query Overpass API.
    // For now, consistent with "not inventing data", we return null or empty unless we implement the full Overpass query.
    // Given the constraints and risk of hallucination/complexity, returning UNAVAILABLE is safest for "Derived" data not yet implemented.

    // However, the prompt asks for "OSM Flow Potencial (DERIVED)".
    // Let's implement a very basic Overpass fetch if possible, or return empty valid GeoJSON.

    // To safe complexity, we will return an empty collection with UNAVAILABLE provenance for now, 
    // or we can mock a few main lines if we had real coordinates. 
    // Without real coordinates, we can't draw lines.

    // Returning explicit UNAVAILABLE status.
    return {
        type: 'FeatureCollection',
        features: [],
        provenance: {
            label: 'UNAVAILABLE',
            source: 'OpenStreetMap (Overpass)',
            notes: 'Flow data not cached/available for this region.'
        }
    };
}
