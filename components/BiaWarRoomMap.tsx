
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl, LayerGroup, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { BriefingData, TacticalGeoJson, IbgeSocioData, GeoSignals } from '../types';
import { fetchTacticalMesh } from '../services/ibgeService';
import { isRealOnly } from '../services/env';

// Leaflet Icon fix
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
const competitorIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle map center updates
const RecenterAutomatically = ({ lat, lng, zoom }: { lat: number; lng: number, zoom?: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], zoom || map.getZoom());
  }, [lat, lng, zoom, map]);
  return null;
};

interface BiaWarRoomMapProps {
  center: [number, number];
  zoom?: number;
  settings: {
    showIncome: boolean;
    showLogistics: boolean;
    showCompetitors: boolean;
    showHeatmap?: boolean;
    showIsochrone?: boolean;
    showTacticalMesh?: boolean;
    showHotspots?: boolean;
  };
  className?: string;
  briefingData: BriefingData;
  setMapInstance?: (map: L.Map | null) => void;
  selectedHotspotId?: number | null;
  onSelectFeature?: (featureId: string) => void;
  cityName?: string; // e.g. "Curitiba - PR"
  realIbgeData?: IbgeSocioData | null;
  geoSignals?: GeoSignals;
}

export const BiaWarRoomMap: React.FC<BiaWarRoomMapProps> = ({
  center,
  zoom,
  settings,
  className,
  briefingData,
  setMapInstance,
  selectedHotspotId,
  onSelectFeature,
  cityName,
  realIbgeData,
  geoSignals
}) => {
  const isRealOnlyMode = isRealOnly();
  const [meshData, setMeshData] = useState<TacticalGeoJson | null>(null);
  const [currentZoom, setCurrentZoom] = useState(zoom || 13);

  const showMesh = settings.showTacticalMesh ?? settings.showIncome;

  useEffect(() => {
    if (isRealOnlyMode || !showMesh) {
      setMeshData(null);
      return;
    }

    let alive = true;
    fetchTacticalMesh(center, cityName || "Região", realIbgeData || null)
      .then((mesh) => {
        if (alive) setMeshData(mesh);
      })
      .catch((err) => {
        console.warn("Failed to load tactical mesh", err);
        if (alive) setMeshData(null);
      });

    return () => {
      alive = false;
    };
  }, [center, cityName, isRealOnlyMode, realIbgeData, showMesh]);

  // Heatmap Layer Effect
  useEffect(() => {
    // Phase 1 Real Data: Heatmaps disabled in REAL_ONLY until we have real density data
  }, [settings.showHeatmap, center]);


  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    // Check initial state
    setIsLightMode(document.documentElement.classList.contains('theme-light'));

    // Observer for class changes on html element
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setIsLightMode(document.documentElement.classList.contains('theme-light'));
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  const tileUrl = isLightMode
    ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

  const attribution = isLightMode
    ? '&copy; <a href="https://carto.com/">CartoDB</a> Positron'
    : '&copy; <a href="https://carto.com/">CartoDB</a> Dark Matter';

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={center}
        zoom={currentZoom}
        scrollWheelZoom={true}
        className="h-full w-full rounded-xl z-0"
        ref={setMapInstance}
        style={{ height: "100%", width: "100%", minHeight: "100%" }}
      >
        <RecenterAutomatically lat={center[0]} lng={center[1]} zoom={zoom} />

        <LayersControl position="topright">
          {/* GeoSignals Polygons (REAL) */}
          {(!isRealOnlyMode || (geoSignals?.polygons && geoSignals.polygons.length > 0)) && (
            <LayersControl.Overlay checked name="🗺️ Limites IBGE (Real)">
              <LayerGroup>
                {geoSignals?.polygons.filter(p => p.provenance.label === 'REAL').map(poly => {
                  // Simple Choropleth based on Population
                  const pop = poly.properties.population || 0;
                  const getColor = (p: number) => {
                    if (p > 500000) return '#b91c1c'; // Red-700
                    if (p > 200000) return '#c2410c'; // Orange-700
                    if (p > 100000) return '#ca8a04'; // Yellow-600
                    if (p > 50000) return '#65a30d'; // Lime-600
                    return '#15803d'; // Green-700
                  };

                  return (
                    <GeoJSON
                      key={poly.id}
                      data={poly.geometry}
                      style={{
                        color: isLightMode ? '#64748b' : '#1e293b',
                        weight: 1,
                        fillColor: getColor(pop),
                        fillOpacity: 0.4,
                      }}
                      onEachFeature={(feature, layer) => {
                        layer.bindTooltip(`
                                <div class="font-bold text-xs">
                                    ${poly.properties.name || 'Setor IBGE'}
                                    <br/>
                                    <span class="text-[10px] text-gray-500">
                                        Pop: ${poly.properties.population?.toLocaleString('pt-BR') || 'N/A'}
                                        <br/>
                                        Renda: ${poly.properties.income ? 'R$ ' + poly.properties.income : 'INDISPONÍVEL (IBGE)'}
                                    </span>
                                    <br/>
                                    <span class="inline-block px-1 rounded bg-green-600 text-white text-[9px] mt-1">REAL DATA (IBGE)</span>
                                </div>
                             `, { sticky: true, direction: 'top' });
                      }}
                    />
                  );
                })}

                {/* Empty State for REAL ONLY if no polygons */}
                {isRealOnlyMode && (!geoSignals?.polygons || geoSignals.polygons.length === 0) && (
                  // We don't render anything on map, but UI should show UNAVAILABLE.
                  // Map component logic handles visual layers only.
                  null
                )}
              </LayerGroup>
            </LayersControl.Overlay>
          )}

          {/* Legacy/Simulated Layers (Hidden in Real Only via geoSignals flows/hotspots check or explicit isRealOnly) */}
          {/* NOTE: With GeoSignals, we prefer using that model. If not present, we check legacy settings if NOT strict. */}

          {isRealOnlyMode && (
            <LayersControl.Overlay checked name="⚠️ Modo Real (Simulação Desativada)">
              <LayerGroup>
                {/* Placeholder for real/strict mode feedback if needed */}
              </LayerGroup>
            </LayersControl.Overlay>
          )}

          {/* Simulated Competitors (Only if NOT Real Only) */}
          {!isRealOnlyMode && settings.showCompetitors && (
            <LayersControl.Overlay checked name="📍 Concorrentes (Sim)">
              <LayerGroup>
                <Marker position={[center[0] + 0.002, center[1] - 0.002]} icon={competitorIcon}>
                  <Popup>
                    <div className="text-slate-900 font-bold">Concorrente A</div>
                    <div className="text-slate-600 text-xs">Alto fluxo detectado</div>
                  </Popup>
                </Marker>
                <Marker position={[center[0] - 0.003, center[1] + 0.001]} icon={competitorIcon}>
                  <Popup>
                    <div className="text-slate-900 font-bold">Concorrente B</div>
                    <div className="text-slate-600 text-xs">Público-alvo similar</div>
                  </Popup>
                </Marker>
              </LayerGroup>
            </LayersControl.Overlay>
          )}

          {/* Tactical Mesh (Only if NOT Real Only) */}
          {!isRealOnlyMode && meshData && (
            <LayersControl.Overlay checked={settings.showTacticalMesh} name="📊 Malha Tática (Sim)">
              <GeoJSON
                data={meshData}
                style={(feature) => ({
                  fillColor: (feature?.properties?.volume || 0) > 80 ? '#ef4444' : '#3b82f6',
                  weight: 1,
                  opacity: 0.3,
                  color: 'white',
                  fillOpacity: 0.4
                })}
                onEachFeature={(feature, layer) => {
                  layer.on({
                    click: () => onSelectFeature && onSelectFeature(feature.properties.id)
                  });
                  layer.bindTooltip(`Setor Tático #${feature.properties.id} (Score: ${feature.properties.volume})`);
                }}
              />
            </LayersControl.Overlay>
          )}

        </LayersControl>

        <TileLayer
          attribution={attribution}
          url={tileUrl}
        />
      </MapContainer>

      {/* Legend / Info Overlay */}
      <div className={`absolute bottom-5 right-5 p-3 rounded-lg border text-xs z-[1000] ${isLightMode ? 'bg-white/90 border-slate-200 text-slate-700' : 'bg-slate-900/90 border-slate-700 text-slate-300'
        }`}>
        <h4 className={`font-bold mb-1 flex items-center gap-2 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
          🚦 GeoSignals Phase 1
          {isRealOnlyMode && <span className="bg-green-600 text-white px-1.5 py-0.5 rounded text-[9px]">REAL ONLY</span>}
        </h4>
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-3 h-3 opacity-20 border ${isLightMode ? 'bg-emerald-500 border-emerald-500' : 'bg-[#39ff14] border-[#39ff14]'}`}></div>
          <span>IBGE Malhas (Oficial)</span>
        </div>
        {isRealOnlyMode && (
          <div className={`text-[10px] mt-1 max-w-[150px] ${isLightMode ? 'text-slate-500' : 'text-gray-400'}`}>
            * Dados simulados (Hotspots/Flows) desativados para compliance.
          </div>
        )}
      </div>
    </div>
  );
};
