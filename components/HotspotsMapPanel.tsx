import React, { useMemo } from 'react';
import L from 'leaflet';
import { ChevronRight, Flame, MapPin } from 'lucide-react';
import { ProvenanceBadge } from './ProvenanceBadge';

interface HotspotsMapPanelProps {
  map: L.Map | null;
  onNavigate?: (lat: number, lng: number) => void;
}

export const HotspotsMapPanel: React.FC<HotspotsMapPanelProps> = ({ map, onNavigate }) => {
  // Use a fallback center if map is not yet initialized or getCenter returns null
  const currentCenter = useMemo(() => {
    try {
      if (map && typeof map.getCenter === 'function') {
        const center = map.getCenter();
        if (center && typeof center.lat === 'number' && typeof center.lng === 'number') {
          return { lat: center.lat, lng: center.lng };
        }
      }
    } catch (e) {
      console.warn("Could not get map center, using fallback.");
    }
    return { lat: -25.4178, lng: -49.2667 };
  }, [map]);

  const currentZoom = map ? map.getZoom() : 13;

  const isRealOnly = import.meta.env.VITE_REAL_ONLY === 'true';

  const hotspots = useMemo(() => {
    if (isRealOnly) return []; // REAL_ONLY: força lista vazia

    const names = [
      "Centro Cívico", "Vila Mariana", "Pinheiros", "Itaim Bibi", "Jardins",
      "Moema", "Brooklin", "Vila Olimpia", "Morumbi", "Perdizes",
      "Higienópolis", "Bela Vista", "Consolação", "Liberdade", "Santana",
      "Tatuapé", "Mooca", "Ipiranga", "Aclimação", "Vila Madalena"
    ];

    return Array.from({ length: 20 }, (_, i) => {
      const spread = currentZoom > 12 ? 0.04 : currentZoom > 8 ? 0.3 : 3;

      const offsetLat = (Math.sin(i * 0.8) * spread);
      const offsetLng = (Math.cos(i * 0.8) * spread);

      return {
        id: i + 1,
        rank: i + 1,
        name: names[i % names.length],
        score: 99 - i,
        lat: (currentCenter?.lat || 0) + offsetLat,
        lng: (currentCenter?.lng || 0) + offsetLng,
        type: currentZoom > 10 ? 'Bairro' : currentZoom > 6 ? 'Cidade' : 'Macro-Região'
        , provenance: { label: 'DERIVED', source: 'Modelagem local', method: 'heurística' }
      };
    });
  }, [currentCenter, currentZoom, isRealOnly]);

  const handleItemClick = (lat: number, lng: number) => {
    if (lat === undefined || lng === undefined) return;
    if (onNavigate) {
      onNavigate(lat, lng);
    } else if (map) {
      map.flyTo([lat, lng], map.getZoom(), { duration: 2, easeLinearity: 0.3 });
    }
  };

  return (
    <div
      className="bg-slate-950/80 backdrop-blur-md rounded-2xl w-80 flex flex-col overflow-hidden border border-white/10 shadow-2xl pointer-events-auto"
      style={{ maxHeight: 'calc(100vh - 350px)' }}
    >
      <div className="p-5 border-b border-white/5 bg-slate-900/80 backdrop-blur-2xl">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
            <Flame size={14} className="text-orange-500 glow-item" />
            Top 20 Zonas Quentes
          </h3>
          <div className="flex items-center gap-1.5 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></div>
            <span className="text-purple-400 text-[9px] font-black uppercase">LIVE</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase">
          <MapPin size={10} />
          <span>Nível: {currentZoom > 10 ? 'Micro-Distrito' : currentZoom > 6 ? 'Metrópole' : 'Regional'}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5 space-y-1.5 bg-slate-950/40">
        {hotspots.map((spot) => (
          <button
            key={spot.id}
            onClick={() => handleItemClick(spot.lat, spot.lng)}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition group text-left border border-transparent hover:border-white/5"
          >
            <div className="flex items-center gap-4">
              <span className={`text-[10px] font-black w-7 h-7 flex items-center justify-center rounded-lg transition-all ${spot.rank === 1 ? 'bg-yellow-500 text-slate-950 shadow-[0_0_15px_rgba(234,179,8,0.4)]' :
                spot.rank === 2 ? 'bg-slate-300 text-slate-950 shadow-[0_0_15px_rgba(203,213,225,0.4)]' :
                  spot.rank === 3 ? 'bg-orange-600 text-white shadow-[0_0_15px_rgba(234,88,12,0.4)]' :
                    'bg-slate-800 text-slate-400'
                }`}>
                {spot.rank}
              </span>
              <div>
                <p className={`text-xs font-bold transition-colors ${spot.rank <= 3 ? 'text-white' : 'text-slate-300'} group-hover:text-white flex items-center gap-2`}>
                  {spot.name}
                  {spot.provenance ? (
                    <span className="ml-1 inline-block">
                      <ProvenanceBadge provenance={spot.provenance} />
                    </span>
                  ) : null}
                </p>
                <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">{spot.type}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className={`text-[11px] font-mono font-black ${spot.score > 90 ? 'text-green-400' : 'text-purple-400'}`}>
                  {spot.score}%
                </span>
              </div>
              <ChevronRight size={12} className="text-slate-700 group-hover:text-slate-400 transition-transform group-hover:translate-x-0.5" />
            </div>
          </button>
        ))}
      </div>

      <div className="p-3 border-t border-white/5 bg-slate-900/60">
        <p className="text-[9px] text-slate-600 uppercase font-black tracking-[0.1em] text-center">
          Engine BIA • v2.0 Tactical Map
        </p>
      </div>
    </div>
  );
};
