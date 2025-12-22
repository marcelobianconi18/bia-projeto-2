
import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { AppStep, BriefingData, GeminiAnalysis, MapSettings, DashboardView, RichLocationData } from './types';
import { BriefingWizard } from './components/BriefingWizard';
// Lazy load heavy components
const ExplorerPage = React.lazy(() => import('./components/ExplorerPage').then(module => ({ default: module.ExplorerPage })));
const CockpitHome = React.lazy(() => import('./components/CockpitHome').then(module => ({ default: module.CockpitHome })));
const MetaCommandCenter = React.lazy(() => import('./components/MetaCommandCenter').then(module => ({ default: module.MetaCommandCenter })));
// Keep BriefingWizard import comment removed to avoid clutter
// BriefingWizard is imported at top

import { Sidebar } from './components/Sidebar';
import { analyzeBriefing } from './services/geminiService';
import { fetchIbgeGeocode, fetchRealIbgeData, isInsideBrazil } from './services/ibgeService';
import { Database, ShieldCheck, Globe, AlertTriangle } from 'lucide-react';

const DEFAULT_CENTER: [number, number] = [-23.5505, -46.6333];

const App: React.FC = () => {
  const [view, setView] = useState<AppStep>(AppStep.BRIEFING);
  const [dashboardView, setDashboardView] = useState<DashboardView>('COCKPIT');
  const [briefingData, setBriefingData] = useState<BriefingData | null>(null);
  const [analysis, setAnalysis] = useState<GeminiAnalysis | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [loadingStatus, setLoadingStatus] = useState("Iniciando BIA Protocol...");
  const [isRealDataAvailable, setIsRealDataAvailable] = useState(true);
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
    if (!briefingData || !briefingData.geography || outOfJurisdiction) return [];

    const lat = briefingData.geography.lat || mapCenter[0];
    const lng = briefingData.geography.lng || mapCenter[1];
    const level = briefingData.geography.level;
    const cityLabel = briefingData.geography.city.split(',')[0] || "Alvo";

    // Spread dinâmico: Cidade = 0.02, Estado = 1.5, País = 10
    const spread = level === 'city' ? 0.025 : level === 'state' ? 1.8 : 8;

    return Array.from({ length: 20 }, (_, i) => {
      const angle = (i * 137.5 * Math.PI) / 180; // Distribuição orgânica (Phyllotaxis)
      const dist = Math.sqrt(i) * (spread / Math.sqrt(20));
      const hLat = lat + Math.sin(angle) * dist;
      const hLng = lng + Math.cos(angle) * dist;

      if (!isInsideBrazil(hLat, hLng)) return null;

      return {
        id: i + 1,
        rank: i + 1,
        name: `${cityLabel.toUpperCase()} - CLUSTER ${i + 1}`,
        score: Math.floor(70 + Math.random() * 29),
        lat: hLat,
        lng: hLng,
        type: level === 'city' ? 'Micro-Setor' : level === 'state' ? 'Município-Chave' : 'Região Econômica'
      };
    }).filter(h => h !== null);
  }, [briefingData, mapCenter, outOfJurisdiction]);

  const handleBriefingComplete = async (data: BriefingData) => {
    const lat = data.geography?.lat || DEFAULT_CENTER[0];
    const lng = data.geography?.lng || DEFAULT_CENTER[1];

    if (!isInsideBrazil(lat, lng)) {
      setOutOfJurisdiction(true);
      setBriefingData(data);
      setView(AppStep.DASHBOARD);
      return;
    }

    setOutOfJurisdiction(false);
    setBriefingData(data);
    setView(AppStep.LOADING);
    setMapCenter([lat, lng]);

    // Ajuste de Zoom baseado no nível
    const newZoom = data.geography.level === 'city' ? 13 : data.geography.level === 'state' ? 7 : 4;
    setMapSettings(prev => ({ ...prev, zoom: newZoom }));

    try {
      setLoadingStatus("Auditoria de Metadados IBGE...");
      const firstLoc = data.geography.selectedItems[0];
      if (firstLoc && typeof firstLoc !== 'string') {
        const geocode = await fetchIbgeGeocode(firstLoc.hierarchy.municipality, firstLoc.hierarchy.state);
        if (geocode) {
          setLoadingStatus("Sincronização SIDRA v3 Real...");
          const ibgeStats = await fetchRealIbgeData(geocode);
          if (ibgeStats) {
            firstLoc.ibgeData = ibgeStats;
            setIsRealDataAvailable(true);
          }
        }
      }
    } catch (e) {
      setIsRealDataAvailable(false);
    }

    setLoadingStatus("Sincronizando Inteligência Gemini...");
    const result = await analyzeBriefing(data);
    setAnalysis(result);

    setTimeout(() => {
      setView(AppStep.DASHBOARD);
      setDashboardView('COCKPIT');
    }, 800);
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

  if (view === AppStep.BRIEFING) return <BriefingWizard onComplete={handleBriefingComplete} />;

  if (view === AppStep.LOADING) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center font-mono text-[#39ff14]">
      <div className="w-24 h-24 border-4 border-slate-900 border-t-[#39ff14] rounded-full animate-spin mb-8"></div>
      <h2 className="text-xl font-black uppercase tracking-[0.3em]">{loadingStatus}</h2>
    </div>
  );

  return (
    <div className="w-screen h-screen bg-[#f8f9fa] flex overflow-hidden">
      <Sidebar currentView={dashboardView} onChangeView={setDashboardView} onLogout={() => setView(AppStep.BRIEFING)} />
      <div className="flex-1 relative h-full">{renderDashboardView()}</div>
    </div>
  );
};

export default App;
