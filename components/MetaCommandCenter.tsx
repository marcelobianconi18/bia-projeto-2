import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet';
import { Target, TrendingUp, Share2, MapPin, Maximize, Crosshair, ChevronDown, Database, Loader2, Search } from 'lucide-react';
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

// --- CÁLCULO DE FORECAST (Estimativa Baseada em CPM Real) ---
const calculateForecast = (budget: number) => {
   const cpm = 22.50;
   const impressions = (budget / cpm) * 1000;
   const reach = Math.floor(impressions * 0.88);
   return {
      reach: reach.toLocaleString('pt-BR'),
      daily: `${Math.floor(reach / 30).toLocaleString('pt-BR')}`
   };
};

interface Props {
   briefingData: BriefingInteligente;
}

export const MetaCommandCenter: React.FC<Props> = ({ briefingData }) => {
   // ESTADOS
   const [budget, setBudget] = useState(1500);
   const [activeTab, setActiveTab] = useState<TargetingLayer>('SNIPER');
   const [itemsLimit, setItemsLimit] = useState<5 | 10 | 20>(5);

   // MAPA
   const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
   const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
   const [mapBounds, setMapBounds] = useState<LatLngBoundsExpression | null>(null);
   const [drillRadius, setDrillRadius] = useState(1.5);

   // DADOS REAIS
   const [isSyncing, setIsSyncing] = useState(false);
   const [realTerritory, setRealTerritory] = useState<any>(null);

   // Extrai Hotspots do Briefing (Vindo do Backend Real)
   const realHotspots = useMemo(() => briefingData.geoSignals?.hotspots || [], [briefingData.geoSignals]);
   const forecast = useMemo(() => calculateForecast(budget), [budget]);

   const visibleInterests = useMemo(() => {
      const all = TARGETING_DNA[activeTab] || [];
      return all.slice(0, itemsLimit);
   }, [activeTab, itemsLimit]);

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

   // Drill Down Real (Consulta IBGE via Backend)
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
         const payload = MetaSyncService.buildPayload(budget, realHotspots, activeTab, drillRadius);
         const res = await MetaSyncService.executeSync(payload);
         alert(`✅ SUCESSO REAL (META API):\n${res.message}\nCampaign ID: ${res.campaign_id}`);
      } catch (e: any) { alert(`Erro na Sincronização: ${e.message}`); }
      finally { setIsSyncing(false); }
   };

   return (
      <div className="flex flex-col h-full w-full bg-[#f0f2f5] overflow-hidden font-sans text-slate-900 border border-slate-300 rounded-xl shadow-2xl">

         {/* === [ZONE A] TOP COMMAND BAR (Modificado: Dados no Topo) === */}
         <header className="h-24 bg-white border-b border-slate-300 flex items-center px-4 justify-between shrink-0 z-[1002] shadow-sm">

            {/* 1. Score Tático */}
            <div className="flex items-center gap-3 pr-4 border-r border-slate-200">
               <div className="relative w-14 h-14 flex items-center justify-center bg-emerald-50 rounded-full border-2 border-emerald-500">
                  <span className="text-xl font-bold text-emerald-700">87</span>
                  <TrendingUp className="absolute -bottom-1 -right-1 w-5 h-5 bg-white text-emerald-600 rounded-full border border-slate-200 p-0.5" />
               </div>
               <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Potencial</div>
                  <div className="text-sm font-bold text-emerald-700 leading-tight">Excelente</div>
               </div>
            </div>

            {/* 2. DADOS DA PESQUISA (Agora no Topo, como solicitado) */}
            <div className="flex-1 px-6 flex flex-col justify-center">
               <div className="flex items-center gap-2 mb-1">
                  <Database size={14} className="text-blue-600" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Parâmetros da Missão</span>
               </div>
               <div className="bg-slate-50 rounded border border-slate-200 p-2 flex gap-4 text-xs">
                  <div className="flex flex-col">
                     <span className="text-[10px] text-slate-400">Nicho/Produto</span>
                     <span className="font-bold text-slate-700 truncate max-w-[150px]">{briefingData.productDescription.substring(0, 30)}...</span>
                  </div>
                  <div className="w-[1px] bg-slate-300"></div>
                  <div className="flex flex-col">
                     <span className="text-[10px] text-slate-400">Público Alvo</span>
                     <span className="font-bold text-slate-700">{briefingData.targetGender}, {briefingData.targetAge}</span>
                  </div>
                  <div className="w-[1px] bg-slate-300"></div>
                  <div className="flex flex-col">
                     <span className="text-[10px] text-slate-400">Geografia</span>
                     <span className="font-bold text-slate-700 flex items-center gap-1"><MapPin size={10} /> {briefingData.geography.city}</span>
                  </div>
               </div>
            </div>

            {/* 3. Budget Slider (A Chave) */}
            <div className="w-64 pl-4 border-l border-slate-200">
               <div className="flex justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Orçamento Diário</span>
                  <span className="text-sm font-mono font-bold text-blue-600">R$ {budget}</span>
               </div>
               <input
                  type="range" min="100" max="5000" step="100"
                  value={budget} onChange={e => setBudget(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
               />
               <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-slate-400">Alcance: {forecast.reach}</span>
                  <span className="text-[9px] text-slate-400">~{forecast.daily}/dia</span>
               </div>
            </div>
         </header>

         {/* === CORPO PRINCIPAL === */}
         <div className="flex flex-1 overflow-hidden">

            {/* SIDEBAR TÁTICA */}
            <div className="w-[380px] bg-white border-r border-slate-300 flex flex-col z-[1001] shadow-lg">

               {/* Direcionamento Detalhado (Meta Style) */}
               <div className="p-4 border-b border-slate-200 flex-shrink-0">
                  <div className="flex justify-between items-center mb-2">
                     <h3 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                        <Target size={14} className="text-blue-500" /> Direcionamento Detalhado
                     </h3>
                     <select
                        value={itemsLimit} onChange={(e) => setItemsLimit(Number(e.target.value) as any)}
                        className="text-[10px] border rounded px-1 py-0.5 bg-slate-50"
                     >
                        <option value={5}>Top 5</option>
                        <option value={10}>Top 10</option>
                        <option value={20}>Top 20</option>
                     </select>
                  </div>

                  <div className="bg-white border border-slate-300 rounded overflow-hidden">
                     <div className="flex bg-slate-50 border-b border-slate-200">
                        {['SNIPER', 'CONTEXTUAL', 'EXPANSIVE'].map((t) => (
                           <button key={t} onClick={() => setActiveTab(t as any)} className={`flex-1 py-2 text-[9px] font-bold ${activeTab === t ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-slate-400'}`}>{t}</button>
                        ))}
                     </div>
                     <div className="p-2 max-h-40 overflow-y-auto custom-scrollbar">
                        {visibleInterests.map((item, idx) => (
                           <div key={idx} className="flex items-center gap-2 mb-1 p-1 hover:bg-slate-50 rounded">
                              <div className="bg-blue-100 text-blue-600 p-0.5 rounded-full"><Target size={10} /></div>
                              <div className="flex-1">
                                 <div className="text-[11px] font-medium text-slate-700 leading-tight">{item.name}</div>
                                 <div className="text-[9px] text-slate-400">{item.category} • <span className="text-emerald-600">{item.matchScore}% Match</span></div>
                              </div>
                              <button className="text-slate-300 hover:text-blue-600"><Share2 size={10} /></button>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>

               {/* Lista de Hotspots */}
               <div className="flex-1 flex flex-col min-h-0 bg-[#f8f9fa]">
                  <div className="p-3 border-b border-slate-200 flex justify-between items-center bg-white">
                     <span className="text-xs font-bold text-slate-600">📍 Hotspots Identificados ({realHotspots.length})</span>
                     <button onClick={handleFitAll} className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-1"><Maximize size={10} /> Ver Todos</button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                     {realHotspots.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                           <Search size={24} className="mb-2 opacity-50" />
                           <span className="text-xs">Varrendo território real...</span>
                        </div>
                     ) : (
                        realHotspots.map((spot, i) => (
                           <div
                              key={spot.id} onClick={() => handleSpotClick(spot.id, spot.lat, spot.lng)}
                              className={`p-2 rounded border cursor-pointer flex items-center gap-3 transition-all ${selectedSpotId === spot.id ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-slate-200 hover:border-blue-300'}`}
                           >
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${selectedSpotId === spot.id ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>{i + 1}</div>
                              <div className="flex-1 min-w-0">
                                 <div className="text-xs font-bold text-slate-700 truncate">{spot.label || `Local ${i + 1}`}</div>
                                 <div className="text-[9px] text-slate-500">Score: <span className="font-bold text-emerald-600">{spot.properties?.score || 85}</span></div>
                              </div>
                              <ChevronDown size={12} className={`text-slate-400 ${selectedSpotId === spot.id ? '-rotate-90 text-blue-600' : ''}`} />
                           </div>
                        ))
                     )}
                  </div>
               </div>

               {/* Footer de Ação */}
               <div className="p-4 bg-white border-t border-slate-200">
                  <button
                     onClick={handleSync} disabled={isSyncing}
                     className="w-full py-3 bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold rounded shadow-sm text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-70"
                  >
                     {isSyncing ? <Loader2 className="animate-spin" size={16} /> : <Share2 size={16} />}
                     {isSyncing ? 'Conectando API...' : 'Enviar para Meta Ads'}
                  </button>
               </div>
            </div>

            {/* MAPA */}
            <div className="flex-1 relative bg-slate-100">
               <MapContainer center={[-23.55, -46.63]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution="&copy; CARTO" />
                  <MapController center={mapCenter} bounds={mapBounds} />

                  {realHotspots.map((spot) => (
                     <Circle
                        key={spot.id} center={[spot.lat, spot.lng]}
                        radius={selectedSpotId === spot.id ? drillRadius * 1000 : 400}
                        pathOptions={{
                           color: selectedSpotId === spot.id ? '#1877F2' : '#EF4444',
                           fillColor: selectedSpotId === spot.id ? '#1877F2' : '#EF4444',
                           fillOpacity: selectedSpotId === spot.id ? 0.1 : 0.4,
                           weight: selectedSpotId === spot.id ? 2 : 1
                        }}
                        eventHandlers={{ click: () => handleSpotClick(spot.id, spot.lat, spot.lng) }}
                     />
                  ))}
               </MapContainer>

               {/* OVERLAY TÁTICO (Drill Down) */}
               {selectedSpotId && (
                  <div className="absolute top-4 right-4 w-64 bg-white/95 backdrop-blur p-4 rounded shadow-xl border-l-4 border-blue-600 z-[1000] animate-in slide-in-from-right-4">
                     <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-slate-800 text-xs uppercase flex gap-2"><Crosshair size={14} /> Raio Tático</h4>
                        <button onClick={() => { setSelectedSpotId(null); setMapCenter(null); }}><ChevronDown size={14} className="rotate-180" /></button>
                     </div>
                     <input type="range" min="0.5" max="5" step="0.5" value={drillRadius} onChange={e => setDrillRadius(Number(e.target.value))} className="w-full h-1 bg-slate-200 rounded accent-blue-600 mb-2" />
                     <div className="text-right text-xs font-bold text-blue-600 mb-3">{drillRadius} km</div>

                     <div className="bg-slate-50 p-2 rounded border border-slate-100 space-y-1">
                        {realTerritory ? (
                           <>
                              <div className="flex justify-between text-xs"><span className="text-slate-500">População IBGE:</span> <strong>{realTerritory.population}</strong></div>
                              <div className="flex justify-between text-xs"><span className="text-slate-500">Renda Média:</span> <strong>R$ {realTerritory.averageIncome?.toFixed(0)}</strong></div>
                              <div className="flex justify-between text-xs"><span className="text-slate-500">Segurança:</span> <span className="text-emerald-600 font-bold">Monitorada</span></div>
                           </>
                        ) : (
                           <div className="flex items-center gap-2 text-xs text-slate-400"><Loader2 size={10} className="animate-spin" /> Triangulando dados reais...</div>
                        )}
                     </div>
                  </div>
               )}
            </div>
         </div>
      </div>
   );
};
