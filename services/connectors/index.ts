import { WeeklyHeatmap, Provenance } from '../../types';

// Tactical heuristic for physical weekly heatmap when no mobility/places data available.
export const getWeeklyHeatmapDigital = async (): Promise<WeeklyHeatmap> => {
    // Placeholder: digital heatmap should come from GA4/Meta. Return a minimal derived heatmap.
    const grid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
    // light activity during daytime
    for (let d = 0; d < 7; d++) {
        for (let h = 8; h <= 20; h++) grid[d][h] = (h >= 12 && h <= 14) ? 60 : 30;
    }

    return {
        id: 'derived-digital-1',
        mode: 'DIGITAL',
        metric: 'estimated_engagement',
        windowDays: 7,
        timezone: 'America/Sao_Paulo',
        grid,
        bestWindows: [{ day: 'Tuesday', hour: 12, value: 60 }],
        worstWindows: [{ day: 'Sunday', hour: 3, value: 0 }],
        provenance: {
            label: 'DERIVED',
            source: 'Business_Hours_Database',
            notes: 'Synthetic digital heatmap fallback based on typical daily activity patterns.'
        }
    };
};

export const getWeeklyHeatmapPhysical = async (businessType: string = 'general'): Promise<WeeklyHeatmap> => {
    // Heuristic: use businessType to shape visiting hours.
    // Common commercial: weekdays 08-18 high; nightlife: evenings; stores: 09-19.
    const grid: number[][] = [];
    const isNightlife = ['bar', 'nightclub', 'restaurant'].includes(businessType.toLowerCase());
    const storeLike = ['retail', 'store', 'shop', 'mall', 'market'].includes(businessType.toLowerCase());

    for (let d = 0; d < 7; d++) {
        const dayArr: number[] = [];
        const isWeekend = d === 0 || d === 6; // Sunday=0, Saturday=6
        for (let h = 0; h < 24; h++) {
            let val = 0;
            if (isNightlife) {
                // evenings peak
                // note: hours wrap-around handled by conditionals below
                val = (h >= 18 || h <= 2) ? 60 : (h >= 16 && h <= 23 ? 30 : 5);
                if (isWeekend && (h >= 20 || h <= 2)) val = 80;
            } else if (storeLike) {
                // store hours
                val = (!isWeekend && h >= 9 && h <= 19) ? 70 : (isWeekend && h >= 10 && h <= 18 ? 50 : 5);
            } else {
                // generic business hours
                val = (!isWeekend && h >= 8 && h <= 18) ? 65 : (isWeekend && h >= 10 && h <= 16 ? 35 : 5);
            }
            dayArr.push(val);
        }
        grid.push(dayArr);
    }

    // derive best/worst windows
    let best: { day: string; hour: number; value: number }[] = [];
    let worst: { day: string; hour: number; value: number }[] = [];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (let d = 0; d < 7; d++) {
        for (let h = 0; h < 24; h++) {
            const v = grid[d][h];
            if (v >= 70) best.push({ day: days[d], hour: h, value: v });
            if (v <= 5) worst.push({ day: days[d], hour: h, value: v });
        }
    }

    return {
        id: `heuristic-physical-${businessType}`,
        mode: 'PHYSICAL',
        metric: 'estimated_visits',
        windowDays: 7,
        timezone: 'America/Sao_Paulo',
        grid,
        bestWindows: best.slice(0, 5),
        worstWindows: worst.slice(0, 5),
        provenance: {
            label: 'DERIVED',
            source: 'Business_Hours_Database',
            notes: 'Estimativa baseada no perfil comercial do setor.'
        }
    };
};

export const getSmartFlows = async () => {
    // In future, fetch from /api/mobility/flows
    return [];
};
