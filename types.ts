
export enum AppStep {
  BRIEFING = 'BRIEFING',
  LOADING = 'LOADING',
  DASHBOARD = 'DASHBOARD'
}

export type DashboardView = 'COCKPIT' | 'EXPLORER' | 'COMMAND_CENTER';

// =========================
// GEO SIGNALS — CORE TYPES (Canonical)
// =========================

export type DataLabel = "REAL" | "PARTIAL_REAL" | "DERIVED" | "UNAVAILABLE";
export type SourceSystem = "IBGE" | "OSM_NOMINATIM" | "OSM_OVERPASS" | "GOOGLE_ADS" | "GA4" | "SEARCH_CONSOLE" | "META_ADS" | "RFB" | "INTERNAL";

export interface FetchAttempt {
  at: string;
  url: string;
  method: "GET" | "POST";
  ok: boolean;
  status?: number;
  contentType?: string;
  note?: string;
  durationMs?: number;
}

export interface Provenance {
  label: DataLabel;
  source: SourceSystem | string; // string allowed for legacy compat temporarily
  method?: string;
  source_url?: string;
  evidence_urls?: string[];
  attempts?: FetchAttempt[];
  fetchedAt?: string;
  locale?: string;
  notes?: string;
  confidence?: number; // Legacy compat
  ts?: string; // Legacy compat
}

// Aliases for compatibility
export type DataProvenance = Provenance;
export type DataProvenanceLabel = DataLabel;
export type GeoSignals = GeoSignalsEnvelope; // Alias for legacy code

export interface WeeklyHeatmap {
  id: string;
  mode: 'DIGITAL' | 'PHYSICAL';
  metric: string;
  windowDays: number;
  timezone: string;
  grid: number[][]; // 7 days x 24 hours
  bestWindows: Array<{ day: string; hour: number; value: number }>;
  worstWindows: Array<{ day: string; hour: number; value: number }>;
  provenance: Provenance;
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
  showHeatmap?: boolean;
  showIsochrone?: boolean;
  showTacticalMesh?: boolean;
  showHotspots?: boolean;
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
    provenance?: Provenance;
  };
}

export interface TacticalGeoJson {
  type: 'FeatureCollection';
  features: TacticalFeature[];
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export type GeometryType = "Polygon" | "MultiPolygon" | "LineString" | "MultiLineString";

export interface GeoJSONGeometry {
  type: GeometryType;
  coordinates: any;
}

// ==================================
// POLYGONS (IBGE malhas / setores)
// ==================================

export type PolygonKind = "IBGE_MUNICIPIO_MALHA" | "IBGE_SETOR_CENSITARIO" | "CUSTOM_AREA";

export interface PolygonProperties {
  id: string;
  kind: PolygonKind;
  ibge_municipio_id?: string;
  ibge_setor_id?: string;
  name?: string;
  adminLevel?: "municipio" | "setor" | "custom";
  population?: number | null;
  income?: number | null;
  targetAudienceEstimate?: number | null;
  score?: number | null;
}

export interface GeoSignalPolygon {
  type: "Feature";
  geometry: GeoJSONGeometry;
  properties: PolygonProperties;
  provenance: Provenance;
}

// =======================
// HOTSPOTS (até 20)
// =======================

export type HotspotKind = "MEETING_POINT" | "HIGH_INTENT" | "MOBILITY_NODE" | "COMMERCIAL_CLUSTER" | "CUSTOM_PIN";

export interface HotspotProperties {
  id: string;
  kind: HotspotKind;
  name?: string;
  rank?: number;
  score?: number | null;
  targetAudienceEstimate?: number | null;
  note?: string;
}

export interface GeoSignalHotspot {
  id: string;
  point: GeoPoint;
  properties: HotspotProperties;
  provenance: Provenance;
  // Legacy compat fields
  lat?: number;
  lng?: number;
  label?: string;
}

// =======================
// FLOWS (linhas / ruas)
// =======================

export type FlowKind = "STREET_FLOW" | "COMMUTE_FLOW" | "FOOTFALL_FLOW";

export interface FlowProperties {
  id: string;
  kind: FlowKind;
  intensity?: number | null;
  label?: string;
}

export interface GeoSignalFlow {
  type: "Feature";
  geometry: GeoJSONGeometry;
  properties: FlowProperties;
  provenance: Provenance;
}

// =======================
// TIMESERIES 168h
// =======================

export type TimeseriesMetric = "DIGITAL_INTENT" | "FOOTFALL_ESTIMATE" | "AD_ACTIVITY" | "CUSTOM";

export interface Timeseries168h {
  metric: TimeseriesMetric;
  values: number[]; // 168 values
  unit: "INDEX_0_100" | "COUNT" | "RATE" | "UNKNOWN";
  timezone: string;
  weekStartLocalISO: string;
  geoScope: {
    kind: "municipio" | "setor" | "custom";
    ibge_municipio_id?: string;
    polygonId?: string;
  };
  provenance: Provenance;
}

// =======================
// ENVELOPE FINAL
// =======================

export interface GeoSignalsEnvelope {
  version: "1.0";
  createdAt: string;
  realOnly: boolean;
  briefing: {
    primaryCity?: string;
    ibge_municipio_id?: string;
    radiusMeters?: number;
    marketPositioning?: string;
    objective?: string;
    audience?: {
      gender?: "M" | "F" | "ALL";
      ageRanges?: string[];
    };
    dataSources?: DataSourcesConfig; // Use the interface
  };
  polygons: GeoSignalPolygon[];
  hotspots: GeoSignalHotspot[];
  flows: GeoSignalFlow[];
  timeseries168h: Timeseries168h[];
  warnings?: string[];

  // Legacy aliases
  timeseries?: any[];
  meta?: any;
}

// Connector Types
export type ConnectorStatus = "OK" | "NOT_CONFIGURED" | "INVALID_REQUEST" | "UNAUTHORIZED" | "RATE_LIMITED" | "UPSTREAM_ERROR" | "UNAVAILABLE";

export interface ConnectorErrorResponse {
  ok: false;
  status: ConnectorStatus;
  connector: SourceSystem;
  message: string;
  missing?: string[];
  meta?: Record<string, any>;
  requestId: string;
  timestamp: string;
}

export interface ConnectorOkResponse<T> {
  ok: true;
  status: "OK";
  connector: SourceSystem;
  data: T;
  provenance?: Provenance;
  requestId: string;
  timestamp: string;
}

// Legacy Config Interfaces (Kept for compatibility with existing UI components)
export interface ConnectorConfigBase {
  connected: boolean;
  status?: "DISCONNECTED" | "PENDING" | "CONNECTED" | "NOT_CONFIGURED";
  lastCheckedAt?: string;
  notes?: string;
}
export interface GoogleAdsConfig extends ConnectorConfigBase { customerId?: string; accountId?: string; loginCustomerId?: string; }
export interface MetaAdsConfig extends ConnectorConfigBase { adAccountId?: string; pixelId?: string; }
export interface RfbConfig extends ConnectorConfigBase { cnpj?: string; }

export interface DataSourcesConfig {
  googleAds: GoogleAdsConfig;
  metaAds: MetaAdsConfig;
  rfb: RfbConfig;
  ibge: { connected: boolean };
  osm: { connected: boolean };
}

// Briefing Data (Updated to include new GeoSignalsEnvelope)
export type OperationalModel = 'Fixed' | 'ClientVisit' | 'Itinerant' | 'Shopping' | 'Investor' | 'Digital';
export type MarketPositioning = 'Popular' | 'CostBenefit' | 'Premium' | 'Luxury';
export type TargetGender = 'Female' | 'Male' | 'Mixed';
export type AgeRange = '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+';
export type GeographyScope = 'City' | 'State' | 'Country';
export type Objective = 'DominateRegion' | 'SellMore' | 'FindSpot' | 'ValidateIdea';

export interface IbgeSocioData {
  population: number;
  pib: number;
  averageIncome: number;
  lastUpdate: string;
  geocode: string;
  provenance?: Provenance;
  populationYear?: number;
  income?: number | null;
  incomeSource?: string;
}

export interface RichLocationData {
  id: string;
  shortName: string;
  fullName: string;
  hierarchy: { municipality: string; state: string; region?: string; };
  coords: { lat: number; lng: number; };
  rawAddressDetails?: any;
  ibgeData?: IbgeSocioData;
  provenance?: Provenance;
}

export interface BriefingInteligente {
  productDescription: string;
  contactMethod: string;
  usageDescription: string;
  operationalModel: OperationalModel | null;
  dataSources: DataSourcesConfig;
  marketPositioning: MarketPositioning | null;
  targetGender: TargetGender | null;
  targetAge: AgeRange[];
  geography: {
    city: string;
    state: string[];
    country: string;
    coords?: { lat: number; lng: number };
    level: GeographyScope;
  };
  objective: Objective | null;
}

export interface BriefingData extends BriefingInteligente {
  // Extended fields for legacy compatibility
  geography: {
    city: string;
    state: string[];
    country: string;
    coords?: { lat: number; lng: number };
    level: GeographyScope;
    selectedItems: RichLocationData[]; // Extra field in UI
    lat?: number;
    lng?: number;
    municipioId?: string;
  };
  ibgeData?: IbgeSocioData;
  geoSignals?: GeoSignalsEnvelope; // NEW
}

export interface IbgeOverlayBundle {
  municipioId: string;
  year: string;
  sectors: any;
  stats: Record<string, any>;
  provenance: Provenance;
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
  provenance?: Provenance;
}

export interface SectorStat {
  geocode: string;
  population?: number | null;
  income?: number | null;
  provenance: Provenance;
}

export interface ConnectorResult<T> {
  status: 'SUCCESS' | 'PARTIAL' | 'ERROR' | 'NOT_CONFIGURED' | 'UNAVAILABLE';
  provenance: DataLabel;
  data: T | null;
  sourceUrl?: string;
  notes?: string;
  attempts?: Array<{ url: string; status?: number; error?: string }>;
}

export interface IbgeScanData {
  population: number;
  income: number | null;
  populationYear: number;
  incomeSource?: string;
}

export interface ScanResult {
  timestamp: string;
  geocode: ConnectorResult<{ lat: number; lng: number; displayName: string; bounds: [number, number, number, number] }>;
  ibge: ConnectorResult<IbgeScanData>;
  places: ConnectorResult<any>;
  metaAds: ConnectorResult<any>;
  rfb: ConnectorResult<any>;
  ibgeSectors?: ConnectorResult<IbgeOverlayBundle>;
  hotspots?: any[];
  geoSignals?: GeoSignalsEnvelope;
}
