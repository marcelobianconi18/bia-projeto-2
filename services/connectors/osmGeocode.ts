
import { ConnectorResult } from "../../types";

export interface GeocodeData {
    lat: number;
    lng: number;
    displayName: string;
    bounds: [number, number, number, number]; // minLat, maxLat, minLon, maxLon
}

export async function geocodeCity(query: string): Promise<ConnectorResult<GeocodeData>> {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=1&countrycodes=br`;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'BiaBIA/3.0' } // Respect OSM policy
        });
        clearTimeout(timeout);

        if (!res.ok) {
            return { status: 'ERROR', provenance: 'UNAVAILABLE', data: null, notes: `Http Error: ${res.status}` };
        }

        const data = await res.json();
        if (!data || data.length === 0) {
            return { status: 'ERROR', provenance: 'UNAVAILABLE', data: null, notes: 'Localidade não encontrada.' };
        }

        const item = data[0];
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);

        // Bounds format in Nominatim is [minLat, maxLat, minLon, maxLon] OR [minLat, maxLat, minLon, maxLon] strings
        // Actually Nominatim returns boundingbox: [minLat, maxLat, minLon, maxLon] as strings
        const b = item.boundingbox.map(parseFloat);
        const bounds: [number, number, number, number] = [b[0], b[1], b[2], b[3]];

        return {
            status: 'SUCCESS',
            provenance: 'REAL',
            data: {
                lat,
                lng,
                displayName: item.display_name,
                bounds
            },
            sourceUrl: url,
            notes: 'Geocodificação via OpenStreetMap (Nominatim)'
        };

    } catch (e: any) {
        return { status: 'ERROR', provenance: 'UNAVAILABLE', data: null, notes: e.message };
    }
}
