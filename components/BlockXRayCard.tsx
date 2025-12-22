
import React from 'react';
import { Target, Users, DollarSign, Activity, Ghost, Smartphone, Zap, Lightbulb } from 'lucide-react';
import { AdTechZoneData } from '../types';

export const BlockXRayCard = ({ data }: { data: AdTechZoneData | null }) => {
    if (!data) return null;

    const formatCurrency = (val: number) => {
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    return (
        <div className="absolute top-1/2 left-1/2 -translate-x-[-30px] -translate-y-[20px] z-[2000] w-72 p-4 
                    bg-slate-900/98 backdrop-blur-xl 
                    border border-cyan-500/40 shadow-[0_20px_50px_rgba(0,0,0,0.5)]
                    text-cyan-50 font-mono text-sm rounded-xl pointer-events-none animate-fade-in overflow-hidden">
            
            {/* Header com Alerta Ghost */}
            <div className={`flex items-center justify-between mb-3 border-b pb-2 ${data.isGhost ? 'border-red-500/50' : 'border-cyan-800'}`}>
                <h3 className={`font-bold flex items-center gap-2 ${data.isGhost ? 'text-red-400' : 'text-cyan-400'}`}>
                    {data.isGhost ? <Ghost size={14} className="animate-bounce" /> : <Target size={14} className="animate-pulse" />} 
                    AD_TECH_SCAN
                </h3>
                {data.isGhost && <span className="text-[8px] bg-red-600 px-1.5 rounded font-black animate-pulse uppercase">Ghost_Alert</span>}
            </div>

            <div className="space-y-3">
                {/* Tech Fingerprint Section */}
                <div className="bg-white/5 p-2 rounded border border-white/5">
                   <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-slate-500 uppercase font-black">Digital_Footprint:</span>
                      <span className={`text-[9px] font-black px-1.5 rounded ${data.techFingerprint === 'iOS_5G' ? 'bg-blue-600/50 text-blue-200' : 'bg-green-600/50 text-green-200'}`}>
                         {data.techFingerprint}
                      </span>
                   </div>
                   <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                         className={`h-full ${data.techFingerprint === 'iOS_5G' ? 'bg-blue-400 shadow-[0_0_5px_#60a5fa]' : 'bg-green-400'}`} 
                         style={{ width: data.techFingerprint === 'iOS_5G' ? '85%' : '65%' }}
                      />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                        <span className="text-[8px] text-slate-500 uppercase font-black">Renda_Est:</span>
                        <span className="font-bold text-white text-[11px]">{formatCurrency(data.income)}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[8px] text-slate-500 uppercase font-black">Fluxo_Mobile:</span>
                        <span className={`font-bold text-[11px] ${data.footfallTraffic < 20 ? 'text-red-400' : 'text-[#39ff14]'}`}>
                           {data.footfallTraffic}% {data.footfallTraffic < 20 ? '(BAIXO)' : '(ALTO)'}
                        </span>
                    </div>
                </div>

                {/* Creative Hook Section */}
                <div className="mt-2 pt-2 border-t border-cyan-800/30">
                    <div className="flex items-center gap-2 mb-1 text-yellow-400 uppercase font-black text-[9px]">
                        <Lightbulb size={12} /> BIA_CREATIVE_HOOK:
                    </div>
                    <p className="text-[10px] text-slate-300 italic leading-tight">
                       "{data.creativeHook}"
                    </p>
                </div>
            </div>

            {/* Footer com Metadados */}
            <div className="mt-4 flex justify-between items-center text-[7px] text-slate-600 font-black tracking-widest bg-black/40 -mx-4 -mb-4 px-4 py-2">
                <span>COORD: {data.lat.toFixed(4)} / {data.lng.toFixed(4)}</span>
                <div className="flex gap-1">
                   <div className={`w-1 h-1 rounded-full ${data.isGhost ? 'bg-red-500 shadow-[0_0_3px_red]' : 'bg-cyan-500'} animate-pulse`}></div>
                   <div className="w-1 h-1 bg-cyan-800 rounded-full"></div>
                </div>
            </div>
        </div>
    );
};
