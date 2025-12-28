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
  };

  // Sinais de Inteligência (Hotspots) - Enriquecidos com Exclusão
  geoSignals: GeoSignal | null;
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
  id: string;
  lat: number;
  lng: number;
  label: string;
  score: number; // 0-100
  properties?: any;
}
