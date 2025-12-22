// Minimal briefingOptions fallback used by TargetingDNA builder.
// Populate or extend these constants from your canonical source.

export type PositioningId = 'POPULAR' | 'PREMIUM' | 'COST_LEADER' | string;
export type ObjectiveId = 'AWARENESS' | 'CONSIDERATION' | 'CONVERSION' | 'INTEL' | string;
export type OperationalModelId = 'RADIUS' | 'NATIONAL_HEATMAP' | 'ISOCHRONE' | 'POI_FLOW' | 'ECON_GROWTH' | string;

export const OPERATIONAL_MODEL: Record<OperationalModelId, string> = {
  RADIUS: 'RADIUS',
  NATIONAL_HEATMAP: 'NATIONAL_HEATMAP',
  ISOCHRONE: 'ISOCHRONE',
  POI_FLOW: 'POI_FLOW',
  ECON_GROWTH: 'ECON_GROWTH'
};

export const DATA_SOURCE = {
  DS_PHYSICAL: 'DS_PHYSICAL',
  DS_DIGITAL: 'DS_DIGITAL',
  DS_CROSS: 'DS_CROSS'
};

export const POSITIONING: Record<PositioningId, { priceBias?: 'LOW'|'MID'|'HIGH'|'VERY_HIGH' }> = {
  POPULAR: { priceBias: 'LOW' },
  PREMIUM: { priceBias: 'VERY_HIGH' },
  COST_LEADER: { priceBias: 'LOW' }
};

export const TARGET_GENDER = { MALE: 'MALE', FEMALE: 'FEMALE', ALL: 'ALL' };

export const AGE_COHORT = { YOUNG: '18-24', ADULT: '25-44', SENIOR: '45+' };

export const OBJECTIVE: Record<ObjectiveId, { funnel?: 'AWARENESS'|'CONSIDERATION'|'CONVERSION'|'INTEL' }> = {
  AWARENESS: { funnel: 'AWARENESS' },
  CONSIDERATION: { funnel: 'CONSIDERATION' },
  CONVERSION: { funnel: 'CONVERSION' },
  INTEL: { funnel: 'INTEL' }
};

export const POSITIONING_META = POSITIONING;
export const OBJECTIVE_META = OBJECTIVE;

export const operationalLogic = (m?: OperationalModelId) => {
  if (!m) return 'RADIUS';
  const mm = String(m).toUpperCase();
  if (mm.includes('NATIONAL')) return 'NATIONAL_HEATMAP';
  if (mm.includes('ISO')) return 'ISOCHRONE';
  if (mm.includes('POI') || mm.includes('ANCHOR')) return 'POI_FLOW';
  if (mm.includes('GROW')) return 'ECON_GROWTH';
  return 'RADIUS';
};

export default {};
