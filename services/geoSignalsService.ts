import {
    BriefingData,
    GeoSignalsEnvelope,
    GeoSignalPolygon,
    GeoSignalHotspot,
    GeoSignalFlow,
    Timeseries168h,
    Provenance,
    WeeklyHeatmap
} from '../types';
import { isRealOnly } from './env';

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
    // 1. Convert IBGE Overlay to Polygons
    const polygons: GeoSignalPolygon[] = [];
    // BriefingData no longer has 'overlays' prop in strict contract.
    // If we need overlays, we infer from geography or dataSources.
    // For now, we skip overlay mapping or implement based on 'dataSources.ibge'

    // 2. Hotspots
    // BriefingData no longer passes hotspots. We must generate or assume empty if not provided.
    const hotspots: GeoSignalHotspot[] = [];

    // 3. Timeseries (Phase 3)
    // We fetch this via client mostly, but if we had it here:
    const timeseries168h: Timeseries168h[] = [];

    // Legacy WeeklyHeatmap format for backward compat
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
        flows: [],
        timeseries168h,
        timeseries, // Legacy
        meta: { isRealOnly, generated_at: new Date().toISOString() }
    };
};
