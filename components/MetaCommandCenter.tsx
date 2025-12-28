import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet';
import { Target, TrendingUp, Share2, MapPin, Maximize, Crosshair, ChevronDown, Database, Loader2, Search, DollarSign, Calendar, Users, ShieldAlert, BadgeCheck, XCircle } from 'lucide-react';
import L, { LatLngBoundsExpression } from 'leaflet';
import { BriefingInteligente } from '../types';
import { TARGETING_DNA, TargetingLayer } from '../services/targetingDNA';
import { MetaSyncService } from '../services/MetaSyncService';

// --- CONTROLADOR DO MAPA (Handles Zoom & Pan) ---
const MapController = ({ center, bounds }: { center: [number, number] | null, bounds: LatLngBoundsExpression | null }) => {
   const map = useMap();
   useEffect(() => {
      if (bounds) {
         map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 1.5 });
      } else if (center) {
         map.flyTo(center, 15, { duration: 1.5, easeLinearity: 0.25 });
      }
   }, [center, bounds, map]);
   return null;
};

// --- CÁLCULO DE FORECAST ---
const calculateForecast = (dailyBudget: number, duration: number) => {
   const totalBudget = dailyBudget * duration;
   const cpm = 22.50;
   const impressions = (totalBudget / cpm) * 1000;
   const reach = Math.floor(impressions * 0.88);
   return {
      totalReach: reach.toLocaleString('pt-BR'),
      dailyReach: Math.floor(reach / duration).toLocaleString('pt-BR'),
      totalInvestment: totalBudget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
   };
};

interface Props {
   briefingData: BriefingInteligente;
}

const TAB_CONFIG: Record<string, { label: string; description: string }> = {
   'ATAQUE': { label: 'ATAQUE (INCLUSÃO)', description: 'Públicos que a BIA identificou com alta afinidade para conversão.' },
   'DEFESA': { label: 'DEFESA (EXCLUSÃO)', description: 'Blindagem de verba: perfis que devem ser NEGATIVADOS.' },
   'DEMOGRAFICO': { label: 'DEMOGRAFIA', description: 'Dados estruturais como Idade, Gênero e Localização.' }
};

export const MetaCommandCenter: React.FC<Props> = ({ briefingData }) => {
   const [dailyBudget, setDailyBudget] = useState(briefingData.financials.monthlyBudget / 30 || 50);
   const [duration, setDuration] = useState(7);
   const [activeTab, setActiveTab] = useState<string>('ATAQUE');

   // MAPA
   const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
   const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
   const [mapBounds, setMapBounds] = useState<LatLngBoundsExpression | null>(null);
   const [drillRadius, setDrillRadius] = useState(1.5);

   const [isSyncing, setIsSyncing] = useState(false);
   const [realTerritory, setRealTerritory] = useState<any>(null);

   const realHotspots = useMemo(() => briefingData.geoSignals?.hotspots || [], [briefingData.geoSignals]);
   const exclusions = useMemo(() => briefingData.geoSignals?.excludedSegments || [], [briefingData.geoSignals]);
   const inclusions = useMemo(() => briefingData.geoSignals?.bestSegments || [], [briefingData.geoSignals]);

   const forecast = useMemo(() => calculateForecast(dailyBudget, duration), [dailyBudget, duration]);

   // --- ACTIONS ---
   const handleSpotClick = (id: string, lat: number, lng: number) => {
      setSelectedSpotId(id);
      setMapBounds(null);
      setMapCenter([lat, lng]);
      setDrillRadius(1.5);
   };

   const handleFitAll = () => {
      if (realHotspots.length === 0) return;
      const points = realHotspots.map(h => [h.lat, h.lng] as [number, number]);
      const bounds = L.latLngBounds(points);
      setMapBounds(bounds);
      setMapCenter(null);
      setSelectedSpotId(null);
   };

   useEffect(() => {
      if (realHotspots.length > 0 && !mapCenter && !mapBounds) {
         handleFitAll();
      }
   }, [realHotspots]);

   useEffect(() => {
      if (!selectedSpotId) return;
      const spot = realHotspots.find(h => h.id === selectedSpotId);
      if (!spot) return;

      const timer = setTimeout(async () => {
         try {
            const res = await fetch('/api/intelligence/territory', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ lat: spot.lat, lng: spot.lng, radiusMeters: drillRadius * 1000 })
            });
            const json = await res.json();
            if (json.status === 'REAL') setRealTerritory(json.data);
         } catch (e) { console.error(e); }
      }, 500);
      return () => clearTimeout(timer);
   }, [drillRadius, selectedSpotId]);

   const handleSync = async () => {
      setIsSyncing(true);
      try {
         const totalBudgetForApi = dailyBudget * duration;
         const payload = MetaSyncService.buildPayload(totalBudgetForApi, realHotspots, activeTab as any, drillRadius);
         const res = await MetaSyncService.executeSync(payload);
         alert(`✅ PROTOCOLO EXECUTADO:\n${res.message}\nCampaign ID: ${res.campaign_id}`);
      } catch (e: any) { alert(`Erro na Sincronização: ${e.message}`); }
      finally { setIsSyncing(false); }
   };

   // Renderização da Lista de Targeting (Ataque/Defesa)
   const renderTargetingList = () => {
      if (activeTab === 'DEFESA') {
         return (
            <div className="p-2 bg-red-50/50 min-h-[100px]">
               {exclusions.length > 0 ? exclusions.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2 p-2 bg-white border border-red-200 rounded shadow-sm">
                     <XCircle size={16} className="text-red-500 shrink-0" />
                     <div>
                        <div className="text-xs font-bold text-slate-700">{item}</div>
                        <div className="text-[9px] text-red-500 uppercase font-bold">Bloqueio Ativo</div>
                     </div>
                  </div>
               )) : <div className="text-center text-xs text-slate-400 py-4">Nenhum bloqueio sugerido.</div>}
            </div>
         );
      }
      // ATAQUE (Default)
      return (
         <div className="p-2 bg-emerald-50/50 min-h-[100px]">
            {inclusions.map((item, idx) => (
               <div key={idx} className="flex items-center gap-2 mb-2 p-2 bg-white border border-emerald-200 rounded shadow-sm">
                  <BadgeCheck size={16} className="text-emerald-500 shrink-0" />
                  <div>
                     <div className="text-xs font-bold text-slate-700">{item}</div>
                     <div className="text-[9px] text-emerald-500 uppercase font-bold">Alta Afinidade</div>
                  </div>
               </div>
            ))}
            {/* Fallback visual se vazio */}
            {inclusions.length === 0 && <div className="text-center text-xs text-slate-400 py-4">Carregando inteligência...</div>}
         </div>
      );
   };

   return (
      <div className="flex flex-col h-full w-full bg-[#f0f2f5] overflow-hidden font-sans text-slate-900 border border-slate-300 rounded-xl shadow-2xl">

         {/* === HEADER TÁTICO === */}
         <header className="h-16 bg-white border-b border-slate-300 flex items-center px-4 justify-between shrink-0 z-[1002] shadow-sm">
            <div className="flex items-center gap-3 pr-4 border-r border-slate-200">
               <div className="relative w-10 h-10 flex items-center justify-center bg-slate-100 rounded-full border-2 border-slate-300">
                  <span className="text-xs font-bold text-slate-600">{briefingData.archetype === 'LOCAL_BUSINESS' ? 'LOC' : 'DIG'}</span>
               </div>
               <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Modo de Operação</div>
                  <div className="text-xs font-bold text-slate-700 leading-tight">{briefingData.archetype.replace('_', ' ')}</div>
               </div>
            </div>

            <div className="flex-1 px-4 flex items-center justify-end gap-4">
               <div className="flex flex-col items-end">
                  <span className="text-[10px] text-slate-400 uppercase">Tribo Alvo</span>
                  <div className="flex gap-1">{briefingData.targeting.tribeReferences.slice(0, 3).map(t => <span key={t} className="text-[10px] bg-slate-100 px-1 rounded">{t}</span>)}</div>
               </div>
            </div>
         </header>

         {/* === CORPO === */}
         <div className="flex flex-1 overflow-hidden">

            {/* SIDEBAR DE COMANDO */}
            <div className="w-[400px] bg-white border-r border-slate-300 flex flex-col z-[1001] shadow-lg overflow-y-auto">

               {/* 1. ORÇAMENTO */}
               <div className="p-4 border-b border-slate-200 bg-slate-50">
                  <h3 className="text-xs font-bold text-slate-700 flex items-center gap-2 mb-3 uppercase tracking-wide">
                     <DollarSign size={14} className="text-emerald-600" /> Verba Tática
                  </h3>
                  <div className="space-y-3">
                     <div>
                        <div className="flex justify-between items-center mb-1"><label className="text-[10px] font-bold text-slate-500 uppercase">Diário (R$)</label></div>
                        <input type="number" value={dailyBudget} onChange={(e) => setDailyBudget(Number(e.target.value))} className="w-full pl-2 py-1 bg-white border border-slate-300 rounded text-slate-800 font-bold text-sm" />
                     </div>
                     <div className="flex justify-between text-xs pt-2 border-t border-slate-200 mt-2">
                        <span className="text-slate-500">Total Previsto:</span>
                        <span className="font-bold text-emerald-600">{forecast.totalInvestment}</span>
                     </div>
                  </div>
               </div>

               {/* 2. DEEP TARGETING (ATAQUE vs DEFESA) */}
               <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex border-b border-slate-200">
                     <button onClick={() => setActiveTab('ATAQUE')} className={`flex-1 py-3 text-[10px] font-bold uppercase border-b-2 transition-colors flex items-center justify-center gap-1 ${activeTab === 'ATAQUE' ? 'border-emerald-500 text-emerald-700 bg-emerald-50' : 'border-transparent text-slate-400'}`}>
                        <Target size={12} /> Ataque
                     </button>
                     <button onClick={() => setActiveTab('DEFESA')} className={`flex-1 py-3 text-[10px] font-bold uppercase border-b-2 transition-colors flex items-center justify-center gap-1 ${activeTab === 'DEFESA' ? 'border-red-500 text-red-700 bg-red-50' : 'border-transparent text-slate-400'}`}>
                        <ShieldAlert size={12} /> Defesa
                     </button>
                  </div>

                  {/* Lista Dinâmica */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
                     <div className="p-2">
                        <p className="text-[10px] text-slate-500 mb-2 italic px-1">{TAB_CONFIG[activeTab].description}</p>
                        {renderTargetingList()}
                     </div>
                  </div>
               </div>

               {/* 3. RADAR ALVOS */}
               <div className="h-[200px] border-t border-slate-200 flex flex-col">
                  <div className="p-2 border-b border-slate-100 flex justify-between items-center bg-white">
                     <span className="text-xs font-bold text-slate-700 flex items-center gap-2"><MapPin size={12} className="text-blue-500" /> Zonas Táticas ({realHotspots.length})</span>
                     <button onClick={handleFitAll} className="text-[10px] text-blue-600 font-bold hover:underline">Ver Todos</button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-1 space-y-1 bg-[#f8f9fa]">
                     {realHotspots.map((spot, i) => (
                        <div key={spot.id} onClick={() => handleSpotClick(spot.id, spot.lat, spot.lng)} className={`p-2 rounded border cursor-pointer flex items-center gap-2 text-xs transition-colors ${selectedSpotId === spot.id ? 'bg-blue-100 border-blue-400' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                           <span className="font-bold text-slate-400 w-4">{i + 1}</span>
                           <span className="truncate flex-1 text-slate-700 font-medium">{spot.label}</span>
                           <span className={`${spot.score > 80 ? 'text-emerald-600' : 'text-amber-600'} font-bold`}>{spot.score}</span>
                        </div>
                     ))}
                  </div>
               </div>

               {/* Footer Action */}
               <div className="p-4 bg-white border-t border-slate-200 shadow-lg shrink-0">
                  <button onClick={handleSync} disabled={isSyncing} className="w-full py-3 bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold rounded shadow text-sm flex items-center justify-center gap-2 disabled:opacity-70">
                     {isSyncing ? <Loader2 className="animate-spin" size={16} /> : <Share2 size={16} />}
                     {isSyncing ? 'Sincronizando...' : 'DISPARAR ORDEM'}
                  </button>
               </div>
            </div>

            {/* MAPA */}
            <div className="flex-1 relative bg-slate-100">
               <MapContainer center={[-15.79, -47.89]} zoom={4} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution="&copy; CARTO" />
                  <MapController center={mapCenter} bounds={mapBounds} />
                  {realHotspots.map((spot, i) => (
                     <Circle key={spot.id} center={[spot.lat, spot.lng]} radius={selectedSpotId === spot.id ? drillRadius * 2000 : 15000} // Raio visual maior para macro
                        pathOptions={{ color: selectedSpotId === spot.id ? '#1877F2' : '#EF4444', fillColor: selectedSpotId === spot.id ? '#1877F2' : '#EF4444', fillOpacity: 0.4, weight: 1 }}
                        eventHandlers={{ click: () => handleSpotClick(spot.id, spot.lat, spot.lng) }}
                     />
                  ))}
               </MapContainer>
            </div>

         </div>
      </div>
   );
};
