import { WeeklyHeatmap, Provenance } from '../../types';

// Helper to create unavailable heatmap
const createUnavailableHeatmap = (mode: 'DIGITAL' | 'PHYSICAL'): WeeklyHeatmap => ({
    id: 'unavailable-1',
    mode,
    metric: 'visits',
    windowDays: 7,
    timezone: 'America/Sao_Paulo',
    grid: [],
    bestWindows: [],
    worstWindows: [],
    provenance: {
        label: 'UNAVAILABLE',
        source: 'Connector',
        notes: 'Connector not configured or data unavailable in REAL_ONLY mode'
    }
});

export const getWeeklyHeatmapDigital = async (): Promise<WeeklyHeatmap> => {
    // In future, fetch from /api/ga4/weekly-heatmap or /api/meta...
    // For now, return UNAVAILABLE stub
    return createUnavailableHeatmap('DIGITAL');
};

export const getWeeklyHeatmapPhysical = async (): Promise<WeeklyHeatmap> => {
    // In future, fetch from /api/mobility/weekly-heatmap
    return createUnavailableHeatmap('PHYSICAL');
};

export const getSmartFlows = async () => {
    // In future, fetch from /api/mobility/flows
    return [];
};
