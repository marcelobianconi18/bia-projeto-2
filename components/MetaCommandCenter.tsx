import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet';
import { Target, Layers, Map as MapIcon, Zap, Share2, AlertTriangle, X, Crosshair, TrendingUp, Copy, Check, Loader2 } from 'lucide-react';
import { BriefingInteligente } from '../types';
import { TARGETING_DNA, TargetingLayer } from '../services/targetingDNA';
import { MetaSyncService } from '../services/MetaSyncService';

// --- SERVICE: FORECASTING ENGINE (SIMULATION) ---
const calculateForecast = (budget: number) => {
   // Premissas: CPM R$ 25,00, CTR 1.2%, Conv. Rate 3%
   const cpm = 25;
   const impressions = (budget / cpm) * 1000;
   const reach = Math.floor(impressions * 0.85); // Frequência 1.2
   const clicks = Math.floor(impressions * 0.012);
   const leadsMin = Math.floor(clicks * 0.02);
   const leadsMax = Math.floor(clicks * 0.05);

   return {
      reach: reach.toLocaleString('pt-BR'),
      leads: `${leadsMin}-${leadsMax}/dia`
   };
};

// --- TYPES & INTERFACES ---
type ViewMode = 'MACRO' | 'RADAR' | 'FOCUSED';

interface Hotspot {
   id: string;
   name: string;
   score: number;
   coords: [number, number];
   radius: number;
   type?: string;
}

// --- MOCK DATA ---
const HOTSPOTS_MOCK: Hotspot[] = [
   { id: '1', name: 'Centro Financeiro', score: 96, coords: [-23.5505, -46.6333], radius: 1200, type: 'CORPORATE' },
   { id: '2', name: 'Jardins Class A', score: 92, coords: [-23.5655, -46.6733], radius: 1000, type: 'RESIDENTIAL' },
   { id: '3', name: 'Vila Olímpia Tech', score: 88, coords: [-23.5955, -46.6833], radius: 800, type: 'TECH HUB' },
   { id: '4', name: 'Itaim Bibi Prime', score: 85, coords: [-23.5840, -46.6790], radius: 900, type: 'MIXED USE' },
   { id: '5', name: 'Pinheiros Lifestyle', score: 79, coords: [-23.5615, -46.7020], radius: 1100, type: 'CULTURAL' },
];

const MapController = ({ center, zoom }: { center: [number, number], zoom: number }) => {
   const map = useMap();
   useEffect(() => {
      map.flyTo(center, zoom, { duration: 1.2, easeLinearity: 0.25 });
   }, [center, zoom, map]);
   return null;
};

// --- COMPONENT: THERMAL CIRCLE (REACTIVE) ---
interface ThermalCircleProps {
   spot: Hotspot;
   isSelected: boolean;
   isDimmed: boolean;
   dynamicRadius?: number; // Em metros
   onClick: () => void;
}

const ThermalCircle = ({ spot, isSelected, isDimmed, dynamicRadius, onClick }: ThermalCircleProps) => {
   // Lógica Reativa de Cor: Se o raio aumentar muito (> 3km), a densidade cai e o score "simulado" diminui
   const effectiveRadius = isSelected && dynamicRadius ? dynamicRadius : spot.radius;
   const densityPenalty = effectiveRadius > 3500 ? 20 : effectiveRadius > 2500 ? 10 : 0;
   const effectiveScore = spot.score - densityPenalty;

   const getColor = (s: number) => {
      if (isDimmed) return '#94a3b8'; // Slate-400 (Cinza Morto) para alvos não focados
      if (s >= 90) return '#dc2626'; // Red-600 (High Heat)
      if (s >= 75) return '#ea580c'; // Orange-600 (Medium Heat)
      return '#2563eb'; // Blue-600 (Low Heat)
   };

   const color = getColor(effectiveScore);

   return (
      <Circle
         center={spot.coords}
         radius={effectiveRadius}
         pathOptions={{
            color: isSelected ? '#0f172a' : color,
            fillColor: color,
            fillOpacity: isDimmed ? 0.1 : (isSelected ? 0.25 : 0.2), // Dimmed fica super transparente
            weight: isSelected ? 2 : (isDimmed ? 1 : 2),
            className: isSelected ? 'animate-pulse' : ''
         }}
         eventHandlers={{ click: onClick }}
      />
   );
};

interface Props {
   briefingData: BriefingInteligente;
   analysis?: any;
   mapSettings?: any;
   mapCenter?: [number, number];
   onCenterChange?: (center: [number, number]) => void;
   hotspots?: any[];
}

export const MetaCommandCenter: React.FC<Props> = ({ briefingData }) => {
   // FSM State
   const [viewMode, setViewMode] = useState<ViewMode>('RADAR');
   const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
   const [selectedStackIds, setSelectedStackIds] = useState<string[]>(['1', '2', '3']);

   // Zone A Controls (Dynamic)
   const [budget, setBudget] = useState(1500);
   const forecast = useMemo(() => calculateForecast(budget), [budget]);

   // Zone C Controls (Targeting DNA)
   const [activeTab, setActiveTab] = useState<TargetingLayer>('SNIPER');

   // Zone D Controls (Drill-Down Reactive)
   const [drillRadius, setDrillRadius] = useState(2.5); // km
   const [realTerritory, setRealTerritory] = useState<any>(null);
   const [isFetchingTerritory, setIsFetchingTerritory] = useState(false);

   // EFFECT: Fetch Real Territory Data (Debounced)
   useEffect(() => {
      if (viewMode !== 'FOCUSED' || !selectedHotspotId) return;
      const spot = HOTSPOTS_MOCK.find(h => h.id === selectedHotspotId);
      if (!spot) return;

      const timer = setTimeout(async () => {
         setIsFetchingTerritory(true);
         try {
            const res = await fetch('/api/intelligence/territory', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                  lat: spot.coords[0],
                  lng: spot.coords[1],
                  radiusMeters: Math.floor(drillRadius * 1000)
               })
            });
            const json = await res.json();
            if (json.status === 'REAL') {
               setRealTerritory(json.data);
            } else {
               setRealTerritory(null); // Clear if not real data
            }
         } catch (e) {
            console.error("Territory Fetch Failed", e);
            setRealTerritory(null);
         } finally {
            setIsFetchingTerritory(false);
         }
      }, 600);

      return () => clearTimeout(timer);
   }, [drillRadius, selectedHotspotId, viewMode]);

   // Sync Logic
   const [isSyncing, setIsSyncing] = useState(false);

   // Helpers
   const activeSpot = HOTSPOTS_MOCK.find(h => h.id === selectedHotspotId);
   const mapCenter: [number, number] = activeSpot ? activeSpot.coords : [-23.57, -46.66];
   const mapZoom = activeSpot ? 14 : 12;

   // HANDLERS
   const handleHotspotClick = (id: string) => {
      if (selectedHotspotId === id && viewMode === 'FOCUSED') {
         handleCloseOverlay();
      } else {
         setViewMode('FOCUSED');
         setSelectedHotspotId(id);
         // Reset radius to spot's original or default
         const spot = HOTSPOTS_MOCK.find(s => s.id === id);
         setDrillRadius(spot ? spot.radius / 1000 : 2.5);
      }
   };

   const handleCloseOverlay = () => {
      setViewMode('RADAR');
      setSelectedHotspotId(null);
      setRealTerritory(null); // Clear territory data on close
   };

   const toggleStack = (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setSelectedStackIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
   };

   const handleCopyStack = () => {
      const codes = TARGETING_DNA[activeTab].map(n => n.apiCode).filter(Boolean).join(',');
      navigator.clipboard.writeText(codes);
      alert(`✅ STACK ${activeTab} COPIADA:\n\n${codes}`);
   };

   const handleCopySingle = (code?: string) => {
      if (code) {
         navigator.clipboard.writeText(code);
         alert(`✅ ID Copiado: ${code}`);
      }
   };

   const handleSyncClick = async () => {
      if (isSyncing) return;
      setIsSyncing(true);

      try {
         const activeHotspots = HOTSPOTS_MOCK.filter(h => selectedStackIds.includes(h.id));
         if (activeHotspots.length === 0) {
            alert("⚠️ SELECIONE PELO MENOS UM HOTSPOT NO RANKING (ZONA C)");
            setIsSyncing(false);
            return;
         }
         const payload = MetaSyncService.buildPayload(budget, activeHotspots, activeTab, drillRadius);
         const response = await MetaSyncService.executeSync(payload);
         alert(`✅ SUCESSO!\nID: ${response.campaign_id}\n${response.message}`);
      } catch (error) {
         alert("❌ FALHA NA SINCRONIZAÇÃO");
         console.error(error);
      } finally {
         setIsSyncing(false);
      }
   };

   return (
      // ROOT: FULL LIGHT MODE
      <div className="flex flex-col h-full w-full bg-white text-slate-900 overflow-hidden font-sans border border-slate-200 rounded-xl shadow-2xl" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>

         {/* --- [A] HUD DINÂMICO --- */}
         <header
            className="h-20 border-b border-slate-200 flex items-center px-6 justify-between shrink-0 relative z-[1001]"
            style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
         >
            <div className="flex items-center gap-4 min-w-[200px]">
               <div className="relative w-14 h-14 flex items-center justify-center">
                  {/* Gauge Estático (poderia ser dinâmico também, mas foco no slider) */}
                  <svg className="transform -rotate-90 w-12 h-12">
                     <circle cx="24" cy="24" r="20" stroke="#f1f5f9" strokeWidth="4" fill="transparent" />
                     <circle cx="24" cy="24" r="20" stroke="#059669" strokeWidth="4" fill="transparent" strokeDasharray="125" strokeDashoffset="20" strokeLinecap="round" />
                  </svg>
                  <span className="absolute text-sm font-bold text-emerald-700">87</span>
               </div>
               <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Global Thermal Score</div>
                  <div className="text-emerald-700 font-bold text-lg flex items-center gap-1">
                     Excellent <TrendingUp className="w-4 h-4" />
                  </div>
               </div>
            </div>

            {/* CONTROLE DE ORÇAMENTO REATIVO */}
            <div className="flex-1 px-12 flex flex-col justify-center border-l border-r border-slate-100 mx-6 h-full">
               <div className="flex justify-between mb-2 items-end">
                  <span className="text-xs text-slate-800 font-bold tracking-wider">ORÇAMENTO DIÁRIO</span>
                  <span className="text-xl font-mono font-bold text-blue-700 bg-blue-50 px-2 rounded">R$ {budget.toFixed(2)}</span>
               </div>
               <input
                  type="range" min="50" max="5000" step="50" value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-500 active:accent-blue-700 transition-all"
               />
               <div className="flex justify-between mt-1 text-[10px] text-slate-600 font-bold font-mono">
                  <span className="flex gap-1 items-center"><Share2 size={10} /> Alcance Est: {forecast.reach}</span>
                  <span className="flex gap-1 items-center"><Target size={10} /> Leads Est: {forecast.leads}</span>
               </div>
            </div>

            <div className="flex justify-end items-center gap-3 min-w-[200px]">
               <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Market Positioning</div>
                  <div className="font-bold text-slate-800 text-sm">Premium - Classe A</div>
               </div>
               <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 shadow-sm">
                  <Target className="text-blue-600 w-6 h-6" />
               </div>
            </div>
         </header>

         {/* --- MAIN GRID LAYOUT --- */}
         <main className="flex-1 flex overflow-hidden relative">

            {/* --- [B] GEOSPATIAL ENGINE (Reactive) --- */}
            <div className="flex-1 relative group" style={{ backgroundColor: '#f8fafc' }}>
               <MapContainer
                  center={[-23.57, -46.66]} zoom={12}
                  style={{ height: '100%', width: '100%', background: '#f8fafc' }}
                  zoomControl={false}
               >
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />
                  <MapController center={mapCenter} zoom={mapZoom} />

                  {/* RENDERIZAÇÃO REATIVA DOS CÍRCULOS */}
                  {HOTSPOTS_MOCK.map((spot) => (
                     <ThermalCircle
                        key={spot.id}
                        spot={spot}
                        isSelected={selectedHotspotId === spot.id}
                        isDimmed={viewMode === 'FOCUSED' && selectedHotspotId !== spot.id} // Dimming Logic
                        dynamicRadius={selectedHotspotId === spot.id ? drillRadius * 1000 : undefined} // Link com Slider
                        onClick={() => handleHotspotClick(spot.id)}
                     />
                  ))}
               </MapContainer>

               {/* LABEL Overlay */}
               <div
                  className="absolute top-4 left-4 z-[400] px-3 py-1 bg-white/90 backdrop-blur rounded border border-slate-300 shadow-sm"
                  style={{ backgroundColor: 'rgba(255,255,255,0.9)' }}
               >
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                     <div className={`w-2 h-2 rounded-full ${viewMode === 'FOCUSED' ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                     GEOSPATIAL ENGINE {viewMode === 'FOCUSED' ? '(TACTICAL MODE)' : '(RADAR MODE)'}
                  </span>
               </div>

               {/* --- [D] DRILL-DOWN OVERLAY (Fully Interactive) --- */}
               {viewMode === 'FOCUSED' && activeSpot && (
                  <div
                     className="absolute bottom-6 right-6 w-80 rounded-xl p-5 shadow-2xl z-[1000] transition-all duration-300"
                     style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a' }}
                  >
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                           <Crosshair className="w-4 h-4 text-red-600 animate-pulse" />
                           TACTICAL OVERLAY
                        </h3>
                        <div className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 font-bold">
                           {drillRadius.toFixed(1)}KM
                        </div>
                     </div>

                     {/* CONTROLE DE RAIO VINCULADO AO MAPA */}
                     <div className="mb-5">
                        <div className="flex justify-between text-xs mb-2 font-bold">
                           <span className="text-slate-600">Expansion Radius</span>
                           <span className={`${drillRadius > 3 ? 'text-orange-500' : 'text-blue-700'} font-mono transition-colors`}>
                              {drillRadius} km
                           </span>
                        </div>
                        <input type="range" min="0.5" max="5" step="0.1"
                           value={drillRadius} onChange={(e) => setDrillRadius(Number(e.target.value))}
                           className="w-full h-2 bg-slate-100 accent-blue-600 appearance-none rounded-lg cursor-pointer border border-slate-200"
                        />
                        {drillRadius > 3.5 && (
                           <div className="mt-1 text-[9px] text-orange-600 font-bold flex items-center gap-1">
                              <AlertTriangle size={10} /> Densidade Diluída (High Reach / Low Precision)
                           </div>
                        )}
                     </div>

                     <div className="bg-slate-50 rounded-lg p-3 mb-4 border border-blue-200 relative overflow-hidden shadow-inner">
                        <div className="absolute -right-2 -top-2 w-10 h-10 bg-blue-100/50 rounded-full blur-xl"></div>
                        <div className="flex items-center gap-3 relative z-10 w-full">
                           <div className={`flex justify-center items-center w-8 h-8 rounded-full border transition-colors ${isFetchingTerritory ? 'bg-amber-100 border-amber-200' : 'bg-blue-100 border-blue-200'}`}>
                              {isFetchingTerritory ? <Loader2 className="w-4 h-4 text-amber-600 animate-spin" /> : <Zap className="w-4 h-4 text-blue-600" />}
                           </div>
                           <div className="flex-1">
                              <div className="flex items-center justify-between mb-0.5">
                                 <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">
                                    {isFetchingTerritory ? 'SCANNING...' : 'IBGE REAL DATA'}
                                 </span>
                                 {!isFetchingTerritory && (
                                    <span className="relative flex h-2 w-2">
                                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                       <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                 )}
                              </div>
                              <div className="flex justify-between items-baseline">
                                 <span className="text-sm font-bold text-slate-800">
                                    {realTerritory ? realTerritory.population.toLocaleString() : Math.floor(4250 * (drillRadius * 0.8)).toLocaleString()} hab
                                 </span>
                                 {realTerritory && (
                                    <span className="text-[10px] font-mono text-slate-500 font-bold">R$ {realTerritory.averageIncome.toLocaleString()}</span>
                                 )}
                              </div>
                           </div>
                        </div>
                     </div>
                     <div className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer" onClick={handleCloseOverlay}>
                        <span className="text-xs text-slate-600 font-bold">Exit Tactical Mode</span>
                        <X size={16} className="text-slate-400 hover:text-red-500" />
                     </div>
                  </div>
               )}
            </div>

            {/* --- [C] INTEL SIDEBAR --- */}
            <aside
               className="w-80 border-l border-slate-200 flex flex-col z-[1002] shadow-[0_0_20px_rgba(0,0,0,0.05)] relative"
               style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
            >
               <div className="absolute -left-3 top-4 bg-white border border-slate-200 text-[10px] text-amber-600 px-1 rounded font-bold shadow-sm">C</div>

               {/* Tabs System */}
               <div className="flex border-b border-slate-200 bg-slate-50">
                  {(['SNIPER', 'CONTEXTUAL', 'EXPANSIVE'] as TargetingLayer[]).map((tab) => (
                     <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-3 text-[10px] font-bold tracking-wider transition-colors ${activeTab === tab ? 'text-blue-700 border-b-2 border-blue-600 bg-white shadow-[0_-2px_5px_rgba(0,0,0,0.02)]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                     >
                        {tab}
                     </button>
                  ))}
               </div>

               <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar" style={{ backgroundColor: '#ffffff' }}>

                  {/* TARGETING DNA */}
                  <div className="space-y-1">
                     <div className="flex justify-between items-center text-[10px] text-slate-400 mb-2 px-2 uppercase tracking-wider font-bold border-b border-slate-100 pb-1">
                        <span>Interests ({TARGETING_DNA[activeTab].length})</span>
                        <span>Match</span>
                     </div>

                     {TARGETING_DNA[activeTab].map((node) => {
                        const scoreColor = node.matchScore >= 90 ? 'text-emerald-700'
                           : node.matchScore >= 70 ? 'text-amber-600'
                              : 'text-slate-400';
                        return (
                           <div key={node.id} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded group transition-all border border-transparent hover:border-slate-200">
                              <div>
                                 <div className="text-xs font-bold text-slate-700 group-hover:text-blue-700">{node.name}</div>
                                 <div className="text-[9px] text-slate-400 font-medium">{node.category} • {node.audienceSizeEst}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                 <span className={`text-xs font-mono font-black ${scoreColor}`}>
                                    {node.matchScore}
                                 </span>
                                 {node.apiCode && (
                                    <button
                                       onClick={() => handleCopySingle(node.apiCode)}
                                       className="p-1 hover:bg-blue-50 rounded text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                       title="Copy ID"
                                    >
                                       <Copy size={12} />
                                    </button>
                                 )}
                              </div>
                           </div>
                        );
                     })}
                  </div>

                  {/* Copy Stack Button */}
                  <button
                     onClick={handleCopyStack}
                     className="w-full py-2 bg-white hover:bg-blue-50 border border-slate-300 hover:border-blue-400 text-xs text-slate-600 hover:text-blue-700 rounded flex items-center justify-center gap-2 transition-all group shadow-sm font-bold"
                  >
                     <Layers size={14} className="text-slate-400 group-hover:text-blue-600" />
                     <span>COPY STACK ({activeTab})</span>
                  </button>

                  {/* Hotspot Ranking */}
                  <div className="pt-4 border-t border-slate-100">
                     <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-3 flex justify-between tracking-widest">
                        Hotspot Ranking
                        <span className="text-blue-600 cursor-pointer hover:underline normal-case">Select All</span>
                     </h4>
                     <div className="space-y-1">
                        {HOTSPOTS_MOCK.map((spot, i) => {
                           const isSelected = selectedStackIds.includes(spot.id);
                           return (
                              <div
                                 key={spot.id}
                                 onClick={() => handleHotspotClick(spot.id)}
                                 className={`flex items-center gap-3 p-2 rounded transition-all cursor-pointer group ${selectedHotspotId === spot.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'}`}
                              >
                                 <div
                                    onClick={(e) => toggleStack(spot.id, e)}
                                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}
                                 >
                                    {isSelected && <div className="w-2 h-2 bg-white rounded-sm" />}
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <div className={`text-xs font-bold truncate ${isSelected ? 'text-blue-800' : 'text-slate-600'}`}>{i + 1}. {spot.name}</div>
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full mt-1.5 overflow-hidden border border-slate-100">
                                       <div className={`h-full ${spot.score > 90 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${spot.score}%` }}></div>
                                    </div>
                                 </div>
                                 <span className="text-xs font-mono font-bold text-slate-400">{spot.score}</span>
                              </div>
                           )
                        })}
                     </div>
                  </div>

                  {/* Smart Schedule */}
                  <div className="pt-4 border-t border-slate-100">
                     <div className="flex justify-between items-center mb-2">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Smart Schedule</h4>
                        <span className="text-[9px] text-emerald-600 font-mono font-bold animate-pulse">LIVE</span>
                     </div>
                     <div className="grid grid-cols-7 gap-0.5 h-16 opacity-100">
                        {Array.from({ length: 7 * 4 }).map((_, i) => (
                           <div key={i} className={`rounded-[1px] border-[0.5px] border-white ${Math.random() > 0.7 ? 'bg-emerald-400' : Math.random() > 0.4 ? 'bg-emerald-100' : 'bg-slate-100'}`}></div>
                        ))}
                     </div>
                  </div>
               </div>
            </aside>

         </main>

         {/* --- [E] ACTION DECK --- */}
         <footer
            className="h-14 border-t border-slate-200 flex items-center justify-between px-6 shrink-0 z-[1001] relative shadow-[0_-4px_6px_rgba(0,0,0,0.02)]"
            style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
         >
            <div className="absolute top-0 right-1/2 -mt-2 bg-white text-[9px] text-slate-400 px-2 rounded-b border-b border-l border-r border-slate-200 font-bold shadow-sm">ACTION DECK <span className="text-amber-600 font-black ml-1">E</span></div>

            <div className="text-[10px] text-slate-500 flex items-center gap-2 font-mono font-bold">
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
               SYSTEMS ONLINE. SYNC ENGINE LINKED.
            </div>
            <div className="flex gap-3">
               <button
                  onClick={handleSyncClick}
                  disabled={isSyncing}
                  className={`px-6 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all hover:scale-105 uppercase tracking-wider ${isSyncing ? 'opacity-75 cursor-wait' : ''}`}
               >
                  {isSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Share2 className="w-3 h-3" />}
                  {isSyncing ? 'SYNCING...' : 'SYNC META ADS (Primary)'}
               </button>
            </div>
         </footer>

      </div>
   );
}
