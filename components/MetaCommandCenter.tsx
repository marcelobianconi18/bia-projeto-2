import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Circle, useMap, Marker } from 'react-leaflet';
import { Target, TrendingUp, MapPin, Maximize, Crosshair, ChevronDown, Loader2, UserCheck, Zap, Share2 } from 'lucide-react';
import L, { LatLngBoundsExpression } from 'leaflet';
import { BriefingInteligente } from '../types';
import { TARGETING_DNA, TargetingLayer } from '../services/targetingDNA';
import { MetaSyncService } from '../services/MetaSyncService';
import { buildApiUrl } from '../services/apiConfig';
import { LiquidDialog } from './ui/LiquidDialog';

// --- CONTROLADOR DO MAPA ---
const MapController = ({ center, bounds }: { center: [number, number] | null, bounds: LatLngBoundsExpression | null }) => {
   const map = useMap();
   useEffect(() => {
      if (bounds) {
         console.log("🗺️ [MAPA] Ajustando foco para cobrir área tática...");
         map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 2 });
      } else if (center) {
         console.log("🗺️ [MAPA] Voando para centro:", center);
         map.flyTo(center, 13, { duration: 2, easeLinearity: 0.5 });
      }
   }, [center, bounds, map]);
   return null;
};

const targetIcon = new L.Icon({
   iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
   shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
   iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

interface Props { briefingData: BriefingInteligente; }

export const MetaCommandCenter: React.FC<Props> = ({ briefingData }) => {
   // Initial States
   const initialBudget = briefingData.financials?.monthlyBudget ? Math.floor(briefingData.financials.monthlyBudget / 30) : 50;
   const [dailyBudget, setDailyBudget] = useState(initialBudget);
   const [durationDays, setDurationDays] = useState(7);
   const [activeTab, setActiveTab] = useState<TargetingLayer>('SNIPER');
   const [itemsLimit, setItemsLimit] = useState<5 | 10 | 20>(5);

   // Map States
   const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
   const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
   const [mapBounds, setMapBounds] = useState<LatLngBoundsExpression | null>(null);
   const [drillRadius, setDrillRadius] = useState(briefingData.geography?.radius || 2);

   // Data States
   const [isSyncing, setIsSyncing] = useState(false);
   const [realTerritory, setRealTerritory] = useState<any>(null);
   const realHotspots = useMemo(() => briefingData.geoSignals?.hotspots || [], [briefingData.geoSignals]);

   const totalInvest = dailyBudget * durationDays;
   const estimatedReach = Math.floor((totalInvest / 25) * 1000 * 0.8);

   const tabLabels: Record<string, { label: string, desc: string, icon: any }> = {
      'EXPANSIVE': { label: 'DADOS DEMOGRÁFICOS', desc: 'Idade, Gênero, Localização e Renda', icon: UserCheck },
      'SNIPER': { label: 'INTERESSES', desc: 'Afinidades, Hobbies e Marcas', icon: Target },
      'CONTEXTUAL': { label: 'COMPORTAMENTOS', desc: 'Padrões de Compra e Dispositivos', icon: Zap }
   };

   // --- ACTIONS ---
   const handleSpotClick = (id: string, lat: number, lng: number) => {
      setSelectedSpotId(id);
      setMapCenter([lat, lng]);
      setMapBounds(null); // Release bounds to allow focus
   };

   const handleFitAll = () => {
      if (realHotspots.length === 0) return;
      const points = realHotspots.map(h => [h.lat, h.lng] as [number, number]);
      if (points.length > 0) {
         const bounds = L.latLngBounds(points);
         setMapBounds(bounds);
         setMapCenter(null);
         setSelectedSpotId(null);
      }
   };

   // CORREÇÃO CRÍTICA: Forçar atualização do mapa quando os dados mudam (ex: SP -> Londrina)
   useEffect(() => {
      if (realHotspots.length > 0) {
         handleFitAll();
      }
   }, [realHotspots]); // Sempre que os hotspots mudarem, recalcula o zoom.

   // Drill Down Logic
   useEffect(() => {
      if (!selectedSpotId) return;
      const spot = realHotspots.find(h => h.id === selectedSpotId);
      if (!spot) return;

      setRealTerritory(null); // Reset anterior
      const fetchIntel = async () => {
         try {
            const res = await fetch(buildApiUrl('/api/intelligence/territory'), {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ lat: spot.lat, lng: spot.lng })
            });
            const json = await res.json();
            if (json.status === 'REAL') setRealTerritory(json.data);
         } catch (e) { console.error(e); }
      };
      fetchIntel();
   }, [selectedSpotId]);

   const handleSync = async () => {
      setIsSyncing(true);
      try {
         // Snapshot que une dados originais do briefing (nicho, demografia)
         // com o orçamento ajustado em tempo real pelo usuário.
         const briefingSnapshot = {
            ...briefingData,
            budget: dailyBudget
         };

         const payload = MetaSyncService.buildPayload(briefingSnapshot, realHotspots, activeTab, drillRadius);
         const res = await MetaSyncService.executeSync(payload);

         alert(`✅ SUCESSO REAL:\nCampanha criada: ${res.campaign_id}\nConjunto: ${res.adset_id}`);
      } catch (e: any) {
         console.error(e);
         alert(`❌ FALHA NA SINCRONIZAÇÃO:\n${e.message || "Erro desconhecido na API do Meta."}`);
      } finally {
         setIsSyncing(false);
      }
   };



   return (
      <div className="flex flex-col h-full w-full liquid-card text-[rgb(var(--text-primary))] rounded-2xl overflow-hidden shadow-2xl transition-all duration-500">
         <div className="flex flex-1 overflow-hidden">
            {/* SIDEBAR */}
            <div className="w-[400px] bg-[rgba(var(--glass-bg),0.8)] backdrop-blur-md border-r border-[rgba(var(--glass-border),0.1)] flex flex-col z-[1001] shadow-lg overflow-y-auto custom-scrollbar transition-colors">
               {/* 1. ORÇAMENTO */}
               <div className="p-5 border-b border-[rgba(var(--glass-border),0.1)] bg-[rgba(var(--glass-bg),0.3)]">
                  <h3 className="text-xs font-bold text-[rgb(var(--text-secondary))] uppercase tracking-wider mb-4 flex items-center gap-2"><TrendingUp size={14} /> Planejamento Financeiro</h3>
                  {/* ... Inputs atualizados com cores semânticas ... */}
                  <div className="mb-4">
                     <div className="flex justify-between text-sm mb-1"><span className="font-semibold text-[rgb(var(--text-secondary))]">Orçamento Diário</span><span className="font-mono font-bold text-accent">R$ {dailyBudget}</span></div>
                     <input type="number" value={dailyBudget} onChange={(e) => setDailyBudget(Number(e.target.value))} className="w-full p-2 bg-[rgba(var(--glass-bg),0.5)] border border-[rgba(var(--glass-border),0.2)] rounded text-sm text-[rgb(var(--text-primary))]" />
                  </div>
                  <div className="mb-4">
                     <div className="flex justify-between text-sm mb-1"><span className="font-semibold text-[rgb(var(--text-secondary))]">Duração</span><span className="font-bold text-[rgb(var(--text-primary))]">{durationDays} dias</span></div>
                     <input type="range" min="1" max="30" step="1" value={durationDays} onChange={e => setDurationDays(Number(e.target.value))} className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                  </div>
                  <div className="bg-[rgba(var(--glass-bg),0.5)] border border-[rgba(var(--glass-border),0.2)] rounded p-3 flex justify-between items-center shadow-sm">
                     <div><div className="text-[10px] text-[rgb(var(--text-secondary))] uppercase font-bold">Total</div><div className="text-lg font-bold text-[rgb(var(--text-primary))]">R$ {totalInvest.toLocaleString('pt-BR')}</div></div>
                     <div className="text-right"><div className="text-[10px] text-[rgb(var(--text-secondary))] uppercase font-bold">Alcance</div><div className="text-sm font-bold text-emerald-500">~{estimatedReach.toLocaleString('pt-BR')}</div></div>
                  </div>
               </div>

               {/* 2. SEGMENTAÇÃO */}
               <div className="flex-1 flex flex-col min-h-0 bg-[rgba(var(--glass-bg),0.6)]">
                  <div className="flex border-b border-[rgba(var(--glass-border),0.1)]">
                     {Object.keys(tabLabels).map((key) => {
                        const info = tabLabels[key]; const isActive = activeTab === key; const Icon = info.icon;
                        return (
                           <button key={key} onClick={() => setActiveTab(key as any)} className={`flex-1 py-3 px-1 flex flex-col items-center gap-1 border-b-2 transition-colors ${isActive ? 'border-accent text-accent bg-accent/10' : 'border-transparent text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))]'}`}>
                              <Icon size={16} /><span className="text-[9px] font-bold uppercase">{info.label}</span>
                           </button>
                        );
                     })}
                  </div>
                  <div className="p-4 overflow-y-auto">
                     <div className="flex justify-between items-center mb-2">
                        <h4 className="text-xs font-bold text-[rgb(var(--text-secondary))]">Critérios de Inclusão</h4>
                        <select value={itemsLimit} onChange={(e) => setItemsLimit(Number(e.target.value) as any)} className="text-[10px] border border-[rgba(var(--glass-border),0.2)] rounded px-1 py-0.5 bg-[rgba(var(--glass-bg),0.8)] text-[rgb(var(--text-primary))] outline-none"><option value={5}>Top 5</option><option value={10}>Top 10</option><option value={20}>Top 20</option></select>
                     </div>
                     <div className="space-y-2">
                        {((briefingData.targeting?.generatedInterests && activeTab === 'SNIPER') ? briefingData.targeting.generatedInterests : (TARGETING_DNA[activeTab] || [])).slice(0, itemsLimit).map((item: any, idx: number) => (
                           <div key={idx} className="flex items-center gap-3 p-2 bg-[rgba(var(--glass-bg),0.8)] border border-[rgba(var(--glass-border),0.2)] rounded hover:border-accent transition-colors group">
                              <div className="w-1 h-8 bg-blue-500 rounded-full"></div>
                              <div className="flex-1">
                                 <div className="text-xs font-bold text-[rgb(var(--text-primary))]">{item.name}</div>
                                 <div className="text-[10px] text-[rgb(var(--text-secondary))]">{item.type || item.category || 'INTERESSE'}</div>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>

               {/* 3. HOTSPOTS */}
               <div className="border-t border-[rgba(var(--glass-border),0.1)] bg-[rgba(var(--glass-bg),0.5)] flex flex-col h-1/3">
                  <div className="p-3 border-b border-[rgba(var(--glass-border),0.1)] flex justify-between items-center">
                     <h3 className="text-xs font-bold text-[rgb(var(--text-primary))] uppercase flex items-center gap-2"><MapPin size={12} className="text-accent" /> Pontos Quentes ({realHotspots.length})</h3>
                     <button onClick={handleFitAll} className="text-[10px] text-accent hover:underline flex items-center gap-1"><Maximize size={10} /> Ver Todos</button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                     {realHotspots.map((spot, i) => (
                        <div key={spot.id} onClick={() => handleSpotClick(spot.id, spot.lat, spot.lng)} className={`flex items-center gap-3 p-2 rounded cursor-pointer border transition-colors ${selectedSpotId === spot.id ? 'bg-accent/10 border-accent' : 'bg-transparent border-transparent hover:bg-[rgba(var(--glass-bg),0.5)]'}`}>
                           <div className="w-5 h-5 bg-[rgba(var(--glass-bg),1)] rounded-full flex items-center justify-center text-[10px] font-bold text-[rgb(var(--text-secondary))] shadow-sm">{i + 1}</div>
                           <div className="flex-1 truncate text-xs font-medium text-[rgb(var(--text-primary))]">{spot.label}</div>
                           <div className="text-[10px] font-bold text-emerald-500">{spot.score || 90}</div>
                        </div>
                     ))}
                  </div>
               </div>

               <div className="p-4 border-t border-[rgba(var(--glass-border),0.1)] bg-[rgba(var(--glass-bg),0.8)]">
                  <button onClick={handleSync} disabled={isSyncing} className="w-full py-3 bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold rounded shadow-lg shadow-blue-500/30 text-sm flex items-center justify-center gap-2 disabled:opacity-70 transition-all hover:scale-[1.02]">
                     {isSyncing ? <Loader2 className="animate-spin" size={16} /> : <img src="https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg" width={16} alt="Meta" />}
                     {isSyncing ? 'Conectando...' : 'Sincronizar com Meta Ads'}
                  </button>
               </div>
            </div>

            {/* MAPA */}
            <div className="flex-1 relative bg-slate-100 dark:bg-slate-900 transition-colors">
               <MapContainer center={[-23.55, -46.63]} zoom={4} style={{ height: '100%', width: '100%' }} zoomControl={false} className="grayscale-[0.5] dark:grayscale-[0.8] dark:invert-[0.1]">
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution="&copy; CARTO" />
                  <MapController center={mapCenter} bounds={mapBounds} />
                  {realHotspots.map((spot) => (
                     <React.Fragment key={spot.id}>
                        <Circle
                           center={[spot.lat, spot.lng]}
                           radius={selectedSpotId === spot.id ? drillRadius * 1000 : (spot.radiusMeters || 800)}
                           pathOptions={{ color: selectedSpotId === spot.id ? '#1877F2' : '#10B981', fillColor: selectedSpotId === spot.id ? '#1877F2' : '#10B981', fillOpacity: 0.2 }}
                           eventHandlers={{ click: () => handleSpotClick(spot.id, spot.lat, spot.lng) }}
                        />
                        {selectedSpotId === spot.id && <Marker position={[spot.lat, spot.lng]} icon={targetIcon} />}
                     </React.Fragment>
                  ))}
               </MapContainer>

               {/* SOTA LIQUID DIALOG (Substitui o card antigo) */}
               <LiquidDialog
                  isOpen={!!selectedSpotId}
                  onClose={() => setSelectedSpotId(null)}
                  header={{
                     title: realTerritory?.locationName || "Análise Tática do Terreno",
                     badge: "Deep Dive AI",
                     icon: "Crosshair"
                  }}
                  intent="NEUTRAL"
                  actions={[
                     { label: "Anexar à Campanha", onClick: () => { console.log('Anexado'); setSelectedSpotId(null); }, primary: true },
                     { label: "Voltar ao Mapa", onClick: () => setSelectedSpotId(null) }
                  ]}
               >
                  <div className="space-y-6">
                     <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                        <div className="flex justify-between items-center mb-2">
                           <span className="text-sm font-bold text-slate-300">Raio de Ação de Marketing</span>
                           <span className="text-indigo-400 font-mono font-bold">{drillRadius} km</span>
                        </div>
                        <input
                           type="range" min="1" max="50" step="1"
                           value={drillRadius}
                           onChange={e => setDrillRadius(Number(e.target.value))}
                           className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
                        />
                     </div>

                     {realTerritory ? (
                        <div className="grid grid-cols-2 gap-4">
                           <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20">
                              <div className="flex items-center gap-2 mb-1">
                                 <TrendingUp size={14} className="text-emerald-400" />
                                 <span className="text-xs font-bold text-emerald-200 uppercase tracking-widest">Renda Média</span>
                              </div>
                              <div className="text-2xl font-bold text-emerald-400">R$ {realTerritory.averageIncome?.toLocaleString()}</div>
                              <div className="text-xs text-emerald-500/60 mt-1">Estimativa Mensal Familiar</div>
                           </div>
                           <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20">
                              <div className="flex items-center gap-2 mb-1">
                                 <UserCheck size={14} className="text-blue-400" />
                                 <span className="text-xs font-bold text-blue-200 uppercase tracking-widest">Densidade</span>
                              </div>
                              <div className="text-2xl font-bold text-blue-300">{realTerritory.population}</div>
                              <div className="text-xs text-blue-500/60 mt-1">Classificação Demográfica</div>
                           </div>
                        </div>
                     ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-3">
                           <Loader2 className="animate-spin text-indigo-500" size={32} />
                           <span className="text-sm font-medium animate-pulse">Consultando satélites e dados...</span>
                        </div>
                     )}
                  </div>
               </LiquidDialog>
            </div>
         </div>
      </div>
   );
};
