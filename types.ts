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
}

// --- MISSING TYPES ADDED ---

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
