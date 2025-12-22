import React, { useState, useMemo } from 'react';
import { MapSettings, BriefingData, GeminiAnalysis } from '../types';
import { useTheme } from '../src/hooks/useTheme';
import { Navigation, Download, Copy, Facebook, X, Loader2, Check, ChevronLeft, ChevronRight, Eye, SlidersHorizontal, Activity, Flame } from 'lucide-react';
import { ExplainabilityCard } from './ExplainabilityCard';
import { WeeklyHeatmapWidget } from './WeeklyHeatmapWidget'; // New Widget
import { Timeseries168Widget } from './Timeseries168Widget'; // Phase 3 Widget
import L from 'leaflet';

interface DashboardUIProps {
  settings: MapSettings;
  onSettingsChange: (s: MapSettings) => void;
  onCenterChange?: (coords: [number, number]) => void;
  briefing: BriefingData;
  analysis: GeminiAnalysis | null;
  onBack: () => void;
  map: L.Map | null;
  hotspots?: any[];
}

const formatIntBR = (n?: number | null) =>
  typeof n === 'number' && Number.isFinite(n) ? new Intl.NumberFormat('pt-BR').format(Math.trunc(n)) : 'N/A';

export const DashboardUI: React.FC<DashboardUIProps> = ({
  settings,
  onSettingsChange,
  onCenterChange,
  briefing,
  analysis,
  onBack,
  map,
  hotspots = []
}) => {
  const [showExport, setShowExport] = useState(false);
  const [exportStep, setExportStep] = useState<'selection' | 'loading' | 'result'>('selection');
  const [copied, setCopied] = useState(false);

  const isRealOnly = import.meta.env.VITE_REAL_ONLY === 'true';

  // tenta achar IBGE real no briefing (sem inventar nada)
  const realIbgeData: any =
    (briefing as any)?.geography?.selectedItems?.[0]?.ibgeData ??
    (briefing as any)?.geography?.ibgeData ??
    (briefing as any)?.ibgeData ??
    null;

  const toggleSetting = (key: keyof MapSettings) => {
    onSettingsChange({ ...settings, [key]: !settings[key as any] });
  };

  const handleNavigate = (lat: number, lng: number) => {
    if (map && lat !== undefined && lng !== undefined) {
      map.flyTo([lat, lng], 15, { duration: 1.5 });
    }
    if (onCenterChange && lat !== undefined && lng !== undefined) {
      onCenterChange([lat, lng]);
    }
  };

  const handleViewAll = () => {
    if (map && hotspots && hotspots.length > 0) {
      const validCoords = hotspots
        .filter(h => h && typeof h.lat === 'number' && typeof h.lng === 'number')
        .map(h => [h.lat, h.lng] as L.LatLngExpression);

      if (validCoords.length > 0) {
        const bounds = L.latLngBounds(validCoords);
        map.fitBounds(bounds, { padding: [100, 100], duration: 2, maxZoom: 14 });
      }
    }
  };

  const handleCopyPasteSelect = () => {
    setExportStep('loading');
    setTimeout(() => setExportStep('result'), 1500);
  };

  const copyToClipboard = () => {
    const scoreText = isRealOnly ? 'N/A (REAL_ONLY)' : `${analysis?.score ?? 'N/A'}/100`;
    const verdictText = isRealOnly ? 'REAL_ONLY: IA desativada' : (analysis?.verdict ?? 'N/A');

    const text = `
⚡ ESTRATÉGIA TÁTICA BIA - ${String(briefing?.geography?.city ?? 'CIDADE').toUpperCase()}
-----------------------------------------
🎯 Foco: ${briefing?.marketPositioning ?? 'N/A'}
📍 Raio de Ação: ${(Number(settings?.radius ?? 0) / 1000).toFixed(1)}km

🧠 INSIGHT:
Score: ${scoreText}
Veredito: ${verdictText}

📊 DADO REAL (IBGE):
População: ${formatIntBR(realIbgeData?.population)}
Renda: ${realIbgeData?.income == null ? 'INDISPONÍVEL (IBGE)' : formatIntBR(realIbgeData?.income)}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const metrics = useMemo(() => {
    const population = realIbgeData?.population ?? null;

    return {
      totalPopulation: isRealOnly ? formatIntBR(population) : "N/A",
      avgScore: isRealOnly ? null : (analysis?.score ?? 72),
      reach: isRealOnly ? "N/A" : "340k"
    };
  }, [analysis, isRealOnly, realIbgeData]);

  const scoreBarWidth = typeof metrics.avgScore === 'number' ? Math.max(0, Math.min(100, metrics.avgScore)) : 0;

  const { theme } = useTheme();

  return (
    <>
      <div className="absolute top-0 left-0 w-full z-[1000] p-6 flex justify-between items-center pointer-events-none font-mono">
        <div className="flex items-center gap-4 pointer-events-auto">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded bg-surface2 border border-app text-app hover:bg-surface transition shadow-lg backdrop-blur-md">
            <ChevronLeft size={20} />
          </button>
          <div className="bg-surface2 px-4 py-2.5 rounded border border-app flex items-center gap-3">
            <div className="w-2 h-2 bg-ok rounded-full animate-pulse shadow-[0_0_10px_var(--ok)]"></div>
            <div>
              <h1 className="text-[12px] font-black text-app uppercase tracking-tighter">BIA TACTICAL ENGINE</h1>
              <p className="text-[9px] text-muted font-bold uppercase tracking-widest">
                {briefing.geography.city} // {isRealOnly ? 'REAL_ONLY' : 'SCAN_MODE'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pointer-events-auto bg-surface2 border border-app p-1.5 rounded backdrop-blur-md">
          <button onClick={() => onSettingsChange({ ...settings, zoom: 13 })} className={`px-4 py-2 rounded text-[9px] font-black uppercase tracking-widest transition-all ${settings.zoom === 13 ? 'bg-surface text-app' : 'text-muted2'}`}>2D_FLAT</button>
          <button onClick={() => onSettingsChange({ ...settings, zoom: 16 })} className={`px-4 py-2 rounded text-[9px] font-black uppercase tracking-widest transition-all ${settings.zoom === 16 ? 'bg-surface text-app' : 'text-muted2'}`}>3D_ISO</button>
        </div>
      </div>

      <div className="absolute top-24 left-6 w-72 z-[1000] flex flex-col gap-4 pointer-events-none font-mono">
        <div className="bg-surface2 rounded border border-app p-5 pointer-events-auto shadow-2xl">
          <h3 className="text-[10px] font-black text-accent uppercase tracking-widest mb-6 flex items-center gap-2">
            <SlidersHorizontal size={14} /> FILTRAGEM TÁTICA
          </h3>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] text-muted2 uppercase font-bold">Score Mínimo</span>
                <span className="text-[11px] font-black text-app">{settings.minScore || 0}%</span>
              </div>
              <input
                type="range"
                min="0" max="95" step="5"
                value={settings.minScore || 0}
                onChange={(e) => onSettingsChange({ ...settings, minScore: parseInt(e.target.value) })}
                className="w-full h-1 bg-surface border border-app appearance-none cursor-pointer accent-gray-500"
                disabled={isRealOnly}
              />
              {isRealOnly && (
                <p className="mt-2 text-[9px] text-muted2 uppercase font-black">
                  REAL_ONLY: score/IA desativados
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-app space-y-2">
              <span className="text-[9px] text-muted2 uppercase font-black block mb-2">Visibilidade</span>
              {[
                { id: 'showIncome', label: 'CAMADA_RENDA' },
                { id: 'showLogistics', label: 'RAIO_TÁTICO' },
                { id: 'showCompetitors', label: 'RADAR_CONC' },
                { id: 'hideNoise', label: 'FILTRO_ANTI_GHOST' }
              ].map(l => (
                <button
                  key={l.id}
                  onClick={() => !isRealOnly && toggleSetting(l.id as any)}
                  className={`w-full flex items-center justify-between p-3 border transition-all ${isRealOnly
                    ? 'bg-transparent border-app text-muted2 cursor-not-allowed opacity-50'
                    : (settings[l.id as keyof MapSettings]
                      ? 'bg-surface border-app text-app'
                      : 'bg-transparent border-app text-muted2')
                    }`}
                >
                  <span className="text-[10px] font-bold">{l.label}</span>
                  <div className={`w-1.5 h-1.5 ${!isRealOnly && settings[l.id as keyof MapSettings] ? 'bg-ok shadow-[0_0_5px_var(--ok)]' : 'bg-surface'}`} />
                </button>
              ))}
              {isRealOnly && (
                <p className="mt-2 text-[9px] text-muted2 uppercase font-black">
                  REAL_ONLY: camadas sintéticas/derivadas desativadas
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-surface2 rounded border border-app p-5 pointer-events-auto shadow-2xl">
          <h3 className="text-[10px] font-black text-muted2 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Activity size={14} /> MÉTRICAS_BIA
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface p-3 border border-app">
              <span className="text-[8px] text-muted2 block uppercase">Pop. Total (IBGE)</span>
              <span className="text-sm font-black text-app">{metrics.totalPopulation}</span>
            </div>
            <div className="bg-surface p-3 border border-app">
              <span className="text-[8px] text-muted2 block uppercase">Score</span>
              <span className="text-sm font-black text-app">
                {metrics.avgScore == null ? 'N/A' : `${metrics.avgScore}%`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Painel direito */}
      <div className="absolute top-24 right-6 w-80 bottom-24 z-[1000] flex flex-col gap-4 pointer-events-none font-mono">
        <div className="bg-surface2 rounded border border-app p-5 pointer-events-auto shadow-2xl shrink-0">
          <div className="flex justify-between items-end mb-4 gap-4">
            <div>
              <h3 className="text-[10px] font-black text-app uppercase tracking-widest mb-1">OPORTUNIDADE_LOC</h3>
              <div className="mt-2 inline-block bg-surface2 rounded border border-app p-2 pointer-events-auto shadow-2xl">
                <span className="text-[10px] font-black text-accent bg-surface px-2 py-0.5 rounded border border-app">
                  {isRealOnly ? "REAL_ONLY" : (metrics.avgScore > 75 ? "ALVO_CRITICO" : "TERRITORIO_NEUTRO")}
                </span>
              </div>
              <div className="mt-2">
                <span className="text-3xl font-black text-app leading-none">{metrics.reach}</span>
              </div>
            </div>
          </div>


          <div className="w-full h-1 bg-surface border border-app overflow-hidden">
            <div className="h-full bg-ok shadow-[0_0_10px_var(--ok)] transition-all duration-1000" style={{ width: `${scoreBarWidth}%` }} />
          </div>

          <div className="mt-4 bg-app p-3 border border-app">
            <p className="text-[10px] text-muted italic leading-relaxed uppercase">
              {'>>'} "{isRealOnly ? 'REAL_ONLY: sem IA' : (analysis?.verdict ?? 'N/A')}"
            </p>
          </div>
        </div>

        {/* Weekly Heatmap Widget (Legacy Phase 1.5) */}
        {briefing.geoSignals?.timeseries && (
          <div className="pointer-events-auto shrink-0 bg-surface2 rounded border border-app shadow-2xl p-4 min-h-[220px]">
            <WeeklyHeatmapWidget data={briefing.geoSignals.timeseries} />
          </div>
        )}

        {/* Phase 3: Peak Hours Widget */}
        <div className="pointer-events-auto shrink-0 bg-surface2 rounded border border-app shadow-2xl p-4 min-h-[220px]">
          <Timeseries168Widget
            region={{ kind: 'MUNICIPIO', city: briefing.geography.city }}
            isRealOnly={isRealOnly}
          />
        </div>

        <div className="bg-surface2 rounded border border-app pointer-events-auto flex flex-col flex-1 overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-app bg-surface2 flex items-center justify-between">
            <h3 className="text-[10px] font-black text-app uppercase tracking-widest flex items-center gap-2">
              <Flame size={14} className="text-warn" /> ZONAS_QUENTES
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar bg-surface/20">
            {isRealOnly ? (
              <div className="p-3 text-[10px] text-muted2 uppercase font-black">
                REAL_ONLY: hotspots desativados (evita simulação)
              </div>
            ) : (
              hotspots?.filter(s => s && s.lat !== undefined).map((spot) => (
                <button
                  key={spot.id}
                  onClick={() => handleNavigate(spot.lat, spot.lng)}
                  className="w-full flex items-center justify-between p-3 rounded hover:bg-surface transition group text-left border border-transparent hover:border-app mb-1"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-black w-6 h-6 flex items-center justify-center border ${spot.rank <= 3 ? 'border-accent text-accent' : 'border-surface text-muted2'}`}>{spot.rank}</span>
                    <div>
                      <p className="text-[11px] font-bold text-muted group-hover:text-app uppercase">{spot.name}</p>
                      <p className="text-[8px] text-muted2 uppercase font-black tracking-widest">{spot.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black text-accent">{spot.score}%</span>
                    <ChevronRight size={12} className="text-muted2 group-hover:text-accent" />
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="p-4 bg-app border-t border-app space-y-2">
            <button
              onClick={handleViewAll}
              className="w-full py-2.5 bg-transparent hover:bg-surface border border-app rounded font-black text-muted2 text-[9px] tracking-widest flex items-center justify-center gap-2 transition-all"
              disabled={isRealOnly}
            >
              <Eye size={14} /> EXIBIR_TODOS
            </button>
            <button
              onClick={() => setShowExport(true)}
              className="w-full py-3 bg-surface border border-app text-app rounded font-black text-[10px] tracking-widest flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg"
            >
              <Navigation size={14} /> EXPORTAR_ESTRATÉGIA
            </button>
          </div>
        </div>

        {/* Explainability */}
        {!isRealOnly && <ExplainabilityCard analysis={analysis} />}
      </div> {/* <-- FECHA o container do painel direito (bug que gerava TSX quebrado) */}

      {showExport && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 pointer-events-auto animate-fade-in font-mono">
          <div className="bg-app w-full max-w-2xl rounded border border-app p-10 relative">
            <button onClick={() => setShowExport(false)} className="absolute top-6 right-6 text-accent hover:text-white transition-colors"><X size={24} /></button>

            {exportStep === 'selection' && (
              <>
                <h2 className="text-2xl font-black text-app mb-2 uppercase tracking-tighter">Exportar Comando</h2>
                <p className="text-muted mb-10 font-bold text-[10px] uppercase">Selecione o protocolo de saída</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <button onClick={handleCopyPasteSelect} className="flex flex-col items-center p-6 bg-surface border border-app hover:border-accent transition group">
                    <Copy className="text-accent mb-4" size={32} />
                    <h3 className="font-bold text-app text-[10px] uppercase">Terminal_Copy</h3>
                  </button>
                  <button className="flex flex-col items-center p-6 bg-surface border border-app opacity-30 cursor-not-allowed">
                    <Facebook className="text-muted2 mb-4" size={32} />
                    <h3 className="font-bold text-muted2 text-[10px] uppercase">Meta_Sync</h3>
                  </button>
                  <button className="flex flex-col items-center p-6 bg-surface border border-app opacity-30 cursor-not-allowed">
                    <Download className="text-muted2 mb-4" size={32} />
                    <h3 className="font-bold text-muted2 text-[10px] uppercase">GeoJSON_Dump</h3>
                  </button>
                </div>
              </>
            )}

            {exportStep === 'loading' && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
                <h3 className="text-xl font-bold text-app uppercase tracking-widest">Processando...</h3>
              </div>
            )}

            {exportStep === 'result' && (
              <div className="text-center">
                <h2 className="text-2xl font-black text-app mb-6 flex items-center justify-center gap-2 uppercase">
                  <Check className="text-ok" /> Estratégia_Pronta
                </h2>
                <button
                  onClick={copyToClipboard}
                  className={`w-full py-4 rounded font-black text-black transition-all flex items-center justify-center gap-2 ${copied ? 'bg-green-500' : 'bg-accent shadow-[0_0_20px_var(--accent)]/30 hover:scale-[1.02]'}`}
                >
                  {copied ? "COPIADO" : "COPIAR"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
