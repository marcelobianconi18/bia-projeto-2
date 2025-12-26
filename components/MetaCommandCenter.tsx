import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Circle, useMap, GeoJSON } from 'react-leaflet';
import { Target, TrendingUp, Share2, Users, MapPin, Maximize, Crosshair, ChevronDown, Database, Loader2, X } from 'lucide-react';
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

// --- CÁLCULO DE FORECAST (Estimativa Realista) ---
const calculateForecast = (budget: number) => {
   const cpm = 22.50; // CPM médio mercado B2B/High-End
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
   // ESTADOS PRINCIPAIS
   const [budget, setBudget] = useState(1500);
   const [activeTab, setActiveTab] = useState<TargetingLayer>('SNIPER');
   const [itemsLimit, setItemsLimit] = useState<5 | 10 | 20>(5); // 5, 10, 20 Opções

   // ESTADOS DO MAPA
   const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
   const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
   const [mapBounds, setMapBounds] = useState<LatLngBoundsExpression | null>(null);
   const [drillRadius, setDrillRadius] = useState(1.5); // km

   // ESTADOS DE UI/SYNC
   const [isSyncing, setIsSyncing] = useState(false);
   const [realTerritory, setRealTerritory] = useState<any>(null);
   const [boundary, setBoundary] = useState<any>(null);

   // DADOS (Sem Mocks - Extraídos do Briefing)
   const realHotspots = useMemo(() => briefingData.geoSignals?.hotspots || [], [briefingData.geoSignals]);
   const forecast = useMemo(() => calculateForecast(budget), [budget]);

   // DADOS DE TARGETING (Filtrados pelo Limite)
   const visibleInterests = useMemo(() => {
      const all = TARGETING_DNA[activeTab] || [];
      // Simula expansão se não houver dados suficientes no arquivo estático
      return all.slice(0, itemsLimit);
   }, [activeTab, itemsLimit]);

   // --- ACTIONS ---

   // 1. Centralizar em um ponto
   const handleSpotClick = (id: string, lat: number, lng: number) => {
      setSelectedSpotId(id);
      setMapBounds(null); // Desativa bounds para focar no ponto
      setMapCenter([lat, lng]);
      setDrillRadius(1.5); // Reset raio
   };

   // 2. "Ver Todos os Pontos"
   const handleFitAll = () => {
      if (realHotspots.length === 0) return;
      const points = realHotspots.map(h => [h.lat, h.lng] as [number, number]);
      const bounds = L.latLngBounds(points);
      setMapBounds(bounds);
      setMapCenter(null);
      setSelectedSpotId(null);
   };

   // 3. Inicialização
   useEffect(() => {
      if (realHotspots.length > 0 && !mapCenter && !mapBounds) {
         handleFitAll(); // Começa vendo tudo
      }
   }, [realHotspots]);

   // 4. Carregar Malha de Estado (Visual Tático)
   useEffect(() => {
      const stateCode = briefingData.geography?.state?.[0];
      if (!stateCode || boundary) return;

      const fetchBoundary = async () => {
         try {
            const res = await fetch(`/api/ibge/malhas/${stateCode}`);
            if (res.ok) {
               const geoJson = await res.json();
               setBoundary(geoJson);
            }
         } catch (e) { console.error("Boundary Load Failed", e); }
      };
      fetchBoundary();
   }, [briefingData.geography]);

   // 5. Drill Down (Território Real)
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
         alert(`✅ SUCESSO: ${res.message}`);
      } catch (e: any) { alert(`Erro: ${e.message}`); }
      finally { setIsSyncing(false); }
   };

   return (
      <div className="flex h-full w-full bg-[#f0f2f5] overflow-hidden font-sans text-slate-900">

         {/* === SIDEBAR ESQUERDA (OS DOIS RETÂNGULOS) === */}
         <div className="w-[420px] flex flex-col h-full border-r border-slate-300 bg-white shadow-xl z-[1001] overflow-y-auto">

            {/* --- RETÂNGULO 1: DADOS DE PESQUISA & DIRECIONAMENTO --- */}
            <div className="p-5 border-b-8 border-[#f0f2f5]">
               {/* Score Header */}
               <div className="flex justify-between items-start mb-4">
                  <div>
                     <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Score de Oportunidade</h2>
                     <div className="flex items-center gap-2">
                        <div className="w-12 h-12 rounded-full border-4 border-emerald-500 flex items-center justify-center text-xl font-bold text-emerald-700 bg-emerald-50">
                           87
                        </div>
                        <div>
                           <div className="text-sm font-bold text-slate-800">Excelente</div>
                           <div className="text-[10px] text-slate-500">Potencial de Conversão Alto</div>
                        </div>
                     </div>
                  </div>
                  <div className="text-right">
                     <div className="text-[10px] font-bold text-slate-400">ORÇAMENTO DIÁRIO</div>
                     <div className="text-lg font-mono font-bold text-blue-600">R$ {budget}</div>
                     <input type="range" min="100" max="5000" step="100" value={budget} onChange={e => setBudget(Number(e.target.value))} className="w-24 h-1 bg-slate-200 rounded accent-blue-600" />
                  </div>
               </div>

               {/* Dados Gerais */}
               <div className="bg-slate-50 p-3 rounded border border-slate-200 mb-4">
                  <h3 className="text-[11px] font-bold text-slate-700 uppercase mb-2 flex items-center gap-1"><Database size={12} /> Dados da Pesquisa</h3>
                  <div className="space-y-1">
                     <div className="flex justify-between text-xs"><span className="text-slate-500">Nicho:</span> <span className="font-medium text-slate-800">{briefingData.productDescription.substring(0, 25)}...</span></div>
                     <div className="flex justify-between text-xs"><span className="text-slate-500">Público:</span> <span className="font-medium text-slate-800">{briefingData.targetGender}, {briefingData.targetAge}</span></div>
                     <div className="flex justify-between text-xs"><span className="text-slate-500">Local:</span> <span className="font-medium text-slate-800">{briefingData.geography.city}</span></div>
                  </div>
               </div>

               {/* Direcionamento Detalhado (Meta Style) */}
               <div>
                  <div className="flex justify-between items-center mb-2">
                     <h3 className="text-sm font-bold text-slate-800">Direcionamento detalhado</h3>
                     <select
                        value={itemsLimit}
                        onChange={(e) => setItemsLimit(Number(e.target.value) as any)}
                        className="text-xs border border-slate-300 rounded px-1 py-0.5 bg-white text-slate-600 focus:outline-none focus:border-blue-500"
                     >
                        <option value={5}>Ver 5</option>
                        <option value={10}>Ver 10</option>
                        <option value={20}>Ver 20</option>
                     </select>
                  </div>

                  <div className="bg-white border border-slate-300 rounded-md overflow-hidden">
                     <div className="bg-slate-100 px-3 py-2 border-b border-slate-300 text-xs text-slate-600 font-medium">
                        Incluir pessoas que correspondem a:
                     </div>

                     {/* Tabs de Categoria */}
                     <div className="flex border-b border-slate-200">
                        {['SNIPER', 'CONTEXTUAL', 'EXPANSIVE'].map((t) => (
                           <button
                              key={t}
                              onClick={() => setActiveTab(t as any)}
                              className={`flex-1 py-2 text-[10px] font-bold transition-colors ${activeTab === t ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
                           >
                              {t}
                           </button>
                        ))}
                     </div>

                     {/* Lista de Interesses */}
                     <div className="p-2 max-h-48 overflow-y-auto custom-scrollbar">
                        {visibleInterests.map((item, idx) => (
                           <div key={idx} className="flex items-center gap-2 mb-1.5 p-1.5 hover:bg-slate-50 rounded border border-transparent hover:border-slate-200 group cursor-default">
                              <div className="bg-blue-100 text-blue-600 p-1 rounded-full"><Target size={10} /></div>
                              <div className="flex-1">
                                 <div className="text-xs font-medium text-slate-700">{item.name}</div>
                                 <div className="text-[10px] text-slate-400 flex gap-2">
                                    <span>{item.category}</span>
                                    <span className="text-emerald-600 font-bold">{item.matchScore}% Match</span>
                                 </div>
                              </div>
                              <button className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600" title="Copiar ID"><Share2 size={12} /></button>
                           </div>
                        ))}
                        {visibleInterests.length < itemsLimit && (
                           <div className="text-center py-2 text-[10px] text-slate-400 italic">
                              Fim da lista de alta relevância identificada.
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>

            {/* --- RETÂNGULO 2: PONTOS QUENTES & MAPA --- */}
            <div className="flex-1 p-5 flex flex-col min-h-0 bg-white">
               <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                     <MapPin size={12} className="text-red-500" />
                     Hotspots ({realHotspots.length})
                  </h3>
                  <button
                     onClick={handleFitAll}
                     className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                  >
                     <Maximize size={10} /> Ver todos no mapa
                  </button>
               </div>

               <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                  {realHotspots.length === 0 ? (
                     <div className="text-center py-10 text-slate-400 text-xs">
                        <Loader2 className="animate-spin mx-auto mb-2" />
                        Varrendo Território...
                     </div>
                  ) : (
                     realHotspots.map((spot, i) => (
                        <div
                           key={spot.id}
                           onClick={() => handleSpotClick(spot.id, spot.lat, spot.lng)}
                           className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${selectedSpotId === spot.id ? 'bg-blue-50 border-blue-400 shadow-sm' : 'bg-white border-slate-200 hover:border-blue-300'}`}
                        >
                           <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${selectedSpotId === spot.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                              {i + 1}
                           </div>
                           <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-slate-700 truncate">{spot.label || `Ponto ${i + 1}`}</div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-2">
                                 <span className={spot.properties?.score > 80 ? 'text-green-600 font-bold' : 'text-amber-600'}>
                                    Score: {spot.properties?.score || 85}
                                 </span>
                                 <span>•</span>
                                 <span>Alta Densidade</span>
                              </div>
                           </div>
                           <ChevronDown size={14} className={`text-slate-300 transform transition-transform ${selectedSpotId === spot.id ? '-rotate-90 text-blue-500' : ''}`} />
                        </div>
                     ))
                  )}
               </div>

               {/* Botão de Ação Final */}
               <div className="mt-4 pt-4 border-t border-slate-200">
                  <button
                     onClick={handleSync}
                     disabled={isSyncing}
                     className="w-full bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold py-3 rounded-md text-sm shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-70"
                  >
                     {isSyncing ? <Loader2 className="animate-spin" size={16} /> : <img src="https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg" width={16} alt="Meta" />}
                     {isSyncing ? 'Sincronizando...' : 'Enviar para Gerenciador de Anúncios'}
                  </button>
                  <div className="text-center mt-2 text-[10px] text-slate-400">
                     Estimativa: {forecast.reach} alcance • ~{forecast.daily} contas/dia
                  </div>
               </div>
            </div>
         </div>

         {/* === ÁREA DO MAPA (DIREITA) === */}
         <div className="flex-1 relative bg-slate-200">
            <MapContainer center={[-23.55, -46.63]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
               <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution="&copy; CARTO" />
               <MapController center={mapCenter} bounds={mapBounds} />

               {/* STATE BOUNDARY LAYER (PRESERVED) */}
               {boundary && (
                  <GeoJSON
                     data={boundary}
                     style={{
                        color: '#10b981',
                        weight: 2,
                        fillColor: '#10b981',
                        fillOpacity: 0.08,
                        dashArray: '5, 5'
                     }}
                  />
               )}

               {realHotspots.map((spot, i) => (
                  <Circle
                     key={spot.id}
                     center={[spot.lat, spot.lng]}
                     radius={selectedSpotId === spot.id ? drillRadius * 1000 : 400}
                     pathOptions={{
                        color: selectedSpotId === spot.id ? '#1877F2' : '#E11D48',
                        fillColor: selectedSpotId === spot.id ? '#1877F2' : '#E11D48',
                        fillOpacity: selectedSpotId === spot.id ? 0.15 : 0.4,
                        weight: selectedSpotId === spot.id ? 2 : 1
                     }}
                     eventHandlers={{ click: () => handleSpotClick(spot.id, spot.lat, spot.lng) }}
                  />
               ))}
            </MapContainer>

            {/* OVERLAY TÁTICO (Aparece ao clicar em um Hotspot) */}
            {selectedSpotId && (
               <div className="absolute top-4 right-4 bg-white p-4 rounded shadow-lg z-[1000] w-64 border-l-4 border-blue-500 animate-in slide-in-from-right-4">
                  <div className="flex justify-between items-center mb-2">
                     <h4 className="font-bold text-slate-700 text-sm flex gap-2 items-center"><Crosshair size={14} /> Raio de Atuação</h4>
                     <button onClick={() => { setSelectedSpotId(null); setMapCenter(null); }}><X size={14} className="text-slate-400 hover:text-red-500" /></button>
                  </div>
                  <div className="mb-2">
                     <input type="range" min="0.5" max="5" step="0.5" value={drillRadius} onChange={e => setDrillRadius(Number(e.target.value))} className="w-full accent-blue-600" />
                     <div className="text-right text-xs font-bold text-blue-600">{drillRadius} km</div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-100">
                     {realTerritory ? (
                        <div className="space-y-1">
                           <div className="flex justify-between text-xs"><span className="text-slate-500">População:</span> <strong>{realTerritory.population}</strong></div>
                           <div className="flex justify-between text-xs"><span className="text-slate-500">Renda Média:</span> <strong>R$ {realTerritory.averageIncome?.toFixed(0)}</strong></div>
                           <div className="flex justify-between text-xs"><span className="text-slate-500">Classe:</span> <span className="text-emerald-600 font-bold">{realTerritory.classification || 'A/B'}</span></div>
                        </div>
                     ) : (
                        <div className="text-xs text-slate-400 flex gap-2 items-center"><Loader2 size={10} className="animate-spin" /> Analisando dados IBGE...</div>
                     )}
                  </div>
               </div>
            )}
         </div>
      </div>
   );
};
