
import React, { useState, useMemo } from 'react';
import { BriefingData, GeminiAnalysis, MapSettings } from '../types';
import { TrendingUp, Users, DollarSign, Target, Activity, Zap, ExternalLink, Download, Copy, Check, Loader2, Facebook, Map as MapIcon, Database } from 'lucide-react';
import { BiaWarRoomMap } from './BiaWarRoomMap';
import { PulseGraphWidget } from './PulseGraphWidget';
import { HotspotsWidget } from './HotspotsWidget';

interface CockpitHomeProps {
  briefingData: BriefingData;
  analysis: GeminiAnalysis | null;
  mapSettings: MapSettings;
  mapCenter: [number, number];
  onNavigateToExplorer: () => void;
  onCenterChange?: (coords: [number, number]) => void;
}

export const CockpitHome: React.FC<CockpitHomeProps> = ({ 
  briefingData, 
  analysis, 
  mapSettings, 
  mapCenter, 
  onNavigateToExplorer,
  onCenterChange
}) => {
  const [budget, setBudget] = useState(120);
  const [showExport, setShowExport] = useState(false);
  const [exportStep, setExportStep] = useState<'selection' | 'loading' | 'result'>('selection');
  const [copied, setCopied] = useState(false);

  const cityName = briefingData.geography.city.split(',')[0] || "Região";

  // --- LÓGICA DE DADOS REAIS IBGE ---
  const ibgeStats = useMemo(() => {
    const mainLoc = briefingData.geography.selectedItems[0];
    if (mainLoc && typeof mainLoc !== 'string' && mainLoc.ibgeData) {
      return mainLoc.ibgeData;
    }
    return null;
  }, [briefingData]);

  const reachDisplay = useMemo(() => {
    if (ibgeStats) {
       const raw = ibgeStats.population;
       if (raw > 1000000) return `${(raw / 1000000).toFixed(1)}M`;
       return `${(raw / 1000).toFixed(0)}K`;
    }
    return "Calculando...";
  }, [ibgeStats]);

  const handleCopyPasteSelect = () => {
    setExportStep('loading');
    setTimeout(() => setExportStep('result'), 1500);
  };

  const copyToClipboard = () => {
      const text = `
⚡ ESTRATÉGIA TÁTICA BIA - ${briefingData.geography.city.toUpperCase()}
-----------------------------------------
🎯 Foco: ${briefingData.marketPositioning}
📍 Raio de Ação: ${(mapSettings.radius / 1000).toFixed(1)}km
💰 Custo Estimado: R$ ${budget.toFixed(2)}/dia

🧠 INSIGHT DE INTELIGÊNCIA:
A região apresenta score ${analysis?.score}/100.
Veredito: ${analysis?.verdict}
      `.trim();
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const handleHotspotSelect = (lat: number, lng: number) => {
    if (onCenterChange) {
      onCenterChange([lat, lng]);
    }
  };

  return (
    <div className="w-full h-full bg-slate-950 p-6 overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Visão de Comando</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            Estratégia Operacional: {briefingData.geography.city} 
            {ibgeStats && <span className="text-[#39ff14] bg-[#39ff14]/10 px-2 py-0.5 rounded border border-[#39ff14]/30 flex items-center gap-1"><Database size={10}/> IBGE_SYNCED</span>}
          </p>
        </div>
        <div className="text-right">
           <span className="text-[10px] text-[#39ff14] uppercase font-black tracking-[0.3em] bg-[#39ff14]/5 px-3 py-1 border border-[#39ff14]/20 rounded-full">Engine BIA v3.0 BorderProtect</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="flex flex-col gap-6">
            <div className="glass-panel p-6 rounded-2xl flex-1 flex flex-col items-center justify-center relative overflow-hidden min-h-[250px] border-t-2 border-t-purple-500">
                <h3 className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-4 self-start flex items-center gap-2">
                    <Activity size={14} className="text-purple-400"/> Índice BIA de Viabilidade
                </h3>
                <div className="relative w-48 h-24 mt-4">
                    <div className="absolute w-full h-full rounded-t-full bg-slate-900 overflow-hidden">
                        <div className="w-full h-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 opacity-10"></div>
                    </div>
                    <div 
                        className="absolute w-full h-full rounded-t-full border-[12px] border-slate-900 border-b-0"
                        style={{
                            background: `conic-gradient(from 180deg at 50% 100%, #39ff14 0deg, #fff01f 90deg, #ef4444 180deg)`
                        }}
                    >
                        <div className="absolute inset-0 bg-slate-950 m-[12px] rounded-t-full flex items-end justify-center pb-2">
                             <span className="text-5xl font-black text-white">{analysis?.score || 0}</span>
                        </div>
                    </div>
                </div>
                <span className="text-[10px] text-slate-600 font-black tracking-[0.4em] mt-4 uppercase">Score_Jurisdição_{cityName}</span>
            </div>

            <div className="glass-panel p-6 rounded-2xl border-l-2 border-l-[#fff01f]">
                 <h3 className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Zap size={14} className="text-[#fff01f]"/> Lentes Táticas Ativas
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900/50 p-3 rounded-lg flex items-center gap-2 border border-white/5">
                        <div className={`w-2 h-2 rounded-full ${ibgeStats ? 'bg-[#39ff14] shadow-[0_0_8px_#39ff14]' : 'bg-slate-800'}`}></div>
                        <span className="text-[10px] text-slate-300 font-bold uppercase">Oráculo IBGE</span>
                    </div>
                    <div className="bg-slate-900/50 p-3 rounded-lg flex items-center gap-2 border border-white/5">
                        <div className="w-2 h-2 rounded-full bg-[#39ff14] shadow-[0_0_8px_#39ff14]"></div>
                        <span className="text-[10px] text-slate-300 font-bold uppercase">Raio Tático</span>
                    </div>
                </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl flex-1 flex flex-col justify-between border-l-4 border-l-purple-600 min-h-[200px]">
                 <div>
                    <h3 className="text-purple-400 font-black text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Target size={16} /> Protocolo de Ataque
                    </h3>
                    <div className="bg-slate-950/80 p-5 rounded-lg border border-purple-500/20 mb-4">
                        <p className="text-[9px] text-purple-500/60 uppercase font-black mb-2 tracking-widest">Telemetria IA</p>
                        <p className="text-sm text-slate-200 leading-relaxed font-medium">
                            "{analysis?.verdict || "Aguardando sincronização de dados..."}"
                        </p>
                    </div>
                 </div>
                 <button onClick={() => setShowExport(true)} className="w-full py-4 bg-gradient-to-r from-purple-700 to-pink-700 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-lg shadow-purple-900/40 hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
                    🚀 EXPORTAR ESTRATÉGIA
                 </button>
            </div>
        </div>

        <div className="flex flex-col gap-6">
            <div className="glass-panel p-6 rounded-2xl border-l-2 border-l-[#39ff14]">
                 <h3 className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-4">Alcance e Potencial</h3>
                 <div className="bg-slate-900/40 p-4 rounded-xl flex items-center justify-between border border-white/5">
                    <div>
                        <span className="text-[10px] text-slate-600 block mb-1 uppercase font-black">
                          {ibgeStats ? `Pop_Censo_22_${cityName}` : 'Audience_Reach'}
                        </span>
                        <span className="text-3xl font-black text-white flex items-center gap-2">
                            <Users size={20} className="text-[#39ff14]"/> {reachDisplay}
                        </span>
                    </div>
                    {ibgeStats && (
                      <div className="text-right">
                         <span className="text-[8px] text-slate-500 uppercase font-bold block">PIB_LOCAL</span>
                         <span className="text-xs font-black text-white">R$ {(ibgeStats.pib / 1000).toFixed(0)}k p/cap</span>
                      </div>
                    )}
                 </div>
            </div>

            <PulseGraphWidget />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 flex-1">
                <div className="glass-panel p-5 rounded-2xl flex flex-col justify-center border border-slate-800">
                    <h3 className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Target size={14} className="text-pink-500"/> Simulador de Verba
                    </h3>
                    <div className="mb-2">
                        <div className="flex justify-between text-[11px] text-slate-300 mb-2">
                            <span className="uppercase font-black text-[9px] text-gray-500">Orçamento Diário</span>
                            <span className="font-black text-pink-500">R$ {budget}</span>
                        </div>
                        <input type="range" min="50" max="1000" step="10" value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-600" />
                    </div>
                </div>
                <HotspotsWidget onSelect={handleHotspotSelect} />
            </div>
        </div>

        <div className="flex flex-col gap-6">
             <div className="glass-panel rounded-2xl overflow-hidden relative h-full min-h-[500px] border border-slate-800 group cursor-crosshair">
                <div className="absolute top-0 left-0 w-full z-10 p-5 bg-gradient-to-b from-slate-950/80 to-transparent">
                     <h3 className="text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                        <MapIcon size={14} className="text-[#39ff14]" /> Radar de Combate Tático
                     </h3>
                </div>
                <div className="w-full h-full opacity-40 group-hover:opacity-100 transition duration-700">
                     <BiaWarRoomMap 
                        center={mapCenter}
                        settings={mapSettings}
                        cityName={cityName}
                        realIbgeData={ibgeStats}
                     />
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition duration-500">
                    <button onClick={onNavigateToExplorer} className="px-8 py-4 bg-white text-slate-950 font-black text-xs uppercase tracking-widest rounded-full shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-110 transition-all flex items-center gap-3">
                        <ExternalLink size={16} /> ABRIR EXPLORADOR FULL
                    </button>
                </div>
                <div className="absolute bottom-4 left-4 z-10">
                   <div className="flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#39ff14] animate-pulse"></div>
                      <span className="text-[8px] text-[#39ff14] font-black uppercase tracking-widest">BorderProtect: ACTIVE</span>
                   </div>
                </div>
             </div>
        </div>
      </div>

      {showExport && (
         <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in font-mono">
            <div className="glass-panel w-full max-w-xl rounded-2xl p-10 border border-purple-500/30 relative">
               <button onClick={() => setShowExport(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">✕</button>
               {exportStep === 'selection' && (
                  <>
                    <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter italic">Exportar_Protocolo</h2>
                    <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-8">Selecione o formato de saída para o gerenciador de anúncios</p>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={handleCopyPasteSelect} className="p-6 bg-slate-900 border border-slate-800 rounded-xl hover:border-purple-600 transition-all group flex flex-col items-center text-center">
                             <div className="bg-purple-600/10 p-4 rounded-full mb-4 group-hover:bg-purple-600/20 transition-all"><Copy className="text-purple-500" size={28} /></div>
                             <h3 className="font-black text-white text-[10px] uppercase tracking-widest mb-1">Área de Transferência</h3>
                             <span className="text-[8px] text-slate-600 uppercase">Texto bruto para briefing</span>
                        </button>
                        <button className="p-6 bg-slate-900 border border-slate-800 rounded-xl opacity-30 cursor-not-allowed flex flex-col items-center text-center">
                             <div className="bg-blue-600/10 p-4 rounded-full mb-4"><Facebook className="text-blue-500" size={28} /></div>
                             <h3 className="font-black text-white text-[10px] uppercase tracking-widest mb-1">Direct Sync</h3>
                             <span className="text-[8px] text-slate-600 uppercase">Push para Meta API</span>
                        </button>
                    </div>
                  </>
               )}
               {exportStep === 'loading' && (
                   <div className="flex flex-col items-center justify-center py-12">
                       <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-6" />
                       <h3 className="text-xl font-black text-white uppercase tracking-tighter italic animate-pulse">Codificando_Estratégia...</h3>
                   </div>
               )}
               {exportStep === 'result' && (
                   <div className="text-center">
                       <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/50">
                          <Check className="text-green-500" size={32}/>
                       </div>
                       <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter italic">Sucesso_Operacional</h2>
                       <button onClick={copyToClipboard} className={`w-full py-5 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${copied ? 'bg-green-600 text-white' : 'bg-white text-slate-950 shadow-[0_0_30px_rgba(255,255,255,0.2)]'}`}>
                            {copied ? "COPIADO_COM_SUCESSO" : "COPIAR_ESTRATÉGIA_BIA"}
                       </button>
                   </div>
               )}
            </div>
         </div>
      )}
    </div>
  );
};
