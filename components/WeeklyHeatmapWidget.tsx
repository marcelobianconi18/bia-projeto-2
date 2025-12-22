
import React, { useState } from 'react';
import { WeeklyHeatmap } from '../types';
import { ProvenanceBadge } from './ProvenanceBadge';
import { Lock, Info, Calendar } from 'lucide-react';

interface Props {
    data: WeeklyHeatmap[];
}

export const WeeklyHeatmapWidget: React.FC<Props> = ({ data }) => {
    const [mode, setMode] = useState<'DIGITAL' | 'PHYSICAL'>('DIGITAL');

    const currentData = data.find(d => d.mode === mode) || data[0]; // Fallback
    const unavailable = !currentData || currentData.provenance.label === 'UNAVAILABLE';

    return (
        <div className="bg-surface2 p-5 rounded-2xl flex flex-col h-full border border-app relative overflow-hidden">

            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-app font-bold text-xs flex items-center gap-2">
                        <Calendar size={14} className="text-blue-500" />
                        Heatmap Semanal (7x24)
                    </h3>
                    <p className="text-[10px] text-muted mt-1">
                        Intensidade de {mode === 'DIGITAL' ? 'Tráfego Digital' : 'Visitas Físicas'}
                    </p>
                </div>

                {/* Toggle */}
                <div className="flex bg-surface rounded-lg p-1 border border-app">
                    <button
                        onClick={() => setMode('DIGITAL')}
                        className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${mode === 'DIGITAL' ? 'bg-blue-600 text-white shadow-lg' : 'text-muted2 hover:text-muted'}`}
                    >
                        Digital
                    </button>
                    <button
                        onClick={() => setMode('PHYSICAL')}
                        className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${mode === 'PHYSICAL' ? 'bg-orange-500 text-white shadow-lg' : 'text-muted2 hover:text-muted'}`}
                    >
                        Físico
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col justify-center items-center">
                {unavailable ? (
                    <div className="text-center p-6 bg-surface/30 rounded-xl border border-dashed border-app w-full">
                        <Lock size={24} className="text-muted2 mx-auto mb-3" />
                        <h4 className="text-muted font-bold text-xs mb-1">Dados Indisponíveis</h4>
                        <p className="text-[10px] text-muted2 mb-3 max-w-[200px] mx-auto">
                            Ainda não há fonte {mode === 'DIGITAL' ? 'GA4/Ads' : 'Mobility'} conectada em modo REAL.
                        </p>
                        {currentData && <ProvenanceBadge provenance={currentData.provenance} />}
                    </div>
                ) : (
                    <div className="w-full h-full grid grid-cols-7 gap-1">
                        {/* Placeholder Grid rendering if we had data, currently stub returns unavailable so this branch effectively dead code in REAL_ONLY */}
                        <div className="col-span-7 text-center text-xs text-muted2">
                            Heatmap Grid Visualization Placeholder
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Info */}
            {currentData && !unavailable && (
                <div className="mt-4 pt-4 border-t border-app flex justify-between items-end">
                    <div className="text-[10px] text-muted">
                        Piores horários: <span className="text-app font-mono">—</span>
                    </div>
                    <ProvenanceBadge provenance={currentData.provenance} />
                </div>
            )}

            {/* Manual Provenance if unavailable (displayed inside the lock box above, but creating bottom alignment for consistency) */}
        </div>
    );
};
