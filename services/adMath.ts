export interface SaturationRisk {
    isSaturated: boolean;
    saturationLevel: number; // 0-1 (onde 1 é 100% saturado)
    message: string;
}

export const calculateAdForecasting = (
    dailyBudget: number,
    cpmEstimate: number = 15.00,
    population: number
) => {
    // Fórmula de Engenharia Reversa
    const dailyImpressions = (dailyBudget / cpmEstimate) * 1000;
    const estimatedReach = dailyImpressions * 0.7; // Freq ~1.4

    // Limiar de Saturação: 40% da população local/dia é perigoso (fadiga de anúncio)
    const saturationThreshold = population * 0.4;
    const saturationLevel = estimatedReach / saturationThreshold;

    const risk: SaturationRisk = {
        isSaturated: saturationLevel > 1.0,
        saturationLevel: Math.min(saturationLevel, 1.5), // Cap visual em 150%
        message: saturationLevel > 1.0
            ? 'ALERTA: ORÇAMENTO EXCESSIVO P/ RAIO (FADIGA IMEDIATA)'
            : 'ZONA SEGURA DE FREQUÊNCIA'
    };

    return {
        dailyImpressions,
        estimatedReach,
        risk
    };
};

// Lógica de Cores do Heatmap (God Mode Spec)
export const getThermalColor = (score: number): string => {
    if (score >= 90) return '#ef4444'; // Red (Inferno)
    if (score >= 70) return '#f97316'; // Orange (Ember)
    return '#3b82f6'; // Blue (Frost)
};
