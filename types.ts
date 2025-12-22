
export enum AppStep {
  BRIEFING = 'BRIEFING',
  LOADING = 'LOADING',
  DASHBOARD = 'DASHBOARD'
}

export type DashboardView = 'COCKPIT' | 'EXPLORER' | 'COMMAND_CENTER';

export interface IbgeSocioData {
  population: number;
  pib: number;
  averageIncome: number;
  lastUpdate: string;
  geocode: string;
  provenance?: DataProvenance;
}

export type DataProvenanceLabel = 'REAL' | 'ESTIMATED' | 'SIMULATED';

export interface DataProvenance {
  label: DataProvenanceLabel;
  source: string;
  method?: string;
  updatedAt?: string;
  notes?: string;
  confidence?: number;
}

export interface MapSettings {
  showIncome: boolean;
  showLogistics: boolean;
  showCompetitors: boolean;
  liveTime: number; 
  radius: number; 
  zoom: number;
  minScore: number; 
  selectedPersona: string; 
  hideNoise?: boolean;
}

export interface TacticalFeature {
  type: 'Feature';
  geometry: any;
  properties: {
    id: number;
    geocode: string;
    income: number;
    population: number;
    volume: number;
    density: number;
    name: string;
    provenance?: DataProvenance;
  };
}

export interface TacticalGeoJson {
  type: 'FeatureCollection';
  features: TacticalFeature[];
}

export interface RichLocationData {
  id: string;          
  shortName: string;   
  fullName: string;    
  hierarchy: {         
    municipality: string; 
    state: string;        
    region?: string;      
  };
  coords: {            
    lat: number;
    lng: number;
  };
  rawAddressDetails?: any; 
  ibgeData?: IbgeSocioData;
  provenance?: DataProvenance;
}

export interface BriefingData {
  productDescription: string;
  contactMethod: string;
  usageDescription: string;
  operationalModel: string;
  dataSources: string[];
  marketPositioning: string;
  targetGender: string;
  targetAge: string[];
  geography: {
    city: string; 
    selectedItems: RichLocationData[]; 
    level: 'city' | 'state' | 'country';
    lat?: number;
    lng?: number;
  };
  objective: string;
}

export interface GeminiAnalysis {
  verdict: string;
  action: string;
  score: number;
  confidence?: number;
  reasons?: string[];
  risks?: string[];
  limitations?: string[];
}

export interface AdTechZoneData {
  id: string;
  lat: number;
  lng: number;
  cnpjDensity: number;
  footfallTraffic: number;
  isGhost: boolean;
  techFingerprint: 'iOS_5G' | 'ANDROID_WIFI';
  income: number;
  population: number;
  creativeHook: string;
  dominantProfile: string;
  provenance?: DataProvenance;
}
