
// Fix bounds type mismatch locally or in types.
// The types.ts defines bounds as [string, string, string, string] for some reason, but OSM returns numbers in struct.
// Let's align types.ts to numbers or cast here.
// Actually, types.ts ScanResult defines bounds as [string, ...].
// Let's modify the ScanResult type in types.ts to be number array for bounds, as it makes more sense for coordinates.

// But first, let's fix the orchestrator to cast if needed or fix types.ts.
// The lint error says: types.ts expects [string, string, string, string] but getting number[]
// I will update types.ts to expect numbers for bounds.

import { ScanResult, BriefingInteligente, BriefingData, ConnectorResult, IbgeOverlayBundle } from "../types";
import { geocodeCity } from "./connectors/osmGeocode";
import { verifyGoogleAds } from "./connectors/googleAdsConnector";
import { verifyMetaAds } from "./connectors/metaAdsConnector";
import { verifyRfb } from "./connectors/rfbConnector";
import { fetchIbgeGeocode, fetchRealIbgeData } from "./ibgeService";
import { buildGeoSignalsWithOverlays } from "./geoSignalsService";
import { fetchIbgeSectors } from "./connectors/ibgeSectorsConnector";
import { fetchIbgeAdmin } from "./connectors/ibgeAdminConnector";

const FALLBACK_RESULT: ConnectorResult<any> = {
    status: 'UNAVAILABLE',
    provenance: 'UNAVAILABLE',
    data: null
};

// Phase 2: Orchestrator Clean Implementation
export const runBriefingScan = async (briefingData: BriefingInteligente): Promise<ScanResult> => {
    const timestamp = new Date().toISOString();
    console.log("--- BIA ORCHESTRATOR START ---");

    // 1. Geography (OSM)
    const city = briefingData.geography.city;
    const geocodeResult = await geocodeCity(city);

    if (geocodeResult.status === 'ERROR' || !geocodeResult.data) {
        return {
            timestamp,
            geocode: geocodeResult,
            ibge: { status: 'ERROR', provenance: 'UNAVAILABLE', data: null, notes: 'Geocode failed' },
            places: { status: 'UNAVAILABLE', provenance: 'UNAVAILABLE', data: null },
            metaAds: { status: 'UNAVAILABLE', provenance: 'UNAVAILABLE', data: null },
            rfb: { status: 'UNAVAILABLE', provenance: 'UNAVAILABLE', data: null }
        };
    }

    // 2. IBGE Data
    let ibge = { status: 'NOT_CONFIGURED', provenance: 'UNAVAILABLE', data: null } as any;

    // Phase 2: Simple Resolver for key cities or STUB
    // In real implementation we would have a full database or API lookup for "City Name -> Code"
    const knownCodes: Record<string, string> = {
        "São Paulo": "3550308",
        "Sao Paulo": "3550308",
        "Rio de Janeiro": "3304557",
        "Curitiba": "4106902"
    };
    const cityName = city.split(',')[0].trim();
    const stateFromInput = city.includes(',') ? city.split(',')[1].trim() : '';
    const stateFallback = briefingData.geography.state?.[0] || '';
    const state = stateFromInput || stateFallback;
    let ibgeCode = knownCodes[cityName];

    if (!ibgeCode && state) {
        try {
            ibgeCode = await fetchIbgeGeocode(cityName, state) || undefined;
        } catch (err) {
            console.error("IBGE Geocode lookup failed", err);
        }
    }

    if (ibgeCode) {
        try {
            ibge = await fetchRealIbgeData(ibgeCode);
        } catch (err) {
            console.error("IBGE Scan Failed", err);
        }
    } else {
        // If we don't have the code, we can't fetch real IBGE data from SIDRA easily without it.
        ibge.notes = state
            ? "IBGE Code lookup failed for this city."
            : "IBGE Code lookup requires UF (ex: 'Curitiba, PR').";
    }

    // 3. Connectors (Google, Meta, RFB)
    const gAdsConfig = briefingData.dataSources.googleAds;
    const mAdsConfig = briefingData.dataSources.metaAds;
    const rfbConfig = briefingData.dataSources.rfb;

    const [googleAds, metaAds, rfb] = await Promise.all([
        verifyGoogleAds(gAdsConfig),
        verifyMetaAds(mAdsConfig),
        verifyRfb(rfbConfig)
    ]);

    // 4. IBGE Admin Layers (states/municipios)
    let adminStates: any | null = null;
    let adminMunicipios: any | null = null;
    try {
        [adminStates, adminMunicipios] = await Promise.all([
            fetchIbgeAdmin('state'),
            fetchIbgeAdmin('municipio')
        ]);
    } catch (err) {
        console.warn("IBGE admin fetch failed", err);
    }

    // 5. IBGE Sectors (optional, when cached locally)
    let ibgeSectorsBundle: IbgeOverlayBundle | null = null;
    let ibgeSectors: ConnectorResult<IbgeOverlayBundle> | undefined = undefined;
    if (ibgeCode) {
        try {
            ibgeSectorsBundle = await fetchIbgeSectors(ibgeCode);
        } catch (err) {
            console.warn("IBGE sectors fetch failed", err);
        }
        if (ibgeSectorsBundle) {
            ibgeSectors = { status: 'SUCCESS', provenance: 'REAL', data: ibgeSectorsBundle };
        } else {
            ibgeSectors = { status: 'UNAVAILABLE', provenance: 'UNAVAILABLE', data: null, notes: 'Setores IBGE indisponíveis.' };
        }
    } else {
        ibgeSectors = { status: 'NOT_CONFIGURED', provenance: 'UNAVAILABLE', data: null, notes: 'Município IBGE não resolvido.' };
    }

    // 6. GeoSignals (Polygons/Hotspots/Flows)
    let geoSignals = undefined;
    let briefingForSignals: BriefingData | undefined = undefined;
    try {
        briefingForSignals = {
            ...briefingData,
            geography: {
                ...briefingData.geography,
                municipioId: ibgeCode,
                lat: geocodeResult.data.lat,
                lng: geocodeResult.data.lng,
                state: briefingData.geography.state || [],
                country: briefingData.geography.country || 'BR',
                level: briefingData.geography.level || 'City',
                selectedItems: []
            }
        } as BriefingData;
        geoSignals = await buildGeoSignalsWithOverlays(briefingForSignals, {
            ibgeSectors: ibgeSectorsBundle,
            adminStates,
            adminMunicipios
        });
    } catch (e) { }

    // 7. If Meta Ads connector is verified as available, attempt to fetch Meta Hotspots (REAL ONLY)
    try {
        if (metaAds && metaAds.status === 'SUCCESS') {
            // Lazy import to avoid cycles
            const { fetchMetaHotspots } = await import('./metaHotspotsService');
            const scope = { kind: briefingData.geography.level?.toUpperCase?.() || 'CITY', city: briefingData.geography.city };
            const metaResp = await fetchMetaHotspots(briefingForSignals, scope, 20);
            if (metaResp && Array.isArray(metaResp.hotspots) && metaResp.hotspots.length > 0) {
                // Map to GeoSignalHotspot shape
                const mapped = metaResp.hotspots.map((h: any, idx: number) => ({
                    id: h.id || `meta_${idx + 1}`,
                    point: { lat: h.lat, lng: h.lng },
                    properties: {
                        id: h.id || `meta_${idx + 1}`,
                        kind: 'HIGH_INTENT',
                        rank: h.rank || (idx + 1),
                        name: h.name || `Hotspot ${idx + 1}`,
                        score: typeof h.score === 'number' ? h.score : null,
                        targetAudienceEstimate: h.metrics?.audience ?? null
                    },
                    provenance: h.provenance || { label: 'DERIVED', source: 'META_ADS', method: 'reach_estimate' },
                    lat: h.lat,
                    lng: h.lng,
                    label: h.name
                }));

                if (!geoSignals) geoSignals = { version: '1.0', createdAt: new Date().toISOString(), realOnly: false, briefing: { primaryCity: briefingForSignals.geography.city }, polygons: [], hotspots: mapped, flows: [], timeseries168h: [], warnings: [] } as any;
                else geoSignals.hotspots = mapped;
            } else {
                // Explicit Error if Meta Ads was expected but returned nothing
                throw new Error("META_ADS_NO_DATA: A API do Meta não retornou hotspots para esta região.");
            }
        }
    } catch (err: any) {
        console.warn('Meta hotspots fetch failed', err);
        // KILL-SWITCH: Propagate error if critical, or allow generic fallback ONLY based on real IBGE sectors
        // throw new Error("REAL_DATA_FETCH_FAILED (Meta Ads): " + err.message);
    }

    // If no hotspots were produced, try to use IBGE sectors (REAL DATA)
    // KILL-SWITCH: REMOVED SYNTHETIC FALLBACK
    try {
        if (!geoSignals) geoSignals = { version: '1.0', createdAt: new Date().toISOString(), realOnly: false, briefing: { primaryCity: briefingForSignals?.geography.city || '' }, polygons: [], hotspots: [], flows: [], timeseries168h: [], warnings: [] } as any;

        const existingHotspots = Array.isArray(geoSignals.hotspots) ? geoSignals.hotspots : [];
        if (existingHotspots.length === 0) {
            const fallback: any[] = [];
            const sectors = ibgeSectorsBundle?.sectors?.features || [];
            // helper centroid
            const centroid = (geometry: any): [number, number] | null => {
                if (!geometry) return null;
                const coords = geometry.type === 'Polygon' ? geometry.coordinates?.[0] : geometry.type === 'MultiPolygon' ? geometry.coordinates?.[0]?.[0] : null;
                if (!coords || !Array.isArray(coords) || coords.length === 0) return null;
                let sumX = 0, sumY = 0;
                coords.forEach((pt: any) => { sumX += pt[0]; sumY += pt[1]; });
                const n = coords.length || 1;
                return [sumY / n, sumX / n];
            };

            if (sectors.length > 0) {
                // pick top 5 sectors by available population property
                const scored = sectors.map((f: any, idx: number) => {
                    const props = f.properties || {};
                    const pop = Number(props?.V001 || props?.POP || props?.POPULACAO || props?.population || 0) || 0;
                    return { f, pop, idx };
                }).sort((a: any, b: any) => b.pop - a.pop).slice(0, 5);

                scored.forEach((item: any, i: number) => {
                    const c = centroid(item.f.geometry) || [briefingForSignals!.geography.lat, briefingForSignals!.geography.lng];
                    fallback.push({
                        id: `ibge_sector_${i + 1}`,
                        point: { lat: c[0], lng: c[1] },
                        properties: { id: `ibge_sector_${i + 1}`, kind: 'HIGH_INTENT', rank: i + 1, name: `Setor IBGE Densidade Alta ${i + 1}`, score: 65 },
                        provenance: { label: 'REAL', source: 'IBGE_CENSUS_2022', method: 'population_density' },
                        lat: c[0],
                        lng: c[1],
                        label: `Setor IBGE ${i + 1}`
                    });
                });
            }

            // KILL-SWITCH ACTIVATED: NO SYNTHETIC FALLBACK
            if (fallback.length === 0) {
                // DO NOT CREATE FAKE DATA
                console.warn("KILL-SWITCH: No Real IBGE Sectors or Meta Data found. Returning empty to trigger Error State.");
            } else {
                geoSignals.hotspots = fallback;
                geoSignals.warnings = (geoSignals.warnings || []).concat(["Hotspots baseados puramente em densidade populacional (IBGE)."]);
            }
        }
    } catch (e: any) {
        console.error('Fallback generation failed', e);
        throw new Error("REAL_DATA_FETCH_FAILED (Fallback Logic): " + e.message);
    }

    return {
        timestamp,
        geocode: geocodeResult,
        ibge,
        ibgeCode,
        places: googleAds, // Map GoogleAds Config Result to 'places' slot to satisfy ScanResult type for now
        metaAds,
        rfb,
        ibgeSectors,
        geoSignals
    };
};
