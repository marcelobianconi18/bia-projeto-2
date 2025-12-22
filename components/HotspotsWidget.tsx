import React, { useEffect, useState } from 'react';
import { Target, TrendingUp, Info, Flame, Crosshair } from 'lucide-react';
import { Provenance } from '../types';
import { isRealOnly } from '../services/env';
import { ProvenanceBadge } from './ProvenanceBadge';

interface Hotspot {
  id: number;
  name: string;
  score: number;
  population: string;
  lat: number;
  lng: number;
  provenance?: Provenance;
}

export const HotspotsWidget: React.FC<{ onSelect?: (lat: number, lng: number) => void }> = ({ onSelect }) => {
  const [items, setItems] = useState<Hotspot[]>([]);

  useEffect(() => {
    if (isRealOnly()) {
      setItems([]);
      return;
    }

    // Dynamic import to allow tree-shaking of SIMULATED data in production builds
    import('../services/mocks/hotspots').then(mod => {
      setItems(mod.STATIC_HOTSPOTS);
    }).catch(err => {
      console.error("Failed to load mock hotspots", err);
      setItems([]);
    });

  }, []);

  const handleSelect = (h: Hotspot) => {
    console.log(`Navegando para o hotspot: ${h.name}`);
    if (onSelect) onSelect(h.lat, h.lng);
  };

  return (
    <div className="glass-panel p-5 rounded-2xl flex flex-col h-full border border-slate-700/50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-slate-300 font-bold text-xs flex items-center gap-2">
          <Flame size={14} className="text-orange-500 animate-pulse" />
          Top 5 Oportunidades
        </h3>
        <Info size={12} className="text-slate-500" />
      </div>

      <ul className="flex-1 space-y-2">
        {items.map((spot, index) => (
          <li
            key={spot.id}
            onClick={() => handleSelect(spot)}
            className={`flex items-center justify-between p-2 rounded-lg transition-all border cursor-pointer ${index === 0
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