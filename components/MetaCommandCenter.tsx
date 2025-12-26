import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet';
import { Target, Layers, TrendingUp, Share2, AlertTriangle, X, Crosshair, Copy, Zap, Loader2 } from 'lucide-react';
import { BriefingInteligente } from '../types';
import { TARGETING_DNA, TargetingLayer } from '../services/targetingDNA';
import { MetaSyncService } from '../services/MetaSyncService';

// --- SERVICE: FORECASTING ENGINE ---
const calculateForecast = (budget: number) => {
   const cpm = 25;
   const impressions = (budget / cpm) * 1000;
   const reach = Math.floor(impressions * 0.85);
   const clicks = Math.floor(impressions * 0.012);
   const leadsMin = Math.floor(clicks * 0.02);
   const leadsMax = Math.floor(clicks * 0.05);
   return { reach: reach.toLocaleString('pt-BR'), leads: `${leadsMin}-${leadsMax}/dia` };
};

type ViewMode = 'MACRO' | 'RADAR' | 'FOCUSED';

// MOCK DATA (Hardcoded Safety Net)
const HOTSPOTS_MOCK = [
   { id: '1', name: 'Centro Financeiro', score: 96, coords: [-23.5505, -46.6333] as [number, number], radius: 1200 },
   { id: '2', name: 'Jardins Class A', score: 92, coords: [-23.5655, -46.6733] as [number, number], radius: 1000 },
   { id: '3', name: 'Vila Olímpia Tech', score: 88, coords: [-23.5955, -46.6833] as [number, number], radius: 800 },
   { id: '4', name: 'Itaim Bibi Prime', score: 85, coords: [-23.5840, -46.6790] as [number, number], radius: 900 },
   { id: '5', name: 'Pinheiros Lifestyle', score: 79, coords: [-23.5615, -46.7020] as [number, number], radius: 1100 },
];

// Map Controller (Smooth Zoom)
const MapController = ({ center, zoom }: { center: [number, number], zoom: number }) => {
   const map = useMap();
   useEffect(() => {
      map.flyTo(center, zoom, { duration: 1.2 });
   }, [center, zoom, map]); // Static deps only
   return null;
};

// Thermal Circle (Safety Guarded)
const ThermalCircle = ({ spot, isSelected, isDimmed, dynamicRadius, onClick }: any) => {
   // GUARDA DE SEGURANÇA: Nunca permitir NaN ou undefined no Leaflet
   const baseRadius = Number(spot.radius) || 1000;
   const dynRadius = Number(dynamicRadius);

   // Se estiver selecionado e o raio dinâmico for válido, use-o. Senão, use o base.
   const effectiveRadius = (isSelected && !isNaN(dynRadius) && dynRadius > 0) ? dynRadius : baseRadius;

   // Lógica de Cor
   const densityPenalty = effectiveRadius > 3500 ? 20 : effectiveRadius > 2500 ? 10 : 0;
   const effectiveScore = (spot.score || 50) - densityPenalty;

   const getColor = (s: number) => {
      if (isDimmed) return '#94a3b8';
      if (s >= 90) return '#dc2626';
      if (s >= 75) return '#ea580c';
      return '#2563eb';
   };
   const color = getColor(effectiveScore);

   return (
      <Circle
         center={spot.coords}
         radius={effectiveRadius}
         pathOptions={{
            color: isSelected ? '#0f172a' : color,
            fillColor: color,
            fillOpacity: isDimmed ? 0.1 : (isSelected ? 0.25 : 0.2),
            weight: isSelected ? 2 : 1
         }}
         eventHandlers={{ click: onClick }}
      />
   );
};

interface Props { briefingData: BriefingInteligente; }

export const MetaCommandCenter: React.FC<Props> = ({ briefingData }) => {
   const [viewMode, setViewMode] = useState<ViewMode>('RADAR');
   const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
   const [selectedStackIds, setSelectedStackIds] = useState<string[]>(['1', '2', '3']);
   const [budget, setBudget] = useState(1500);
   const [activeTab, setActiveTab] = useState<TargetingLayer>('SNIPER');
   const [drillRadius, setDrillRadius] = useState(2.5); // km
   const [realTerritory, setRealTerritory] = useState<any>(null);
   const [isFetchingTerritory, setIsFetchingTerritory] = useState(false);
   const [isSyncing, setIsSyncing] = useState(false);

   const forecast = useMemo(() => calculateForecast(budget), [budget]);
   const activeSpot = HOTSPOTS_MOCK.find(h => h.id === selectedHotspotId);
   const mapCenter: [number, number] = activeSpot ? activeSpot.coords : [-23.57, -46.66];
   const mapZoom = activeSpot ? 14 : 12;

   // --- CORREÇÃO DO CRASH: DEPENDENCY ARRAY ---
   // Este useEffect disparava o erro "changed size" se HOTSPOTS mudassem. 
   // Removemos dependências instáveis.
   useEffect(() => {
      if (viewMode !== 'FOCUSED' || !selectedHotspotId) return;

      const spot = HOTSPOTS_MOCK.find(h => h.id === selectedHotspotId);
      if (!spot) return;

      const timer = setTimeout(async () => {
         setIsFetchingTerritory(true);
         try {
            // Chama o backend real
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
            if (json.status === 'REAL') setRealTerritory(json.data);
            else setRealTerritory(null);
         } catch (e) {
            console.warn("Territory API unavailable (using fallback logic)", e);
            setRealTerritory(null);
         } finally {
            setIsFetchingTerritory(false);
         }
      }, 600);

      return () => clearTimeout(timer);
   }, [drillRadius, selectedHotspotId, viewMode]);
   // ^ ATENÇÃO: NÃO adicione arrays ou objetos complexos aqui.

   // Handlers
   const handleHotspotClick = (id: string) => {
      if (selectedHotspotId === id && viewMode === 'FOCUSED') {
         setViewMode('RADAR');
         setSelectedHotspotId(null);
      } else {
         setViewMode('FOCUSED');
         setSelectedHotspotId(id);
         const spot = HOTSPOTS_MOCK.find(s => s.id === id);
         setDrillRadius(spot ? spot.radius / 1000 : 2.5);
      }
   };

   const handleSyncClick = async () => {
      if (isSyncing) return;
      setIsSyncing(true);
      try {
         const activeHotspots = HOTSPOTS_MOCK.filter(h => selectedStackIds.includes(h.id));
         const payload = MetaSyncService.buildPayload(budget, activeHotspots, activeTab, drillRadius);
         const response = await MetaSyncService.executeSync(payload);
         alert(`✅ SUCESSO!\nID: ${response.campaign_id}\n${response.message}`);
      } catch (error: any) {
         alert(`❌ FALHA: ${error.message || 'Erro de Conexão'}`);
      } finally {
         setIsSyncing(false);
      }
   };

   return (
      <div className="flex flex-col h-full w-full bg-white text-slate-900 border border-slate-200 rounded-xl shadow-2xl overflow-hidden">

         {/* [A] HUD */}
         <header className="h-16 border-b border-slate-100 flex items-center px-4 justify-between bg-white shrink-0 z-50">
            <div className="flex items-center gap-3">
               <div className="text-emerald-600 font-bold text-lg flex gap-1 items-center">
                  <TrendingUp size={20} /> Score 87
               </div>
               <div className="h-6 w-[1px] bg-slate-200 mx-2"></div>
               <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Budget (Daily)</div>
                  <div className="font-mono font-bold text-blue-600">R$ {budget.toFixed(2)}</div>
               </div>
            </div>

            <div className="flex-1 max-w-md mx-4">
               <input
                  type="range" min="50" max="5000" step="50"
                  value={budget} onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
               />
               <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-1">
                  <span>Alcance: {forecast.reach}</span>
                  <span>Leads: {forecast.leads}</span>
               </div>
            </div>

            <div className="text-right">
               <div className="text-[10px] text-slate-400 uppercase font-bold">Class</div>
               <div className="text-xs font-bold text-slate-700">Premium A</div>
            </div>
         </header>

         {/* MAIN AREA */}
         <div className="flex-1 flex relative overflow-hidden">

            {/* [B] MAP */}
            <div className="flex-1 relative bg-slate-50">
               <MapContainer center={[-23.57, -46.66]} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                  <MapController center={mapCenter} zoom={mapZoom} />
                  {HOTSPOTS_MOCK.map((spot) => (
                     <ThermalCircle
                        key={spot.id}
                        spot={spot}
                        isSelected={selectedHotspotId === spot.id}
                        isDimmed={viewMode === 'FOCUSED' && selectedHotspotId !== spot.id}
                        dynamicRadius={selectedHotspotId === spot.id ? drillRadius * 1000 : undefined}
                        onClick={() => handleHotspotClick(spot.id)}
                     />
                  ))}
               </MapContainer>

               {/* [D] DRILL DOWN OVERLAY */}
               {viewMode === 'FOCUSED' && (
                  <div className="absolute bottom-6 right-6 w-72 bg-white/95 backdrop-blur rounded-xl shadow-2xl border border-slate-200 p-4 z-[1000] animate-in slide-in-from-bottom-4">
                     <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-slate-800 text-xs uppercase flex gap-2 items-center">
                           <Crosshair size={14} className="text-red-500" /> Tactical Radius
                        </h3>
                        <span className="text-blue-600 font-mono text-xs font-bold">{drillRadius.toFixed(1)}km</span>
                     </div>
                     <input
                        type="range" min="0.5" max="5.0" step="0.1"
                        value={drillRadius} onChange={(e) => setDrillRadius(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded cursor-pointer accent-red-500 mb-2"
                     />
                     <div className="bg-slate-50 rounded border border-slate-200 p-2 flex items-center gap-3">
                        {isFetchingTerritory ? (
                           <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                        ) : (
                           <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                        )}
                        <div>
                           <div className="text-[9px] text-slate-400 uppercase font-bold">População Real</div>
                           <div className="text-sm font-bold text-slate-800">
                              {realTerritory ? realTerritory.population.toLocaleString() : '---'}
                           </div>
                        </div>
                     </div>
                  </div>
               )}
            </div>

            {/* [C] SIDEBAR (Simplificada para estabilidade) */}
            <div className="w-64 bg-white border-l border-slate-200 flex flex-col z-[1001] shadow-xl">
               <div className="flex border-b border-slate-100">
                  {['SNIPER', 'CONTEXTUAL'].map(t => (
                     <button key={t} onClick={() => setActiveTab(t as any)} className={`flex-1 py-2 text-[10px] font-bold ${activeTab === t ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}>{t}</button>
                  ))}
               </div>
               <div className="flex-1 p-3 overflow-y-auto">
                  {TARGETING_DNA[activeTab].map(item => (
                     <div key={item.id} className="flex justify-between items-center p-2 mb-1 rounded hover:bg-slate-50 border border-transparent hover:border-slate-100">
                        <span className="text-xs text-slate-700 font-medium">{item.name}</span>
                        <span className="text-[9px] font-bold text-emerald-600">{item.matchScore}</span>
                     </div>
                  ))}
               </div>
               <div className="p-3 border-t border-slate-100">
                  <button onClick={handleSyncClick} className="w-full py-2 bg-blue-600 text-white rounded text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors">
                     {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
                     SYNC META ADS
                  </button>
               </div>
            </div>
         </div>
      </div>
   );
};
