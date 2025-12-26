
import React, { useState, useMemo, Suspense, useEffect } from 'react';
import {
   Copy,
   Target,
   ShieldAlert,
   Zap,
   DollarSign,
   ChevronRight,
   Flame,
   Users,
   Maximize2,
   Database,
   ShieldCheck,
   AlertTriangle,
   Crosshair,
   Info,
   CheckCircle,
   Scale
} from 'lucide-react';
const BiaWarRoomMap = React.lazy(() => import('./BiaWarRoomMap').then(m => ({ default: m.BiaWarRoomMap })));
import { BriefingData, GeminiAnalysis, MapSettings } from '../types';
import buildTargetingDNA from '../services/targetingDNA';
import { PulseGraphWidget } from './PulseGraphWidget';
import { ProvenanceBadge } from './ProvenanceBadge';
import { ExplainabilityCard } from './ExplainabilityCard';
import L from 'leaflet';
import { MetaAdsPanel } from './metaAds/MetaAdsPanel';

interface MetaCommandCenterProps {
   briefingData: BriefingData;
   analysis: GeminiAnalysis | null;
   mapSettings: MapSettings;
   mapCenter: [number, number];
   onCenterChange?: (coords: [number, number]) => void;
   hotspots?: any[];
}

export const MetaCommandCenter: React.FC<MetaCommandCenterProps> = ({
   briefingData,
   analysis,
   mapSettings,
   mapCenter,
   onCenterChange,
   hotspots = []
}) => {
   const [map, setMap] = useState<L.Map | null>(null);
   const [selectedHotspot, setSelectedHotspot] = useState<any | null>(null);
   const [copiedId, setCopiedId] = useState<string | null>(null);

   const cityName = briefingData.geography.city.split(',')[0] || "Região";

   const handleCopy = (id: string, text: string) => {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
   };

   const targetingDNA = useMemo(() => {
      try {
         // WIRING HARNESS: Connecting Real Data to Strategy Brain
         const budget = briefingData.totalBudget || 5000; // Default to Simulation Scenario if not set
         const score = analysis?.score || 50;
         return buildTargetingDNA(briefingData as BriefingData, budget, score) as any;
      } catch (e) {
         console.warn('TargetingDNA generation failed, using fallback', e);
         return {
            name: 'Fallback DNA',
            geoStrategy: 'Começar amplo e refinar',
            campaignObjective: 'Performance',
            kpis: ['ctr', 'cpm'],
            audiences: ['Broad', 'Retarget 7/14/30d'],
            creatives: { angles: [], hooks: [], ctas: [] },
            budgetHint: '70/30',
            notes: ['Fallback aplicado']
         };
      }
   }, [briefingData.operationalModel]);

   // Fix Map Layout on mount/update
   useEffect(() => {
      if (!map) return;
      const t = setTimeout(() => map.invalidateSize(), 50);
      return () => clearTimeout(t);
   }, [map]);

   useEffect(() => {
      if (!map) return;
      const t = setTimeout(() => map.invalidateSize(), 50);
      return () => clearTimeout(t);
   }, [selectedHotspot, mapCenter, map]);

   return (
      <div className="h-full w-full bg-app text-app p-4 font-mono flex gap-4 overflow-hidden select-none">

         {/* SIDEBAR TÁTICA 2025 */}
         <aside className="w-[340px] h-full flex flex-col gap-4 bg-surface2 p-6 rounded-[32px] border border-app backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-app pb-5">
               <h2 className="text-[11px] font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
                  <ShieldAlert size={18} /> TARGETING_DNA_2025
               </h2>
               <div className="w-2 h-2 rounded-full bg-ok animate-pulse"></div>
            </div>

            <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 flex-1">
               <MetaAdsPanel briefingData={briefingData} />
               {/* Targeting DNA Card */}
               <div className="bg-surface p-5 rounded-2xl border border-app relative group hover:border-accent transition-all">
                  <div className="flex items-start justify-between">
                     <div>
                        <span className="text-[9px] text-muted2 uppercase font-black tracking-widest block mb-2">Targeting DNA</span>
                        <h3 className="text-[12px] font-black text-app leading-tight">{targetingDNA.name}</h3>
                     </div>
                     <button
                        onClick={() => {
                           try {
                              navigator.clipboard.writeText(JSON.stringify(targetingDNA, null, 2));
                              setCopiedId('dna_full');
                              setTimeout(() => setCopiedId(null), 2000);
                           } catch (e) { console.warn(e); }
                        }}
                        className="text-muted2 hover:text-accent transition-all"
                     >
                        {copiedId === 'dna_full' ? <CheckCircle size={16} className="text-ok" /> : <Copy size={16} />}
                     </button>
                  </div>

                  <div className="mt-3 text-[10px] text-muted">
                     <div className="mb-2"><strong>Geo:</strong> {targetingDNA.geoStrategy}</div>
                     <div className="mb-2"><strong>Objetivo:</strong> {targetingDNA.campaignObjective}</div>
                     <div className="mb-2"><strong>KPIs:</strong> {Array.isArray(targetingDNA.kpis) ? targetingDNA.kpis.join(', ') : targetingDNA.kpis}</div>
                     <div className="mb-2"><strong>Audiences:</strong> {targetingDNA.audiences?.slice(0, 3).join(' • ')}</div>
                  </div>

               </div>

               {analysis && <ExplainabilityCard analysis={analysis} />}

               <div className="bg-surface p-5 rounded-2xl border border-app relative group hover:border-accent transition-all">
                  <span className="text-[9px] text-muted2 uppercase font-black tracking-widest block mb-2">Interesses Macro (Meta Compliance)</span>
                  <p className="text-[12px] font-bold text-app leading-relaxed italic pr-8">"{targetingDNA.interests}"</p>
                  <button onClick={() => handleCopy('dna', targetingDNA.interests)} className="absolute top-4 right-4 text-muted2 hover:text-accent transition-all">
                     {copiedId === 'dna' ? <CheckCircle size={14} className="text-ok" /> : <Copy size={14} />}
                  </button>
               </div>


               <div className={`p-5 rounded-2xl border-2 flex flex-col gap-3 transition-all ${(targetingDNA.advantage || '').includes('ON') ? 'bg-green-500/5 border-green-500/30' : 'bg-orange-500/5 border-orange-500/30'}`}>
                  <div className="flex items-center justify-between">
                     <span className="text-[9px] font-black uppercase tracking-widest text-muted2">Meta Advantage+</span>
                     <span className={`text-[10px] font-black px-3 py-1 rounded-full ${(targetingDNA.advantage || '').includes('ON') ? 'bg-green-600 text-white' : 'bg-orange-600 text-white'}`}>
                        {targetingDNA.advantage}
                     </span>
                  </div>
                  <p className="text-[11px] text-muted font-black tracking-tight">{targetingDNA.strategy}</p>
                  <p className="text-[9px] text-muted2 uppercase font-bold italic opacity-60 leading-tight">{targetingDNA.warning}</p>
               </div>

               <div className="bg-surface p-5 rounded-2xl border border-app relative group hover:border-accent transition-all">
                  <span className="text-[9px] text-muted2 uppercase font-black tracking-widest block mb-2">Auditoria de Qualidade</span>
                  <button
                     onClick={() => {
                        import('../services/auditRealData').then(m => {
                           m.auditRealData({ analysis, hotspots, mapLayers: [] });
                           alert('Audit ran! Check console.');
                        });
                     }}
                     className="w-full py-2 bg-app hover:bg-surface2 text-muted text-[10px] font-bold rounded uppercase tracking-wider transition-colors"
                  >
                     ► Run Real Data Audit
                  </button>
               </div>

               <div className="bg-red-950/10 p-5 rounded-2xl border border-red-500/20">
                  <span className="text-[9px] text-red-400 font-black uppercase flex items-center gap-2 mb-3">
                     <AlertTriangle size={16} /> Exclusões de Público
                  </span>
                  <p className="text-[10px] text-red-100/60 leading-relaxed font-medium">
                     Subir Lista de Clientes (CSV/LTV). Lembre-se: Exclusão manual por interesse foi removida em 2025. Use listas customizadas.
                  </p>
               </div>
            </div>

            <div className="mt-auto pt-4 border-t border-app flex items-center justify-between text-muted2 text-[10px] font-black uppercase tracking-widest">
               <div className="flex items-center gap-2"><Database size={14} /> IBGE_ORACLE_CONNECTED</div>
            </div>
         </aside>

         {/* PAINEL CENTRAL DE COMANDO */}
         <section className="flex-1 h-full min-h-0 flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-4 shrink-0">
               <div className="bg-surface2 p-5 rounded-[24px] border border-app flex items-center gap-4">
                  <div className="bg-accent/10 p-3 rounded-2xl text-accent"><DollarSign size={24} /></div>
                  <div>
                     <span className="text-[10px] text-muted2 uppercase font-black tracking-widest block mb-1">Budget Sugerido</span>
                     <p className="text-xl font-black text-app">R$ 150,00 <span className="text-xs text-muted2">/dia</span></p>
                  </div>
               </div>
               <div className="bg-surface2 p-5 rounded-[24px] border border-app flex items-center gap-4">
                  <div className="bg-cyan-500/10 p-3 rounded-2xl text-cyan-400"><Scale size={24} /></div>
                  <div>
                     <span className="text-[10px] text-muted2 uppercase font-black tracking-widest block mb-1">Posicionamento</span>
                     <p className="text-sm font-black text-app uppercase tracking-tighter">{briefingData.marketPositioning}</p>
                  </div>
               </div>
               <div className="bg-surface2 p-5 rounded-[24px] border border-app flex items-center gap-4">
                  <div className="bg-purple-500/10 p-3 rounded-2xl text-purple-400"><ShieldCheck size={24} /></div>
                  <div>
                     <span className="text-[10px] text-muted2 uppercase font-black tracking-widest block mb-1">Score_Real_IBGE</span>
                     <p className="text-xl font-black text-app">{analysis?.score}%</p>
                  </div>
               </div>
            </div>

            <div className="flex-1 min-h-[520px] bg-app rounded-[40px] border-4 border-app overflow-hidden relative shadow-2xl">
               <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center text-muted2">Carregando mapa...</div>}>
                  <BiaWarRoomMap
                     className="h-full w-full"
                     center={mapCenter}
                     settings={{ ...mapSettings, zoom: selectedHotspot ? 16 : 13, radius: selectedHotspot ? 500 : 2000, hideNoise: true }}
                     hotspots={hotspots}
                     selectedHotspotId={selectedHotspot?.id}
                     setMapInstance={setMap}
                     cityName={cityName}
                     geoSignals={briefingData.geoSignals}
                  />
               </Suspense>

               {selectedHotspot && (
                  <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000] bg-surface2 px-8 py-5 rounded-[32px] border-2 border-orange-500/40 flex items-center gap-8 backdrop-blur-3xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] border-b-8 border-b-orange-600 animate-slide-up">
                     <div className="flex items-center gap-4">
                        <div className="w-3 h-3 rounded-full bg-orange-500 animate-ping"></div>
                        <div>
                           <span className="text-muted2 text-[9px] font-black uppercase tracking-widest block mb-1">Alvo_Lock</span>
                           <span className="text-sm font-black uppercase tracking-tighter text-app">{selectedHotspot.name}</span>
                        </div>
                     </div>
                     <div className="h-10 w-[1px] bg-border-app"></div>
                     <div className="flex items-center gap-4">
                        <Crosshair size={20} className="text-orange-500" />
                        <div>
                           <span className="text-muted2 text-[9px] font-black uppercase tracking-widest block mb-1">Protocolo_Precisão</span>
                           <span className="text-sm font-black text-ok uppercase">500 MT FIXED</span>
                        </div>
                     </div>
                     <button onClick={() => setSelectedHotspot(null)} className="ml-4 w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full transition-all">✕</button>
                  </div>
               )}
            </div>

            <div className="h-[200px] shrink-0 bg-surface2 rounded-[32px] border border-app overflow-hidden">
               <PulseGraphWidget dark />
            </div>
         </section>

         {/* LISTA DE ALVOS (DIREITA) */}
         <aside className="w-[320px] h-full flex flex-col gap-4 bg-surface2 p-6 rounded-[32px] border border-app backdrop-blur-2xl">
            <h2 className="text-[11px] font-black text-orange-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-2">
               <Flame size={18} /> SNIPER_HOTSPOTS
            </h2>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
               {hotspots.map((spot) => (
                  <button
                     key={spot.id}
                     onClick={() => {
                        setSelectedHotspot(spot);
                        if (onCenterChange) onCenterChange([spot.lat, spot.lng]);
                        if (map) map.flyTo([spot.lat, spot.lng], 16, { duration: 1.5 });
                     }}
                     className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all group text-left ${selectedHotspot?.id === spot.id ? 'bg-orange-600 border-orange-400' : 'bg-surface border-app hover:border-orange-500/30'}`}
                  >
                     <div className="flex items-center gap-4">
                        <span className={`text-[10px] font-black w-8 h-8 flex items-center justify-center border rounded-xl ${selectedHotspot?.id === spot.id ? 'bg-white text-orange-600 border-white' : 'border-app text-muted2'}`}>
                           {spot.rank}
                        </span>
                        <div>
                           <p className={`text-[12px] font-black uppercase truncate max-w-[120px] tracking-tight ${selectedHotspot?.id === spot.id ? 'text-white' : 'text-muted'}`}>{spot.name}</p>
                           <div className="flex items-center gap-2">
                              <p className={`text-[9px] font-black uppercase tracking-widest ${selectedHotspot?.id === spot.id ? 'text-orange-200' : 'text-muted2'}`}>Score: {spot.score}%</p>
                              {spot.provenance && <ProvenanceBadge provenance={spot.provenance} />}
                           </div>
                        </div>
                     </div>
                     <ChevronRight size={16} className={selectedHotspot?.id === spot.id ? 'text-white translate-x-1' : 'text-muted2'} />
                  </button>
               ))}
            </div>
            <div className="pt-5 border-t border-app">
               <button className="w-full py-5 bg-ok text-app rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-white transition-all transform active:scale-95 shadow-xl flex items-center justify-center gap-3">
                  <Crosshair size={18} /> ATIVAR MODO SNIPER
               </button>
            </div>
         </aside>

         <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 77, 0, 0.2); border-radius: 10px; }
        
        @keyframes slide-up {
          from { transform: translate(-50%, 40px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
      </div>
   );
};
