import React from 'react';
import { ProvenanceBadge } from './ProvenanceBadge';
import { DataProvenance } from '../types';
import { Flame, Crosshair, TrendingUp } from 'lucide-react';

interface Hotspot {
  id: number;
  name: string;
  score: number;
  population: string;
  lat: number;
  lng: number;
  provenance?: DataProvenance;
}

const MOCK_HOTSPOTS: Hotspot[] = [
  { id: 1, name: 'Centro Cívico', score: 98, population: '12.4k', lat: -25.4178, lng: -49.2667, provenance: { label: 'SIMULATED', source: 'Modelagem local', method: 'heurística', notes: 'Hotspot sintético para demo' } },
  { id: 2, name: 'Vila Mariana', score: 94, population: '8.1k', lat: -23.5891, lng: -46.6350, provenance: { label: 'SIMULATED', source: 'Modelagem local' } },
  { id: 3, name: 'Pinheiros', score: 89, population: '15.2k', lat: -23.5670, lng: -46.7020, provenance: { label: 'SIMULATED', source: 'Modelagem local' } },
  { id: 4, name: 'Itaim Bibi', score: 85, population: '6.7k', lat: -23.5838, lng: -46.6784, provenance: { label: 'SIMULATED', source: 'Modelagem local' } },
  { id: 5, name: 'Jardins', score: 82, population: '10.3k', lat: -23.5663, lng: -46.6673, provenance: { label: 'SIMULATED', source: 'Modelagem local' } },
];

interface HotspotsWidgetProps {
  onSelect?: (lat: number, lng: number) => void;
}

export const HotspotsWidget: React.FC<HotspotsWidgetProps> = ({ onSelect }) => {
  const handleNavigate = (spot: Hotspot) => {
    console.log(`Navegando para o hotspot: ${spot.name}`);
    if (onSelect) {
      onSelect(spot.lat, spot.lng);
    }
  };

  return (
    <div className="glass-panel p-5 rounded-2xl flex flex-col h-full border border-slate-700/50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-slate-300 font-bold text-xs flex items-center gap-2">
          <Flame size={14} className="text-orange-500 animate-pulse" /> 
          Top 5 Oportunidades
        </h3>
        <TrendingUp size={12} className="text-slate-500" />
      </div>

      <ul className="flex-1 space-y-2">
        {MOCK_HOTSPOTS.map((spot, index) => (
          <li 
            key={spot.id}
            onClick={() => handleNavigate(spot)}
            className={`flex items-center justify-between p-2 rounded-lg transition-all border cursor-pointer ${
              index === 0 
                ? 'bg-purple-900/20 border-purple-500/30' 
                : 'bg-slate-800/40 border-transparent hover:border-slate-600'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-black w-4 ${index === 0 ? 'text-yellow-400' : 'text-slate-500'}`}>
                #{spot.id}
              </span>
              <div>
                <p className={`text-xs font-bold ${index === 0 ? 'text-white' : 'text-slate-300'}`}>
                  <span className="inline-flex items-center gap-2">
                    {spot.name}
                    {spot.provenance && <ProvenanceBadge provenance={spot.provenance} />}
                  </span>
                </p>
                <p className="text-[9px] text-slate-500">{spot.population} hab.</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className={`text-xs font-mono font-bold ${spot.score > 90 ? 'text-green-400' : 'text-purple-400'}`}>
                  {spot.score}/100
                </span>
              </div>
              <button 
                className="p-1.5 hover:bg-slate-700 rounded-md transition text-slate-500 hover:text-white"
                title="Focar no mapa"
              >
                <Crosshair size={14} />
              </button>
            </div>
          </li>
        ))}
      </ul>
      
      <div className="mt-3 text-[9px] text-center text-slate-600 uppercase tracking-tighter">
        Baseado em densidade demográfica e calor de busca
      </div>
    </div>
  );
};