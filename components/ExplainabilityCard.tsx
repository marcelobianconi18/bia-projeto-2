import React from 'react';
import { GeminiAnalysis } from '../types';

interface Props { analysis?: GeminiAnalysis | null }

export const ExplainabilityCard: React.FC<Props> = ({ analysis }) => {
  if (!analysis) return null;
  const { score, confidence, reasons, risks, limitations } = analysis;
  if (!score && !confidence && !reasons) return null;

  return (
    <div className="bg-black/90 rounded border border-white/10 p-4 pointer-events-auto shadow-2xl">
      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Explicabilidade</h4>
      <div className="flex items-baseline gap-3">
        <div className="text-3xl font-black text-[#39ff14]">{score ?? '–'}</div>
        <div className="text-[10px] text-slate-400">Score</div>
        {confidence !== undefined && (
          <div className="ml-auto text-[10px] text-slate-400">Confiança: <span className="font-black text-white">{confidence}%</span></div>
        )}
      </div>

      {reasons && reasons.length > 0 && (
        <ul className="mt-3 text-[10px] text-slate-300 space-y-1">
          {reasons.slice(0,3).map((r, i) => (
            <li key={i} className="flex items-start gap-2"><span className="text-[#39ff14] font-black mr-1">{i+1}.</span>{r}</li>
          ))}
        </ul>
      )}

      {risks && risks.length > 0 && (
        <div className="mt-3 text-[9px] text-amber-300">
          <div className="font-black uppercase text-[9px] mb-1">Riscos</div>
          <ul className="list-disc ml-4">
            {risks.slice(0,2).map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}

      {limitations && limitations.length > 0 && (
        <div className="mt-3 text-[9px] text-slate-500">
          <div className="font-black uppercase text-[9px] mb-1">Limitações</div>
          <ul className="list-disc ml-4">
            {limitations.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
};
