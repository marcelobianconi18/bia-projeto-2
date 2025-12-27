import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet';
import { Target, TrendingUp, Share2, MapPin, Maximize, Crosshair, ChevronDown, Database, Loader2, Search, DollarSign, Calendar, Users } from 'lucide-react';
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
// Agora considera Duração e Orçamento Diário
const calculateForecast = (dailyBudget: number, duration: number) => {
   const totalBudget = dailyBudget * duration;
   const cpm = 22.50; // CPM médio estimado
   const impressions = (totalBudget / cpm) * 1000;
   const reach = Math.floor(impressions * 0.88); // Alcance único estimado (88% das impressões)

   return {
      totalReach: reach.toLocaleString('pt-BR'),
      dailyReach: Math.floor(reach / duration).toLocaleString('pt-BR'),
      totalInvestment: totalBudget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
   };
};

interface Props {
   briefingData: BriefingInteligente;
}

const TAB_CONFIG: Record<TargetingLayer, { label: string; description: string }> = {
   'EXPANSIVE': {
      label: 'DADOS DEMOGRÁFICOS',
      description: 'Alcance pessoas com base no nível educacional, emprego, informações sobre o domicílio e detalhes do estilo de vida.'
   },
   'SNIPER': {
      label: 'INTERESSES',
      description: 'Alcance públicos específicos analisando interesses, atividades, Páginas curtidas e tópicos relacionados.'
   },
   'CONTEXTUAL': {
      label: 'COMPORTAMENTOS',
      description: 'Alcance pessoas com base em comportamentos ou intenções de compra, uso do dispositivo etc.'
   }
};

export const MetaCommandCenter: React.FC<Props> = ({ briefingData }) => {
   // ESTADOS
   const [dailyBudget, setDailyBudget] = useState(50); // Valor diário padrão mais realista
   const [duration, setDuration] = useState(7); // Duração padrão (dias)
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

   // Recalcula forecast quando muda orçamento ou duração
   const forecast = useMemo(() => calculateForecast(dailyBudget, duration), [dailyBudget, duration]);

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
         // Payload atualizado para considerar o orçamento total ou diário conforme API
         // Assumindo que a API espera budget total. Se for diário, ajustar.
         // Vou mandar o total calculado para garantir.
         const totalBudgetForApi = dailyBudget * duration;
         const payload = MetaSyncService.buildPayload(totalBudgetForApi, realHotspots, activeTab, drillRadius);
         const res = await MetaSyncService.executeSync(payload);
         alert(`✅ SUCESSO REAL (META API):\n${res.message}\nCampaign ID: ${res.campaign_id}`);
      } catch (e: any) { alert(`Erro na Sincronização: ${e.message}`); }
      finally { setIsSyncing(false); }
   };

   return (
      <div className="flex flex-col h-full w-full bg-[#f0f2f5] overflow-hidden font-sans text-slate-900 border border-slate-300 rounded-xl shadow-2xl">

         {/* === [ZONE A] TOP COMMAND BAR (Modificado: Sem Orçamento) === */}
         <header className="h-20 bg-white border-b border-slate-300 flex items-center px-4 justify-between shrink-0 z-[1002] shadow-sm">

            {/* 1. Score Tático */}
            <div className="flex items-center gap-3 pr-4 border-r border-slate-200">
               <div className="relative w-12 h-12 flex items-center justify-center bg-emerald-50 rounded-full border-2 border-emerald-500">
                  <span className="text-lg font-bold text-emerald-700">87</span>
                  <TrendingUp className="absolute -bottom-1 -right-1 w-4 h-4 bg-white text-emerald-600 rounded-full border border-slate-200 p-0.5" />
               </div>
               <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Potencial</div>
                  <div className="text-xs font-bold text-emerald-700 leading-tight">Excelente</div>
               </div>
            </div>

            {/* 2. DADOS DA PESQUISA */}
            <div className="flex-1 px-6 flex flex-col justify-center">
               <div className="flex items-center gap-2 mb-1">
                  <Database size={14} className="text-blue-600" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Parâmetros da Missão</span>
               </div>
               <div className="bg-slate-50 rounded border border-slate-200 p-2 flex gap-4 text-xs items-center">
                  <div className="flex flex-col">
                     <span className="text-[10px] text-slate-400">Nicho/Produto</span>
                     <span className="font-bold text-slate-700 truncate max-w-[200px]">{briefingData.productDescription.substring(0, 40)}...</span>
                  </div>
                  <div className="w-[1px] h-6 bg-slate-200"></div>
                  <div className="flex flex-col">
                     <span className="text-[10px] text-slate-400">Público Alvo</span>
                     <span className="font-bold text-slate-700">{briefingData.targetGender}, {briefingData.targetAge}</span>
                  </div>
                  <div className="w-[1px] h-6 bg-slate-200"></div>
                  <div className="flex flex-col">
                     <span className="text-[10px] text-slate-400">Geografia</span>
                     <span className="font-bold text-slate-700 flex items-center gap-1"><MapPin size={10} /> {briefingData.geography.city}</span>
                  </div>
               </div>
            </div>
         </header>

         {/* === CORPO PRINCIPAL === */}
         <div className="flex flex-1 overflow-hidden">

            {/* SIDEBAR TÁTICA (Left Sidebar) */}
            <div className="w-[420px] bg-white border-r border-slate-300 flex flex-col z-[1001] shadow-lg">

               {/* 1. MÓDULO FINANCEIRO (RELOCADO PARA O TOPO) */}
               <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                  <h3 className="text-xs font-bold text-slate-700 flex items-center gap-2 mb-3 uppercase tracking-wide">
                     <DollarSign size={14} className="text-emerald-600" /> Controle Orçamentário
                  </h3>

                  <div className="space-y-4">
                     {/* Input Valor Diário */}
                     <div>
                        <div className="flex justify-between items-center mb-1">
                           <label className="text-[10px] font-bold text-slate-500 uppercase">Orçamento Diário (R$)</label>
                        </div>
                        <div className="relative">
                           <span className="absolute left-3 top-2 text-slate-400 font-bold text-sm">R$</span>
                           <input
                              type="number"
                              value={dailyBudget}
                              onChange={(e) => setDailyBudget(Number(e.target.value))}
                              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded text-slate-800 font-bold text-sm focus:outline-none focus:border-blue-500 transition-colors"
                           />
                        </div>
                     </div>

                     {/* Slider Duração */}
                     <div>
                        <div className="flex justify-between items-center mb-1">
                           <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Calendar size={10} /> Duração (Dias)</label>
                           <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{duration} dias</span>
                        </div>
                        <input
                           type="range" min="1" max="30" step="1"
                           value={duration} onChange={e => setDuration(Number(e.target.value))}
                           className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                     </div>

                     {/* Resumo Financeiro */}
                     <div className="bg-white border border-slate-200 rounded p-2 flex justify-between items-center shadow-sm">
                        <div className="flex flex-col">
                           <span className="text-[9px] text-slate-400 uppercase font-bold">Investimento Total</span>
                           <span className="text-sm font-bold text-emerald-600">{forecast.totalInvestment}</span>
                        </div>
                        <div className="w-[1px] h-6 bg-slate-100"></div>
                        <div className="flex flex-col items-end">
                           <span className="text-[9px] text-slate-400 uppercase font-bold flex items-center gap-1"><Users size={8} /> Alcance Estimado</span>
                           <span className="text-sm font-bold text-blue-600">~{forecast.totalReach}</span>
                        </div>
                     </div>
                  </div>
               </div>


               {/* 2. DIRECIONAMENTO DETALHADO (RENAMED & DESCRIBED) */}
               <div className="p-4 border-b border-slate-200 flex-shrink-0">
                  <div className="flex justify-between items-center mb-2">
                     <h3 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                        <Target size={14} className="text-blue-500" /> SEGMENTAÇÃO
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
                     {/* Tabs Renomeadas */}
                     <div className="flex bg-slate-50 border-b border-slate-200">
                        {(['SNIPER', 'CONTEXTUAL', 'EXPANSIVE'] as TargetingLayer[]).map((t) => (
                           <button
                              key={t}
                              onClick={() => setActiveTab(t)}
                              className={`flex-1 py-2 text-[9px] font-bold uppercase transition-colors ${activeTab === t ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-400 hover:text-slate-600'}`}
                           >
                              {TAB_CONFIG[t].label}
                           </button>
                        ))}
                     </div>

                     {/* Descrição Contextual */}
                     <div className="px-3 py-2 bg-blue-50/30 border-b border-blue-100">
                        <p className="text-[10px] text-slate-500 italic leading-tight">
                           {TAB_CONFIG[activeTab].description}
                        </p>
                     </div>

                     <div className="p-2 max-h-40 overflow-y-auto custom-scrollbar bg-white">
                        {visibleInterests.map((item, idx) => (
                           <div key={idx} className="flex items-center gap-2 mb-1 p-1 hover:bg-slate-50 rounded group">
                              <div className="bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 p-1 rounded-full transition-colors"><Target size={10} /></div>
                              <div className="flex-1">
                                 <div className="text-[11px] font-medium text-slate-700 leading-tight">{item.name}</div>
                                 <div className="text-[9px] text-slate-400 flex justify-between">
                                    <span>{item.category}</span>
                                    <span className="text-emerald-600 font-bold">{item.matchScore}% Match</span>
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>

               {/* 3. LISTA DE HOTSPOTS (Scrollable & Guaranteed) */}
               <div className="flex-1 flex flex-col min-h-0 bg-[#f8f9fa]">
                  <div className="p-3 border-b border-slate-200 flex justify-between items-center bg-white shadow-sm z-10">
                     <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                        <MapPin size={12} className="text-red-500" /> ALVOS IDENTIFICADOS ({realHotspots.length})
                     </span>
                     <button onClick={handleFitAll} className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-1">
                        <Maximize size={10} /> Ver Mapa Inteiro
                     </button>
                  </div>

                  {/* Container com scroll garantido para os 20 itens */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                     {realHotspots.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                           <Search size={24} className="mb-2 opacity-50" />
                           <span className="text-xs">Varrendo território real...</span>
                        </div>
                     ) : (
                        realHotspots.map((spot, i) => (
                           <div
                              key={spot.id} onClick={() => handleSpotClick(spot.id, spot.lat, spot.lng)}
                              className={`p-2 rounded border cursor-pointer flex items-center gap-3 transition-all ${selectedSpotId === spot.id ? 'bg-blue-50 border-blue-500 shadow-md ring-1 ring-blue-200' : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'}`}
                           >
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm transition-colors ${selectedSpotId === spot.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                 {i + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <div className="text-xs font-bold text-slate-700 truncate">{spot.label || `Local ${i + 1}`}</div>
                                 <div className="text-[10px] text-slate-500 flex items-center gap-2">
                                    <span>Score: <span className={`${(spot.properties?.score || 0) > 80 ? 'text-emerald-600' : 'text-amber-600'} font-bold`}>{spot.properties?.score || 85}</span></span>
                                    <span className="text-slate-300">•</span>
                                    <span className="truncate max-w-[80px]">{spot.properties?.type || 'Comércio'}</span>
                                 </div>
                              </div>
                              <ChevronDown size={14} className={`text-slate-300 transition-transform ${selectedSpotId === spot.id ? '-rotate-90 text-blue-600' : ''}`} />
                           </div>
                        ))
                     )}
                  </div>
               </div>

               {/* Footer de Ação */}
               <div className="p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                  <button
                     onClick={handleSync} disabled={isSyncing}
                     className="w-full py-3 bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold rounded shadow-sm text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:grayscale"
                  >
                     {isSyncing ? <Loader2 className="animate-spin" size={18} /> : <Share2 size={18} />}
                     {isSyncing ? 'Sincronizando com Meta Ads...' : 'CRIAR CAMPANHA AGORA'}
                  </button>
                  <div className="text-center mt-2">
                     <span className="text-[9px] text-slate-400">Ao clicar, você concorda com os termos da API do Meta.</span>
                  </div>
               </div>
            </div>

            {/* MAPA */}
            <div className="flex-1 relative bg-slate-100">
               <MapContainer center={[-23.55, -46.63]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution="&copy; CARTO" />
                  <MapController center={mapCenter} bounds={mapBounds} />

                  {realHotspots.map((spot, i) => (
                     <Circle
                        key={spot.id} center={[spot.lat, spot.lng]}
                        radius={selectedSpotId === spot.id ? drillRadius * 1000 : 400}
                        pathOptions={{
                           color: selectedSpotId === spot.id ? '#1877F2' : '#EF4444',
                           fillColor: selectedSpotId === spot.id ? '#1877F2' : '#EF4444',
                           fillOpacity: selectedSpotId === spot.id ? 0.1 : 0.6,
                           weight: selectedSpotId === spot.id ? 2 : 1
                        }}
                        eventHandlers={{ click: () => handleSpotClick(spot.id, spot.lat, spot.lng) }}
                     />
                  ))}
               </MapContainer>

               {/* OVERLAY TÁTICO (Drill Down) */}
               {selectedSpotId && (
                  <div className="absolute top-4 right-4 w-72 bg-white/95 backdrop-blur-md p-4 rounded-lg shadow-2xl border border-white/50 z-[1000] animate-in slide-in-from-right-4 ring-1 ring-black/5">
                     <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                        <h4 className="font-bold text-slate-800 text-xs uppercase flex items-center gap-2">
                           <div className="w-5 h-5 rounded bg-blue-100 text-blue-600 flex items-center justify-center"><Crosshair size={12} /></div>
                           Radar Tático
                        </h4>
                        <button onClick={() => { setSelectedSpotId(null); setMapCenter(null); }} className="hover:bg-slate-100 p-1 rounded transition-colors"><ChevronDown size={14} className="rotate-180 text-slate-500" /></button>
                     </div>

                     <div className="mb-4">
                        <div className="flex justify-between text-[10px] text-slate-500 mb-1 font-bold uppercase">Raio de Ação</div>
                        <input type="range" min="0.5" max="5" step="0.5" value={drillRadius} onChange={e => setDrillRadius(Number(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg accent-blue-600 mb-1 cursor-pointer" />
                        <div className="text-right text-sm font-bold text-blue-600">{drillRadius} km</div>
                     </div>

                     <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2 shadow-inner">
                        {realTerritory ? (
                           <>
                              <div className="flex justify-between items-center text-xs border-b border-slate-100 pb-1">
                                 <span className="text-slate-500">População Estimada</span>
                                 <strong className="text-slate-700">{realTerritory.population}</strong>
                              </div>
                              <div className="flex justify-between items-center text-xs border-b border-slate-100 pb-1">
                                 <span className="text-slate-500">Renda Média Local</span>
                                 <strong className="text-emerald-700">R$ {realTerritory.averageIncome?.toFixed(0)}</strong>
                              </div>
                              <div className="flex justify-between items-center text-xs pt-1">
                                 <span className="text-slate-500">Classificação</span>
                                 <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[10px] font-bold">MONITORADA</span>
                              </div>
                           </>
                        ) : (
                           <div className="flex flex-col items-center justify-center py-4 gap-2 text-slate-400">
                              <Loader2 size={16} className="animate-spin text-blue-500" />
                              <span className="text-xs">Triangulando satélite...</span>
                           </div>
                        )}
                     </div>
                  </div>
               )}
            </div>
         </div>
      </div>
   );
};
