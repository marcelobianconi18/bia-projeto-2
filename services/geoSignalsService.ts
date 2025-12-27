import {
    BriefingData,
    GeoSignalsEnvelope,
    GeoSignalPolygon,
    GeoSignalHotspot,
    GeoSignalFlow,
    Timeseries168h,
    WeeklyHeatmap,
    IbgeOverlayBundle
} from '../types';
import { isRealOnly } from './env';
import { generateHotspots } from './hotspotsEngine';

const IS_REAL_ONLY = isRealOnly(); // Ensure it is called

// Helper to create empty envelope
export const createEmptyGeoSignals = (briefing: BriefingData): GeoSignalsEnvelope => {
    return {
        version: "1.0",
        createdAt: new Date().toISOString(),
        realOnly: IS_REAL_ONLY,
        briefing: {
            primaryCity: briefing.geography.city || "Unknown",
            ibge_municipio_id: briefing.geography.municipioId,
            dataSources: briefing.dataSources
        },
        polygons: [],
        hotspots: [],
        flows: [],
        timeseries168h: [],
        warnings: [],
        // Legacy alias
        timeseries: [],
        meta: { isRealOnly: IS_REAL_ONLY, generated_at: new Date().toISOString() }
    };
};

export const buildGeoSignals = async (briefing: BriefingData): Promise<GeoSignalsEnvelope> => {
    // Keep signature for backward compat
    return buildGeoSignalsWithOverlays(briefing);
};

const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

const getNumber = (v: any): number | null => {
    if (v === null || v === undefined) return null;
    const n = Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
};

const pickNumber = (props: Record<string, any>, keys: string[]): number | null => {
    for (const key of keys) {
        if (props && key in props) {
            const n = getNumber(props[key]);
            if (n !== null) return n;
        }
    }
    return null;
};

const hashString = (input: string) => {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        hash = (hash << 5) - hash + input.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
};

const getBriefingCenter = (briefing: BriefingData): [number, number] => {
    const geo = briefing.geography;
    if (geo.coords && typeof geo.coords.lat === 'number' && typeof geo.coords.lng === 'number') {
        return [geo.coords.lat, geo.coords.lng];
    }
    if (typeof geo.lat === 'number' && typeof geo.lng === 'number') {
        return [geo.lat, geo.lng];
    }
    const first = geo.selectedItems?.[0];
    if (first?.coords && typeof first.coords.lat === 'number' && typeof first.coords.lng === 'number') {
        return [first.coords.lat, first.coords.lng];
    }
    return [-23.5505, -46.6333];
};

const getSectorId = (props: Record<string, any>, idx: number) =>
    String(
        props?.CD_SETOR ||
        props?.CD_GEOCODI ||
        props?.GEOCODIGO ||
        props?.id ||
        props?.ID ||
        `SETOR_${idx + 1}`
    );

const getSectorName = (props: Record<string, any>, fallback: string) =>
    String(props?.NM_SETOR || props?.NM_MUNICIP || props?.name || fallback);

const getOperationalWeight = (briefing: BriefingData) => {
    switch (briefing.operationalModel) {
        case 'Digital': return 1.15;
        case 'ClientVisit': return 1.05;
        case 'Itinerant': return 1.1;
        case 'Shopping': return 1.0;
        case 'Fixed': return 0.95;
        case 'Investor': return 0.9;
        default: return 1.0;
    }
};

const getMarketWeight = (briefing: BriefingData) => {
    switch (briefing.marketPositioning) {
        case 'Popular': return 1.15;
        case 'CostBenefit': return 1.05;
        case 'Premium': return 0.9;
        case 'Luxury': return 0.8;
        default: return 1.0;
    }
};

const getObjectiveWeight = (briefing: BriefingData) => {
    switch (briefing.objective) {
        case 'DominateRegion': return 1.1;
        case 'SellMore': return 1.0;
        case 'FindSpot': return 0.95;
        case 'ValidateIdea': return 0.85;
        default: return 1.0;
    }
};

const getBriefingWeight = (briefing: BriefingData) =>
    clamp(getOperationalWeight(briefing) * getMarketWeight(briefing) * getObjectiveWeight(briefing), 0.6, 1.6);

const estimateAudience = (population: number | null, briefing: BriefingData, seed: string) => {
    if (!population || population <= 0) return null;
    const gender = briefing.targetGender;
    const genderFactor = !gender || gender === 'Mixed' ? 1 : 0.5;
    const ageRanges = briefing.targetAge || [];
    const ageFactor = ageRanges.length > 0 ? clamp(ageRanges.length * 0.12, 0.12, 0.6) : 0.35;
    const briefingWeight = getBriefingWeight(briefing);
    const jitter = 0.85 + (hashString(seed) % 31) / 100;
    return Math.round(population * genderFactor * ageFactor * briefingWeight * jitter);
};

const centroidFromGeometry = (geometry: any): [number, number] | null => {
    if (!geometry) return null;
    const coords = geometry.type === 'Polygon'
        ? geometry.coordinates?.[0]
        : geometry.type === 'MultiPolygon'
            ? geometry.coordinates?.[0]?.[0]
            : null;
    if (!coords || !Array.isArray(coords) || coords.length === 0) return null;
    let sumX = 0;
    let sumY = 0;
    coords.forEach((pt: any) => {
        if (Array.isArray(pt) && pt.length >= 2) {
            sumX += pt[0];
            sumY += pt[1];
        }
    });
    const count = coords.length || 1;
    return [sumY / count, sumX / count];
};

const buildDerivedFlows = (center: [number, number], isRealOnlyMode: boolean, briefing: BriefingData): GeoSignalFlow[] => {
    if (isRealOnlyMode) return [];
    const [lat, lng] = center;
    const extent = 0.03;
    const lanes = 6;
    const flows: GeoSignalFlow[] = [];
    for (let i = 0; i < lanes; i++) {
        const offset = (-extent / 2) + (i * extent) / (lanes - 1);
        const weightClass = i === Math.floor(lanes / 2) ? 'ALTO' : i % 2 === 0 ? 'MEDIO' : 'BAIXO';
        const objectiveBoost = briefing.objective === 'FindSpot' ? 1.15 : briefing.objective === 'ValidateIdea' ? 0.9 : 1.0;
        const digitalPenalty = briefing.operationalModel === 'Digital' ? 0.85 : 1.0;
        const flowWeight = clamp(objectiveBoost * digitalPenalty, 0.6, 1.4);
        flows.push({
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    [lng - extent, lat + offset],
                    [lng + extent, lat + offset]
                ]
            },
            properties: {
                id: `flow_h_${i + 1}`,
                kind: 'STREET_FLOW',
                intensity: clamp((weightClass === 'ALTO' ? 0.9 : weightClass === 'MEDIO' ? 0.6 : 0.35) * flowWeight, 0.2, 1),
                label: `Fluxo ${weightClass}`
            },
            provenance: {
                label: 'DERIVED',
                source: 'INTERNAL',
                method: 'synthetic-grid',
                notes: 'Fluxos simulados até integração com mobilidade real.'
            }
        });
        flows.push({
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    [lng + offset, lat - extent],
                    [lng + offset, lat + extent]
                ]
            },
            properties: {
                id: `flow_v_${i + 1}`,
                kind: 'STREET_FLOW',
                intensity: clamp((weightClass === 'ALTO' ? 0.9 : weightClass === 'MEDIO' ? 0.6 : 0.35) * flowWeight, 0.2, 1),
                label: `Fluxo ${weightClass}`
            },
            provenance: {
                label: 'DERIVED',
                source: 'INTERNAL',
                method: 'synthetic-grid',
                notes: 'Fluxos simulados até integração com mobilidade real.'
            }
        });
    }
    return flows;
};

export const buildGeoSignalsWithOverlays = async (
    briefing: BriefingData,
    overlays?: { ibgeSectors?: IbgeOverlayBundle | null; adminStates?: any | null; adminMunicipios?: any | null }
): Promise<GeoSignalsEnvelope> => {
    const center = getBriefingCenter(briefing);
    const polygons: GeoSignalPolygon[] = [];
    const sectors = overlays?.ibgeSectors?.sectors;

    const getUfFromBriefing = () => {
        const raw = briefing.geography.state?.[0] || '';
        const uf = raw.trim().slice(0, 2).toUpperCase();
        return uf.length === 2 ? uf : '';
    };

    const getMunicipioIdFromProps = (props: Record<string, any>): string | null => {
        const candidates = [
            props.CD_MUN,
            props.CD_MUNICIP,
            props.CD_GEOCODI,
            props.id,
            props.ID
        ];
        for (const value of candidates) {
            if (value === undefined || value === null) continue;
            const digits = String(value).replace(/\D/g, '');
            if (digits.length >= 7) return digits.slice(0, 7);
        }
        return null;
    };

    const getUfFromProps = (props: Record<string, any>): string | null => {
        const candidates = [props.SIGLA_UF, props.UF, props.SIGLA, props.abbrev, props.abbr];
        for (const value of candidates) {
            if (!value) continue;
            const uf = String(value).trim().toUpperCase();
            if (uf.length === 2) return uf;
        }
        return null;
    };

    const uf = getUfFromBriefing();
    const municipioId = briefing.geography.municipioId || null;

    const adminStates = overlays?.adminStates;
    if (adminStates?.type === 'FeatureCollection' && Array.isArray(adminStates.features)) {
        adminStates.features.forEach((feature: any, idx: number) => {
            if (!feature?.geometry) return;
            const props = feature.properties || {};
            const featureUf = getUfFromProps(props);
            if (uf && featureUf && uf !== featureUf) return;

            polygons.push({
                type: 'Feature',
                geometry: feature.geometry,
                properties: {
                    id: String(props.CD_UF || props.GEOCODIGO || props.id || `UF_${idx + 1}`),
                    kind: 'CUSTOM_AREA',
                    name: String(props.NM_UF || props.nome || props.name || 'UF'),
                    adminLevel: 'estado',
                    population: pickNumber(props, ['POP', 'POPULACAO', 'POPULATION', 'total_pop', 'TOTAL_POP']) ?? null,
                    income: pickNumber(props, ['RENDA', 'INCOME', 'income', 'renda']) ?? null,
                    targetAudienceEstimate: null,
                    score: null
                },
                provenance: {
                    label: 'REAL',
                    source: 'IBGE',
                    method: 'malha_uf'
                }
            });
        });
    }

    const adminMunicipios = overlays?.adminMunicipios;
    if (adminMunicipios?.type === 'FeatureCollection' && Array.isArray(adminMunicipios.features)) {
        adminMunicipios.features.forEach((feature: any, idx: number) => {
            if (!feature?.geometry) return;
            const props = feature.properties || {};
            const featureMunicipio = getMunicipioIdFromProps(props);
            if (municipioId && featureMunicipio && municipioId !== featureMunicipio) return;

            polygons.push({
                type: 'Feature',
                geometry: feature.geometry,
                properties: {
                    id: String(props.CD_MUN || props.CD_MUNICIP || props.GEOCODIGO || props.id || `MUN_${idx + 1}`),
                    kind: 'IBGE_MUNICIPIO_MALHA',
                    ibge_municipio_id: featureMunicipio || municipioId || undefined,
                    name: String(props.NM_MUN || props.nome || props.name || 'Município'),
                    adminLevel: 'municipio',
                    population: pickNumber(props, ['POP', 'POPULACAO', 'POPULATION', 'total_pop', 'TOTAL_POP']) ?? null,
                    income: pickNumber(props, ['RENDA', 'INCOME', 'income', 'renda']) ?? null,
                    targetAudienceEstimate: null,
                    score: null
                },
                provenance: {
                    label: 'REAL',
                    source: 'IBGE',
                    method: 'malha_municipio'
                }
            });
        });
    }

    if (sectors?.type === 'FeatureCollection' && Array.isArray(sectors.features)) {
        sectors.features.forEach((feature: any, idx: number) => {
            if (!feature?.geometry) return;
            const props = feature.properties || {};
            const population = pickNumber(props, ['V001', 'POP', 'POPULACAO', 'POPULATION', 'pop', 'population']);
            const income = pickNumber(props, ['RENDA', 'INCOME', 'income', 'renda']);
            const sectorId = getSectorId(props, idx);
            const audience = !IS_REAL_ONLY ? estimateAudience(population, briefing, sectorId) : null;

            polygons.push({
                type: 'Feature',
                geometry: feature.geometry,
                properties: {
                    id: sectorId,
                    kind: 'IBGE_SETOR_CENSITARIO',
                    ibge_setor_id: sectorId,
                    name: getSectorName(props, `Setor ${sectorId}`),
                    adminLevel: 'setor',
                    population: population ?? null,
                    income: income ?? null,
                    targetAudienceEstimate: audience ?? null,
                    score: audience ? clamp(Math.round((audience / Math.max(1, population || 1)) * 100), 1, 100) : null
                },
                provenance: {
                    label: 'REAL',
                    source: 'IBGE',
                    method: 'setor_censitario',
                    notes: audience ? 'Estimativa de público alvo derivada do briefing.' : undefined
                }
            });
        });
    }

    let hotspots: GeoSignalHotspot[] = [];
    if (!IS_REAL_ONLY && polygons.length > 0) {
        const briefingWeight = getBriefingWeight(briefing);
        const ranked = [...polygons]
            .map((poly) => {
                const audience = poly.properties.targetAudienceEstimate ?? poly.properties.population ?? 0;
                const seed = `${poly.properties.id}-${briefing.productDescription}-${briefing.objective}`;
                const behaviorWeight = 0.85 + (hashString(seed) % 21) / 100;
                const scoreBase = (audience || 0) * briefingWeight * behaviorWeight;
                return { poly, audience: scoreBase };
            })
            .sort((a, b) => (b.audience || 0) - (a.audience || 0))
            .slice(0, 20);

        const maxAudience = ranked[0]?.audience || 1;
        hotspots = ranked.map((item, index) => {
            const centroid = centroidFromGeometry(item.poly.geometry) || center;
            const score = clamp(Math.round(((item.audience || 0) / maxAudience) * 100), 1, 100);
            return {
                id: `hotspot_${index + 1}`,
                point: { lat: centroid[0], lng: centroid[1] },
                properties: {
                    id: `hotspot_${index + 1}`,
                    kind: 'HIGH_INTENT',
                    rank: index + 1,
                    name: `Hotspot ${index + 1}`,
                    score,
                    targetAudienceEstimate: item.audience || null
                },
                provenance: {
                    label: 'DERIVED',
                    source: 'INTERNAL',
                    method: 'sector-rank',
                    notes: 'Hotspots derivados por densidade estimada do briefing.'
                },
                lat: centroid[0],
                lng: centroid[1],
                label: `Hotspot ${index + 1}`
            };
        });
    } else {
        // [KILL SWITCH] Simulation path removed.
        console.warn("[GeoSignals] Simulation requested better real-only logic prevailed. Returning empty.");
    }

    const flows = buildDerivedFlows(center, IS_REAL_ONLY, briefing);

    const timeseries168h: Timeseries168h[] = [];
    const timeseries: WeeklyHeatmap[] = [];

    return {
        version: "1.0",
        createdAt: new Date().toISOString(),
        realOnly: IS_REAL_ONLY,
        briefing: {
            primaryCity: briefing.geography.city,
            ibge_municipio_id: briefing.geography.municipioId,
            dataSources: briefing.dataSources
        },
        polygons,
        hotspots,
        flows,
        timeseries168h,
        timeseries,
        meta: { isRealOnly: IS_REAL_ONLY, generated_at: new Date().toISOString() }
    };
};
