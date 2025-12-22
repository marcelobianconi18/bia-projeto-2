
import React, { useEffect, useState, useMemo } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  LayersControl, 
  useMap,
  LayerGroup,
  GeoJSON,
  CircleMarker,
  Tooltip
} from 'react-leaflet';
import L from 'leaflet';
import { MapSettings, TacticalGeoJson, TacticalFeature, IbgeSocioData } from '../types';
import { ProvenanceBadge } from './ProvenanceBadge';
import { Database, ExternalLink, ShieldAlert, Zap } from 'lucide-react';
import { fetchTacticalMesh, IBGE_REGISTRY, isInsideBrazil } from '../services/ibgeService';

const MapController = ({ center, zoom, setMapInstance, onZoomChange }: { 
  center: [number, number], 
  zoom: number, 
  setMapInstance?: (m: L.Map) => void,
  onZoomChange?: (z: number) => void 
}) => {
  const map = useMap();
  useEffect(() => { 
    if (setMapInstance) setMapInstance(map); 
    map.on('zoomend', () => onZoomChange?.(map.getZoom())); 
  }, [map]);
  useEffect(() => { map.flyTo(center, zoom, { duration: 1.5 }); }, [center, zoom]);
  return null;
};

interface BiaWarRoomMapProps {
  center: [number, number];
  settings: MapSettings;
  setMapInstance?: (m: L.Map) => void;
  hotspots?: any[];
  selectedHotspotId?: number | null;
  onSelectFeature?: (feature: TacticalFeature) => void;
  cityName?: string;
  realIbgeData?: IbgeSocioData | null;
}

export const BiaWarRoomMap: React.FC<BiaWarRoomMapProps> = ({
  center,
  settings,
  setMapInstance,
  selectedHotspotId,
  onSelectFeature,
  cityName,
  realIbgeData
}) => {
  const [meshData, setMeshData] = useState<TacticalGeoJson | null>(null);
  const [currentZoom, setCurrentZoom] = useState(settings.zoom || 13);

  // Só buscamos a malha de quarteirões se estivermos em zoom de proximidade
  useEffect(() => {
    if (currentZoom >= 11) {
      fetchTacticalMesh(center, cityName || "Região", realIbgeData).then(setMeshData);
    } else {
      setMeshData(null);
    }
  }, [center, cityName, realIbgeData, currentZoom]);

  const isAbroad = !isInsideBrazil(center[0], center[1]);

  const getStyle = (feature: any) => {
    const volume = feature.properties.volume;
    const color = volume > 80 ? '#39ff14' : 
                  volume > 60 ? '#00f3ff' : 
                  volume > 40 ? '#bc13fe' : 
                  volume > 20 ? '#ff0055' : '#1e293b';

    return {
      fillColor: color,
      weight: 1,
      opacity: 0.3,
      color: color,
      fillOpacity: 0.15
    };
  };

  const onEachFeature = (feature: any, layer: L.Layer) => {
    layer.on({
      click: (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectFeature?.(feature);
      },
      mouseover: (e: any) => {
        const l = e.target;
        l.setStyle({ fillOpacity: 0.5, weight: 2, color: '#ffffff' });
      },
      mouseout: (e: any) => {
        const l = e.target;
        l.setStyle(getStyle(feature));
      }
    });
  };

  return (
    <div className="h-full w-full bg-[#020617] relative overflow-hidden font-sans">
      <div className="absolute inset-0 pointer-events-none z-[400] overflow-hidden opacity-5">
         <div className="absolute top-1/2 left-1/2 w-[250%] h-[250%] -translate-x-1/2 -translate-y-1/2 animate-radar-sweep bg-[conic-gradient(from_0deg,transparent_0deg,transparent_330deg,rgba(57,255,20,0.3)_360deg)]"></div>
      </div>

      <MapContainer 
        center={center} 
        zoom={settings.zoom} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <MapController center={center} zoom={settings.zoom} setMapInstance={setMapInstance} onZoomChange={setCurrentZoom}/>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

        <LayersControl position="topright">
          <LayersControl.Overlay checked name="🏛️ Malha Tática (Simulada)">
            <LayerGroup>
              {meshData && (
                <GeoJSON 
                  key={`mesh-neon-${center[0]}-${center[1]}`}
                  data={meshData as any} 
                  style={getStyle} 
                  onEachFeature={(feature: any, layer: any) => {
                    onEachFeature(feature, layer);
                    try {
                      const prov = feature.properties?.provenance;
                      const tooltipHtml = `<div style="font-family:monospace;font-size:11px;color:#fff">` +
                        `<div class=\"font-black\">SETOR_${feature.properties?.geocode}</div>` +
                        `<div style=\"color:#9ca3af;margin-top:6px;\">Match: ${feature.properties?.volume}%</div>` +
                        (prov ? `<div style=\"margin-top:6px; font-size:10px; color:#d1fae5\">Fonte: ${prov.source} (${prov.label})</div>` : '') +
                        `</div>`;
                      layer.bindTooltip(tooltipHtml, { sticky: true });
                    } catch (e) { /* ignore */ }
                  }}
                />
              )}
            </LayerGroup>
          </LayersControl.Overlay>

          <LayersControl.Overlay checked name="🔵 Focos de Audiência">
            <LayerGroup>
               {/* Se o zoom for baixo, mostramos apenas marcadores de clusters macro */}
               {(currentZoom < 11 ? [] : meshData?.features.filter(f => f.properties.volume > 50) || []).map(f => {
                  const centroid = L.geoJSON(f.geometry).getBounds().getCenter();
                  return (
                    <CircleMarker 
                      key={`centroid-${f.properties.id}`}
                      center={centroid}
                      radius={f.properties.volume / 10}
                      pathOptions={{
                        fillColor: '#00f3ff',
                        fillOpacity: 0.4,
                        color: '#00f3ff',
                        weight: 2,
                        className: 'neon-glow'
                      }}
                    >
                       <Tooltip sticky>
                          <div className="p-3 font-mono text-[10px] bg-slate-900 text-white border border-cyan-500 rounded shadow-xl">
                             <span className="font-black uppercase">SETOR_{f.properties.geocode}</span>
                             <div className="mt-2">
                                <p className="text-cyan-400">Match: {f.properties.volume}%</p>
                                <p className="text-slate-400">Renda Est.: R$ {f.properties.income.toFixed(0)}</p>
                             {f.properties.provenance && (
                               <p className="text-[10px] mt-2 text-slate-300">Fonte: {f.properties.provenance.source} • {f.properties.provenance.label}</p>
                             )}
                             </div>
                          </div>
                       </Tooltip>
                    </CircleMarker>
                  )
               })}
            </LayerGroup>
          </LayersControl.Overlay>
        </LayersControl>
      </MapContainer>

      {/* FOOTER RASTRABILIDADE */}
      {/* LEGEND - Provenance */}
      <div className="absolute bottom-6 right-6 z-[1000] flex flex-col gap-2 pointer-events-auto">
        <div className="bg-black/70 px-3 py-2 rounded-xl border border-white/10 flex items-center gap-3">
          <div className="flex flex-col text-[10px] text-slate-300">
            <div className="flex items-center gap-2"><span className="text-slate-400">Malha Tática</span> <ProvenanceBadge provenance={{ label: 'SIMULATED', source: 'Modelagem local', method: 'grid/jitter' }} /></div>
            <div className="flex items-center gap-2 mt-1"><span className="text-slate-400">IBGE Município</span> <ProvenanceBadge provenance={{ label: 'REAL', source: 'IBGE/SIDRA' }} /></div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-6 left-6 z-[1000] flex flex-col gap-2 pointer-events-none">
          {isAbroad ? (
             <div className="bg-red-600/90 px-4 py-2.5 rounded-xl border border-white/30 flex items-center gap-3 backdrop-blur-md shadow-2xl">
                <ShieldAlert size={16} className="text-white" />
                <span className="text-white font-black text-[9px] uppercase tracking-widest">FORA DE JURISDIÇÃO</span>
             </div>
          ) : (
            <div className="bg-slate-950/90 px-4 py-2.5 rounded-xl border border-cyan-500/30 flex items-center gap-3 backdrop-blur-md shadow-2xl pointer-events-auto">
               <Database size={16} className="text-cyan-400" />
               <div className="flex flex-col">
                  <span className="text-slate-500 text-[8px] font-black uppercase tracking-widest leading-none mb-1">Truth Anchor IBGE</span>
                  <div className="flex items-center gap-2">
                     <span className="text-white font-bold text-[10px] uppercase tracking-tighter">
                        {(cityName || "Região").toUpperCase()} // SCAN_ACTIVE
                     </span>
                  </div>
               </div>
            </div>
          )}
      </div>

      <style>{`
        @keyframes radar-sweep { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
        .animate-radar-sweep { animation: radar-sweep 12s linear infinite; }
        .neon-glow { filter: drop-shadow(0 0 5px #00f3ff); }
      `}</style>
    </div>
  );
};
