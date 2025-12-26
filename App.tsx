
import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppStep, BriefingData, BriefingInteligente, GeminiAnalysis, MapSettings, DashboardView, RichLocationData, ScanResult } from './types';
import { BriefingWizard } from './components/BriefingWizard';
import { Sidebar } from './components/Sidebar';
import { analyzeBriefing } from './services/geminiService';
import { fetchIbgeGeocode, fetchRealIbgeData, isInsideBrazil } from './services/ibgeService';
import { runBriefingScan } from './services/scanOrchestrator';
import { AlertTriangle } from 'lucide-react';
import { useTheme } from './src/hooks/useTheme';

// Lazy load heavy components
const ExplorerPage = React.lazy(() => import('./components/ExplorerPage').then(module => ({ default: module.ExplorerPage })));
const CockpitHome = React.lazy(() => import('./components/CockpitHome').then(module => ({ default: module.CockpitHome })));
const MetaCommandCenter = React.lazy(() => import('./components/MetaCommandCenter').then(module => ({ default: module.MetaCommandCenter })));

const DEFAULT_CENTER: [number, number] = [-23.5505, -46.6333];

const App: React.FC = () => {
  const isRealOnly = import.meta.env.VITE_REAL_ONLY === 'true';
  const { theme } = useTheme();

  const [view, setView] = useState<AppStep>(AppStep.BRIEFING);
  const [dashboardView, setDashboardView] = useState<DashboardView>('COCKPIT');

  const [rawBriefing, setRawBriefing] = useState<BriefingInteligente | null>(null);
  const [briefingData, setBriefingData] = useState<BriefingData | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const [analysis, setAnalysis] = useState<GeminiAnalysis | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [loadingStatus, setLoadingStatus] = useState("Iniciando BIA Protocol...");
  const [outOfJurisdiction, setOutOfJurisdiction] = useState(false);

  const [mapSettings, setMapSettings] = useState<MapSettings>({
    showIncome: true,
    showLogistics: true,
    showCompetitors: true,
    liveTime: 14,
    radius: 2000,
    zoom: 13,
    minScore: 0,
    selectedPersona: 'ALL'
  });

  // Hotspots Inteligentes: Baseados na localidade real do briefing
  const hotspots = useMemo(() => {
    const geoHotspots = scanResult?.geoSignals?.hotspots;
    if (geoHotspots && geoHotspots.length > 0) {
      return geoHotspots
        .filter((h) => h && (typeof h.lat === 'number' || typeof h.point?.lat === 'number'))
        .map((h: any, idx: number) => ({
          id: h.id || String(idx + 1),
          point: h.point,
          properties: h.properties,
          provenance: h.provenance,
          lat: h.lat ?? h.point?.lat,
          lng: h.lng ?? h.point?.lng,
          label: h.label || h.properties?.name || `Hotspot ${idx + 1}`,
          rank: h.properties?.rank ?? idx + 1,
          name: h.properties?.name || h.label || `Hotspot ${idx + 1}`,
          score: h.properties?.score ?? 0
        }));
    }

    if (!briefingData || !briefingData.geography || outOfJurisdiction) return [];

    const lat = briefingData.geography.lat || mapCenter[0];
    const lng = briefingData.geography.lng || mapCenter[1];
    const level = briefingData.geography.level;
    const cityLabel = briefingData.geography.city.split(',')[0] || "Alvo";

    // REAL_ONLY: sem hotspots simulados; se não houver hotspots reais/estáticos, evitar lista vazia com placeholder explícito.
    if (isRealOnly) {
      return [{
        id: "real_only_placeholder",
        point: { lat, lng },
        properties: {
          id: "real_only_placeholder",
          kind: 'CUSTOM_PIN',
          rank: 1,
          name: "Base estática (IBGE) indisponível",
          score: 0
        },
        provenance: { label: 'UNAVAILABLE', source: 'IBGE', method: 'real_only_placeholder' },
        lat,
        lng,
        label: "Base estática (IBGE) indisponível",
        rank: 1,
        name: "Base estática (IBGE) indisponível",
        score: 0
      }];
    }

    // Spread dinâmico
    const spread = level === 'city' ? 0.025 : level === 'state' ? 1.8 : 8;

    return Array.from({ length: 20 }, (_, i) => {
      const angle = (i * 137.5 * Math.PI) / 180;
      const dist = Math.sqrt(i) * (spread / Math.sqrt(20));
      const hLat = lat + Math.sin(angle) * dist;
      const hLng = lng + Math.cos(angle) * dist;

      if (!isInsideBrazil(hLat, hLng)) return null;

      return {
        id: String(i + 1),
        point: { lat: hLat, lng: hLng },
        properties: {
          id: String(i + 1),
          kind: 'CUSTOM_PIN',
          rank: i + 1,
          name: `${cityLabel.toUpperCase()} - CLUSTER ${i + 1}`,
          score: Math.floor(70 + Math.random() * 29),
        },
        provenance: { label: 'DERIVED', source: 'Heuristic Spread' },
        // Legacy
        lat: hLat,
        lng: hLng,
        label: `${cityLabel.toUpperCase()} - CLUSTER ${i + 1}`
      };
    }).filter(h => h !== null) as any[]; // Cast to avoid complex type match with strict filtering
  }, [briefingData, mapCenter, outOfJurisdiction, isRealOnly, scanResult]);

  const handleBriefingComplete = async (data: BriefingInteligente, preScan?: ScanResult) => {
    setRawBriefing(data);

    // Se já temos o scan (via Wizard Trigger), pulamos o loading e vamos direto
    if (preScan) {
      setScanResult(preScan);
      processScanAndNavigate(data, preScan, true);
      return;
    }

    // Fallback Legacy (se chamado sem preScan)
    setView(AppStep.LOADING);
    setLoadingStatus("Iniciando Scan Real...");

    try {
      setLoadingStatus("Consultando Base IBGE...");
      const scanPromise = runBriefingScan(data);
      setTimeout(() => setLoadingStatus("Triangulando dados de Renda..."), 800);
      setTimeout(() => setLoadingStatus("Calculando Hotspots..."), 1600);

      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const [scan] = await Promise.all([scanPromise, sleep(2500)]);

      setScanResult(scan);
      processScanAndNavigate(data, scan, false);

    } catch (e) {
      console.error(e);
      setLoadingStatus("Erro Crítico no Scan.");
    }
  };

  const processScanAndNavigate = async (data: BriefingInteligente, scan: ScanResult, isInstant: boolean = false) => {
    // 2. Validate Geocode
    if (scan.geocode.status === 'ERROR' || !scan.geocode.data) {
      alert("Falha na geocodificação. Tente outra cidade.");
      setView(AppStep.BRIEFING);
      return;
    }

    const { lat, lng } = scan.geocode.data;

    if (!isInsideBrazil(lat, lng)) {
      setOutOfJurisdiction(true);
      setMapCenter([lat, lng]);

      // Create dummy legacy data for view (Out of BR)
      const legacyData: BriefingData = {
        productDescription: data.productDescription,
        contactMethod: data.contactMethod,
        usageDescription: data.usageDescription,
        operationalModel: data.operationalModel || null,
        dataSources: data.dataSources,
        marketPositioning: data.marketPositioning || null,
        targetGender: data.targetGender || null,
        targetAge: data.targetAge,
        geography: {
          city: data.geography.city,
          state: data.geography.state || [],
          country: data.geography.country || 'BR',
          lat, lng,
          level: data.geography.level,
          selectedItems: [],
          municipioId: scan.ibgeCode
        },
        objective: data.objective || null,
        geoSignals: scan.geoSignals
      };
      setBriefingData(legacyData);
      setView(AppStep.DASHBOARD);
      return;
    }

    setOutOfJurisdiction(false);
    setMapCenter([lat, lng]);

    // 3. Map to Legacy Data (Adapter Pattern for UI compatibility)
    const legacyData: BriefingData = {
      productDescription: data.productDescription,
      contactMethod: data.contactMethod,
      usageDescription: data.usageDescription,
      operationalModel: data.operationalModel || null,
      dataSources: data.dataSources,
      marketPositioning: data.marketPositioning || null,
      targetGender: data.targetGender || null,
      targetAge: data.targetAge,
      geography: {
        city: data.geography.city,
        state: data.geography.state || [],
        country: data.geography.country || 'BR',
        lat, lng,
        level: data.geography.level,
        municipioId: scan.ibgeCode,
        selectedItems: [{
          id: 'MainLocation',
          shortName: data.geography.city.split(',')[0],
          fullName: scan.geocode.data.displayName,
          hierarchy: { municipality: data.geography.city.split(',')[0], state: '' },
          coords: { lat, lng },
          // Inject Real IBGE Data into the location object if available
          ibgeData: scan.ibge.status === 'SUCCESS' && scan.ibge.data ? {
            population: scan.ibge.data.population,
            pib: 0,
            averageIncome: scan.ibge.data.income || 0,
            lastUpdate: '2022',
            geocode: '0000000',
            provenance: {
              label: scan.ibge.provenance,
              source: scan.ibge.sourceUrl || 'IBGE'
            }
          } : undefined
        }]
      },
      objective: data.objective || null,
      geoSignals: scan.geoSignals
    };

    setBriefingData(legacyData);

    // 4. Gemini Analysis (Gated)
    if (isRealOnly) {
      // setLoadingStatus ignorado se via preScan, mas processado em background
      setAnalysis(null);
    } else {
      // setLoadingStatus("Sincronizando Inteligência Gemini..."); 
      const result = await analyzeBriefing(legacyData);
      setAnalysis(result);
    }

    // Se viemos do preScan, já estamos prontos, apenas trocamos a view
    if (isInstant) {
      setView(AppStep.DASHBOARD);
      setDashboardView('COCKPIT');
    } else {
      // Legacy transition
      setTimeout(() => {
        setView(AppStep.DASHBOARD);
        setDashboardView('COCKPIT');
      }, 500);
    }
  };


  const renderDashboardView = () => {
    if (outOfJurisdiction) {
      return (
        <div className="h-full w-full bg-slate-950 flex flex-col items-center justify-center p-8 text-center font-mono">
          <AlertTriangle size={40} className="text-red-500 mb-6 animate-pulse" />
          <h2 className="text-2xl font-black text-white uppercase mb-4 tracking-tighter">GPS FORA DE JURISDIÇÃO</h2>
          <button onClick={() => setView(AppStep.BRIEFING)} className="px-8 py-4 bg-white text-black font-black uppercase rounded-xl hover:scale-105 transition-all">Reiniciar</button>
        </div>
      );
    }

    switch (dashboardView) {
      case 'COCKPIT':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full text-[#39ff14] font-mono">CARREGANDO COCKPIT...</div>}>
            <CockpitHome briefingData={briefingData!} analysis={analysis} mapSettings={mapSettings} mapCenter={mapCenter} onNavigateToExplorer={() => setDashboardView('EXPLORER')} onCenterChange={setMapCenter} />
          </Suspense>
        );
      case 'EXPLORER':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full text-[#39ff14] font-mono">INICIANDO MAPAS...</div>}>
            <ExplorerPage mapCenter={mapCenter} mapSettings={mapSettings} setMapSettings={setMapSettings} briefingData={briefingData!} analysis={analysis} onBack={() => setDashboardView('COCKPIT')} onCenterChange={setMapCenter} hotspots={hotspots} />
          </Suspense>
        );
      case 'COMMAND_CENTER':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full text-[#39ff14] font-mono">CARREGANDO COMANDO...</div>}>
            <MetaCommandCenter briefingData={briefingData!} analysis={analysis} mapSettings={mapSettings} mapCenter={mapCenter} onCenterChange={setMapCenter} hotspots={hotspots} />
          </Suspense>
        );
      default: return null;
    }
  };

  const handleExplorerStart = () => {
    // Default data for free exploration
    const explorerData: BriefingData = {
      productDescription: 'Exploração Livre',
      contactMethod: 'N/A',
      usageDescription: 'N/A',
      operationalModel: 'Digital',
      dataSources: {
        ibge: { connected: true },
        osm: { connected: true },
        googleAds: { connected: false },
        metaAds: { connected: false },
        rfb: { connected: false }
      },
      marketPositioning: 'Premium',
      targetGender: 'Mixed',
      targetAge: [],
      geography: {
        city: 'São Paulo, SP',
        state: [],
        country: 'BR',
        lat: -23.5505,
        lng: -46.6333,
        level: 'City',
        selectedItems: []
      },
      objective: 'DominateRegion'
    };
    setBriefingData(explorerData);
    setView(AppStep.DASHBOARD);
    setDashboardView('EXPLORER');
  };

  if (view === AppStep.BRIEFING) return <BriefingWizard onComplete={handleBriefingComplete} onExplorerMode={handleExplorerStart} />;

  if (view === AppStep.LOADING) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center font-mono text-[#39ff14]">
      <div className="w-24 h-24 border-4 border-slate-900 border-t-[#39ff14] rounded-full animate-spin mb-8"></div>
      <h2 className="text-xl font-black uppercase tracking-[0.3em]">{loadingStatus}</h2>
    </div>
  );

  return (
    <div className="w-screen h-screen bg-app flex overflow-hidden">
      <Sidebar currentView={dashboardView} onChangeView={setDashboardView} onLogout={() => setView(AppStep.BRIEFING)} />
      <div className="flex-1 min-h-0 relative h-full">{renderDashboardView()}</div>
    </div>
  );
};

export default App;
