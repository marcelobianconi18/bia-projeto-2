import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet';
import { Target, Users, DollarSign, Zap, Layers, AlertTriangle, CheckCircle2, CheckSquare, Square, Crosshair } from 'lucide-react';
import { BriefingInteligente } from '../types';
import { generateHotspots, HotspotResult } from '../services/hotspotsEngine';
import { calculateAdForecasting, getThermalColor } from '../services/adMath';
import { useTheme } from '../src/hooks/useTheme';

// --- TYPES & STATE MACHINE ---
type MachineState = 'MACRO_COMMAND' | 'RADAR_SCAN' | 'DRILL_DOWN';

interface Props {
   briefingData: BriefingInteligente;
   analysis?: any;
   mapSettings?: any;
   mapCenter?: [number, number];
   onCenterChange?: (center: [number, number]) => void;
   hotspots?: any[];
}

// --- SUB-COMPONENT: FLY TO ANIMATION ---
const MapFlyTo = ({ center, zoom }: { center: [number, number], zoom: number }) => {
   const map = useMap();
   useEffect(() => {
      map.flyTo(center, zoom, { duration: 0.8 }); // 800ms conforme spec
   }, [center, zoom, map]);
   return null;
};

// --- SUB-COMPONENT: THERMAL CIRCLE (The Intelligent Geometry) ---
const ThermalCircle = ({
   spot,
   isSelected,
   isDimmed,
   radius,
   onClick
}: {
   spot: HotspotResult;
   isSelected: boolean;
   isDimmed: boolean;
   radius: number;
   onClick: () => void;
}) => {
   const color = getThermalColor(spot.score || 0);

   return (
      <Circle
         center={[spot.lat, spot.lng]}
         radius={isSelected ? radius : 1200} // 1.2km default ou dinâmico
         pathOptions={{
            color: color,
            fillColor: color,
            fillOpacity: isSelected ? 0.3 : (isDimmed ? 0.1 : 0.2), // Ghosting effect
            weight: isSelected ? 3 : 1,
            className: isDimmed && !isSelected ? 'transition-opacity duration-500 opacity-20' : 'transition-all duration-300'
         }}
         eventHandlers={{ click: onClick }}
      />
   );
};

// --- MAIN CONTROLLER ---
export const MetaCommandCenter: React.FC<Props> = ({ briefingData }) => {
   const { theme } = useTheme();

   // STATE MACHINE
   const [viewState, setViewState] = useState<MachineState>('MACRO_COMMAND');

   // DATA STATES
   const [budget, setBudget] = useState(150); // Default R$ 150
   const [radius, setRadius] = useState(2000); // 2km Default
   const [hotspots, setHotspots] = useState<HotspotResult[]>([]);
   const [selectedSpots, setSelectedSpots] = useState<number[]>([]); // Multiselect IDs
   const [focusedSpotId, setFocusedSpotId] = useState<number | null>(null); // Drill Down Focus

   // DERIVED DATA (Forecasting)
   const activeSpot = hotspots.find(h => h.id === focusedSpotId);

   const totalAudience = useMemo(() => {
      return hotspots
         .filter(h => selectedSpots.includes(h.id))
         .reduce((sum, h) => sum + (h.audience_total || 0), 0);
   }, [selectedSpots, hotspots]);

   const forecast = useMemo(() => {
      // Se Drill Down, foca no spot ativo. Se Radar, foca no total selecionado.
      const pop = viewState === 'DRILL_DOWN' && activeSpot
         ? (activeSpot.audience_total || 50000)
         : (totalAudience || 50000);
      return calculateAdForecasting(budget, 15, pop);
   }, [budget, activeSpot, totalAudience, viewState, selectedSpots]);

   // ACTIONS
   const handleScan = () => {
      setViewState('RADAR_SCAN');
      // Use center from briefing if available, otherwise default SP
      const center: [number, number] = briefingData.geography?.coords ? [briefingData.geography.coords.lat, briefingData.geography.coords.lng] : [-23.5505, -46.6333];
      generateHotspots(briefingData, center, true).then(results => {
         setHotspots(results);
         // Auto-select top 3 by default for immediate value
         setSelectedSpots(results.slice(0, 3).map(h => h.id));
      });
   };

   const handleSpotClick = (id: number) => {
      setFocusedSpotId(id);
      setViewState('DRILL_DOWN');
      setRadius(2000); // Reset radius on new select
   };

   const toggleSelection = (id: number, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setSelectedSpots(prev =>
         prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
   };

   // --- RENDERERS ---

   // 1. HUD (Heads-Up Display)
   const renderHUD = () => (
      <div className="absolute top-4 left-4 right-4 z-[1000] flex gap-4 pointer-events-none">
         {/* Global Score Card */}
         <div className="bg-slate-900/90 backdrop-blur border border-slate-700 p-3 rounded-lg flex items-center gap-3 shadow-xl pointer-events-auto">
            <div className="bg-blue-900/50 p-2 rounded-full">
               <Target className="text-blue-400 w-5 h-5" />
            </div>
            <div>
               <div className="text-[10px] text-slate-400 uppercase tracking-wider">Global Thermal Score</div>
               <div className="text-xl font-black text-white">
                  {hotspots.length > 0 ? '87/100' : '--/--'}
               </div>
            </div>
         </div>

         {/* Budget Controller (Global) */}
         <div className="bg-slate-900/90 backdrop-blur border border-slate-700 p-3 rounded-lg flex-1 flex items-center gap-4 shadow-xl pointer-events-auto">
            <div className="bg-green-900/50 p-2 rounded-full">
               <DollarSign className="text-green-400 w-5 h-5" />
            </div>
            <div className="flex-1">
               <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>ORÇAMENTO DIÁRIO</span>
                  <span className="text-green-400 font-bold">R$ {budget},00</span>
               </div>
               <input
                  type="range"
                  min="50" max="5000" step="50"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
               />
            </div>
         </div>

         {/* Positioning Badge */}
         <div className="bg-slate-900/90 backdrop-blur border border-slate-700 px-4 py-2 rounded-lg flex items-center justify-center shadow-xl pointer-events-auto">
            <span className="text-xs font-bold text-yellow-500 border border-yellow-500/30 px-2 py-1 rounded bg-yellow-500/10">
               PREMIUM CLASS A
            </span>
         </div>
      </div>
   );

   // 2. TACTICAL OVERLAY (State 3 Only)
   const renderTacticalOverlay = () => {
      if (viewState !== 'DRILL_DOWN' || !activeSpot) return null;

      const isRisky = forecast?.risk?.isSaturated;

      return (
         <div className="absolute bottom-8 left-8 z-[1000] w-96 bg-slate-950/95 backdrop-blur border border-slate-600 rounded-xl p-5 shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-300 pointer-events-auto">
            <div className="flex justify-between items-start mb-4">
               <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                     {activeSpot.name}
                     <span className={`text-[10px] px-2 py-0.5 rounded text-black font-black ${getThermalColor(activeSpot.score || 0).replace('#', 'bg-[#')}`}>
                        SCORE {activeSpot.score}
                     </span>
                  </h3>
                  <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                     <Zap className="w-3 h-3 text-yellow-400" />
                     Live Radar: {activeSpot.audience_total?.toLocaleString()} pessoas detectadas
                  </div>
               </div>
               <button onClick={() => setViewState('RADAR_SCAN')} className="text-xs text-slate-500 hover:text-white border px-2 py-1 rounded border-slate-700">
                  VOLTAR AO RADAR
               </button>
            </div>

            {/* Feature 1: Radius Slider */}
            <div className="mb-6">
               <div className="flex justify-between text-xs font-semibold text-slate-300 mb-2">
                  <span>RAIO TÁTICO (The Expander)</span>
                  <span>{(radius / 1000).toFixed(1)} km</span>
               </div>
               <input
                  type="range"
                  min="100" max="10000" step="100"
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${isRisky ? 'bg-red-900 accent-red-500' : 'bg-blue-900 accent-blue-500'}`}
               />
            </div>

            {/* Feature 2: Forecasting Logic */}
            <div className={`p-3 rounded border ${isRisky ? 'bg-red-900/20 border-red-500/50' : 'bg-slate-800 border-slate-700'}`}>
               <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-400">Alcance Estimado (Dia)</span>
                  <span className="text-sm font-bold text-white">{forecast.estimatedReach.toLocaleString(undefined, { maximumFractionDigits: 0 })} pessoas</span>
               </div>

               {/* Saturation Alert */}
               <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-700/50">
                  {isRisky ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  <span className={`text-[10px] font-bold ${isRisky ? 'text-red-400' : 'text-green-400'}`}>
                     {forecast.risk.message}
                  </span>
               </div>
            </div>

            {/* Feature 3: Actions */}
            <div className="mt-4 grid grid-cols-2 gap-2">
               <button className="bg-red-900/10 hover:bg-red-900/30 text-red-400 text-xs py-3 rounded border border-red-900/30 font-bold transition-all">
                  EXCLUIR SETOR
               </button>
               <button
                  onClick={() => {
                     if (focusedSpotId && !selectedSpots.includes(focusedSpotId)) toggleSelection(focusedSpotId);
                     setViewState('RADAR_SCAN');
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs py-3 rounded font-bold shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all">
                  <CheckSquare size={14} /> ADICIONAR
               </button>
            </div>
         </div>
      );
   };

   // 3. CTA START SCAN (State 1 Only)
   const renderStartButton = () => {
      if (viewState !== 'MACRO_COMMAND') return null;
      return (
         <div className="absolute inset-0 z-[900] flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-auto">
            <button
               onClick={handleScan}
               className="group relative flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-full text-xl font-black tracking-widest shadow-2xl shadow-blue-500/30 transition-all transform hover:scale-105"
            >
               <div className="absolute inset-0 rounded-full border border-white/20 animate-ping"></div>
               <Zap className="w-6 h-6 fill-current" />
               INICIAR VARREDURA TÁTICA
            </button>
         </div>
      );
   };

   // --- MAP CONFIG ---
   const mapCenter: [number, number] = activeSpot
      ? [activeSpot.lat, activeSpot.lng]
      : (briefingData.geography?.coords ? [briefingData.geography.coords.lat, briefingData.geography.coords.lng] : [-23.5505, -46.6333]);

   const mapZoom = viewState === 'DRILL_DOWN' ? 14 : (viewState === 'RADAR_SCAN' ? 12 : 11);

   return (
      <div className="relative w-full h-[85vh] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex flex-col shadow-2xl">
         {/* 1. LAYER: HUD */}
         {renderHUD()}

         {/* 2. LAYER: MAP ENGINE */}
         <div className="flex-1 relative z-0">
            <MapContainer
               center={[-23.5505, -46.6333]}
               zoom={11}
               style={{ height: '100%', width: '100%', background: '#0f172a' }}
               zoomControl={false}
            >
               <TileLayer
                  url={theme === 'dark'
                     ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                     : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  }
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
               />

               <MapFlyTo center={mapCenter} zoom={mapZoom} />

               {/* RENDER HOTSPOTS */}
               {hotspots.map((spot) => (
                  <ThermalCircle
                     key={spot.id}
                     spot={spot}
                     isSelected={spot.id === focusedSpotId}
                     isDimmed={Boolean(focusedSpotId && spot.id !== focusedSpotId)}
                     radius={radius}
                     onClick={() => handleSpotClick(spot.id)}
                  />
               ))}
            </MapContainer>

            {/* 3. LAYER: INTERFACES */}
            {renderStartButton()}
            {renderTacticalOverlay()}
         </div>

         {/* 4. LAYER: SIDEBAR LIST (Scan Only - RICH VERSION) */}
         {viewState === 'RADAR_SCAN' && (
            <div className="absolute top-24 right-4 z-[1000] w-80 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-xl overflow-hidden flex flex-col max-h-[600px] pointer-events-auto shadow-2xl animate-in slide-in-from-right-10 fade-in duration-500">
               <div className="p-4 bg-slate-950 border-b border-slate-700 flex justify-between items-center">
                  <div>
                     <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mb-1">ALVOS DETECTADOS</span>
                     <span className="text-xl font-black text-white flex items-center gap-2">
                        {selectedSpots.length} <span className="text-sm text-slate-500 font-normal">/ {hotspots.length}</span>
                     </span>
                  </div>
                  <div className="bg-blue-900/20 p-2 rounded-lg border border-blue-500/20">
                     <Layers className="w-5 h-5 text-blue-400" />
                  </div>
               </div>

               {/* Scrollable List */}
               <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar bg-slate-900/50">
                  {hotspots.map(spot => {
                     const isSelected = selectedSpots.includes(spot.id);
                     return (
                        <div
                           key={spot.id}
                           className={`group flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${isSelected ? 'bg-blue-900/20 border-blue-500/40' : 'bg-transparent border-transparent hover:bg-slate-800 hover:border-slate-700'}`}
                           onClick={() => handleSpotClick(spot.id)}
                        >
                           <div className="flex items-center gap-3">
                              <button
                                 onClick={(e) => toggleSelection(spot.id, e)}
                                 className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-500 border border-slate-600 hover:border-slate-400'}`}
                              >
                                 {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                              </button>
                              <div>
                                 <span className={`text-xs font-bold block ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>{spot.name}</span>
                                 <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${getThermalColor(spot.score || 0).replace('#', 'bg-[#')}`} />
                                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">{spot.type || 'HOTSPOT'}</span>
                                 </div>
                              </div>
                           </div>
                           <span className={`text-xs font-black ${isSelected ? 'text-blue-400' : 'text-slate-600'}`}>{spot.score}</span>
                        </div>
                     );
                  })}
               </div>

               {/* Aggregation Footer */}
               <div className="p-4 bg-slate-950 border-t border-slate-700">
                  <div className="flex justify-between items-center mb-3 text-xs text-slate-400">
                     <span>ALCANCE COMBINADO</span>
                     <span className="font-mono text-white font-bold">{totalAudience.toLocaleString()}</span>
                  </div>
                  <button className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-black text-xs uppercase tracking-widest shadow-lg shadow-green-900/20 transition-all transform active:scale-95 flex items-center justify-center gap-2">
                     <Crosshair size={16} /> CONFIRMAR SELEÇÃO
                  </button>
               </div>
            </div>
         )}

      </div>
   );
};
