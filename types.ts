// ARQUÉTIPOS DE NEGÓCIO
export type BusinessArchetype = 'LOCAL_BUSINESS' | 'DIGITAL_BUSINESS' | 'PUBLIC_FIGURE';

export interface BriefingInteligente {
  // Novo Campo Controlador (Polimorfismo)
  archetype: BusinessArchetype;

  // Campos Básicos Adaptáveis
  productDescription: string; // Ou "Ideologia" para Políticos

  // Segmentação Financeira (ROI)
  financials: {
    ticketPrice: number; // Valor do Produto
    monthlyBudget: number; // Verba Disponível
  };

  // DNA do Tráfego (Ataque e Defesa)
  targeting: {
    tribeReferences: string[]; // INCLUSÃO (Ex: "Pablo Marçal", "Apple") - Min 3 tags
    negativeHints: string[];   // EXCLUSÃO (Ex: "Sem dinheiro", "Curiosos")
    targetGender: 'Todos' | 'Homens' | 'Mulheres';
    targetAge: string;
    description?: string; // Descrição do nicho
    generatedInterests?: any[]; // Interesses gerados pelo Backend
  };

  // Geografia Flexível
  geography: {
    level: 'STREET' | 'CITY' | 'STATE' | 'COUNTRY';
    city: string; // Se Digital, pode ser "Brasil" ou "Global"
    radius: number;
    lat: number;
    lng: number;
    municipioId?: string; // Optional for compatibility
    country?: string;
    state?: string;
    selectedItems?: any[];
    coords?: { lat: number; lng: number }; // Added for compatibility
  };

  // Sinais de Inteligência (Hotspots) - Enriquecidos com Exclusão
  geoSignals: GeoSignal | null;

  // Data Sources configuration
  dataSources?: {
    metaAds?: {
      connected: boolean;
      adAccountId?: string;
      businessId?: string;
      pixelId?: string;
      datasetId?: string;
    };
  };
  ibgeData?: any;
  objective?: string;
  operationalModel?: string;
  marketPositioning?: string;
  usageDescription?: string;
  contactMethod?: string;
}

export type BriefingData = BriefingInteligente;

export interface GeoSignal {
  hotspots: Hotspot[];
  scannedArea: {
    lat: number;
    lng: number;
    radiusKm: number;
  };
  bestSegments: string[];    // Lista de Inclusão Sugerida
  excludedSegments: string[]; // Lista de Exclusão Sugerida (NOVO)
  competitorsFound: string[];
  // Compatibility fields for complex envelope
  polygons?: GeoSignalPolygon[];
}

export interface Hotspot {
  id: string | number;
  lat: number;
  lng: number;
  label: string;
  score: number; // 0-100
  properties?: any;
  type?: string;
  audience_total?: number | null;
  rank?: number;
  name?: string;
  provenance?: Provenance;
  radiusMeters?: number; // Optional
  coords?: [number, number]; // Optional
}

export interface Provenance {
  label: string;
  source: string;
  method?: string;
  source_url?: string;
  notes?: string;
  retrieved_at?: string;
  attempts?: number;
}

export interface ConnectorResult<T> {
  status: 'ACTIVE' | 'NOT_CONFIGURED' | 'ERROR' | 'UNAVAILABLE' | 'REAL';
  provenance: Provenance | string;
  data: T | null;
  notes?: string;
  message?: string;
}

export interface RfbConfig {
  connected: boolean;
  cnpj?: string;
}

export interface GoogleAdsConfig {
  connected: boolean;
  customerId?: string;
}

export interface IbgeOverlayBundle {
  municipioId: string;
  year: string;
  sectors: any;
  stats: any;
  provenance: Provenance;
}

// --- ADVANCED GEO PROTOCOL V2 TYPES ---

export interface GeoSignalPolygon {
  type: 'Feature';
  geometry: any;
  properties: {
    id: string;
    kind: string;
    name: string;
    adminLevel: string;
    population: number | null;
    income: number | null;
    targetAudienceEstimate: number | null;
    score: number | null;
    ibge_municipio_id?: string;
    ibge_setor_id?: string;
  };
  provenance: Provenance;
}

export interface GeoSignalHotspot {
  id: string;
  point: { lat: number; lng: number };
  lat: number;
  lng: number;
  label: string;
  properties: any;
  provenance: Provenance;
}

export interface GeoSignalFlow {
  type: 'Feature';
  geometry: any;
  properties: any;
  provenance: Provenance;
}

export interface Timeseries168h {
  metric: string;
  values: number[];
}

export interface WeeklyHeatmap {
  day: string;
  values: number[];
}

export interface GeoSignalsEnvelope {
  version: string;
  createdAt: string;
  realOnly: boolean;
  briefing: {
    primaryCity: string;
    ibge_municipio_id?: string;
    dataSources?: any;
  };
  polygons: GeoSignalPolygon[];
  hotspots: GeoSignalHotspot[];
  flows: GeoSignalFlow[];
  timeseries168h: Timeseries168h[];
  timeseries: WeeklyHeatmap[];
  warnings: any[];
  meta: any;
}

// Tactical Map Types
export interface TacticalFeature {
  type: 'Feature';
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  properties: {
    id: number | string;
    geocode: string;
    income: number;
    population: number;
    volume: number; // 0-100
    density: number; // 0-1
    name: string;
    provenance: Provenance | string; // Normalized to Provenance later
  };
}

export interface TacticalGeoJson {
  type: 'FeatureCollection';
  features: TacticalFeature[];
}

export interface IbgeSocioData {
  population: number;
  pib: number;
  averageIncome: number;
  lastUpdate: string;
  geocode: string;
  provenance: Provenance;
  populationYear?: number;
  income?: number | null;
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
