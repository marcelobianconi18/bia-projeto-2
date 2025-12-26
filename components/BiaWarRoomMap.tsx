
import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, useMap, LayersControl, LayerGroup, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { BriefingData, TacticalGeoJson, IbgeSocioData, GeoSignals } from '../types';
import { fetchTacticalMesh } from '../services/ibgeService';
import { isRealOnly } from '../services/env';
import { buildQuantileBreaks, getColorForValue, extractChoroplethValue, formatNumberBr } from '../services/mapProtocol';

// Custom Icons
const competitorIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: markerShadow,
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

const MapZoomWatcher = ({ onZoomChange }: { onZoomChange: (z: number) => void }) => {
  const map = useMap();
  useEffect(() => {
    const handler = () => onZoomChange(map.getZoom());
    handler();
    map.on('zoomend', handler);
    return () => map.off('zoomend', handler);
  }, [map, onZoomChange]);
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
  briefingData?: BriefingData;
  setMapInstance?: (map: L.Map | null) => void;
  selectedHotspotId?: number | null;
  onSelectFeature?: (featureId: string) => void;
  cityName?: string; // e.g. "Curitiba - PR"
  realIbgeData?: IbgeSocioData | null;
  geoSignals?: GeoSignals;
  hotspots?: any[];
}

export const BiaWarRoomMap: React.FC<BiaWarRoomMapProps> = ({
  center,
  zoom,
  settings,
  className,
  setMapInstance,
  selectedHotspotId,
  onSelectFeature,
  cityName,
  realIbgeData,
  geoSignals,
  hotspots
}) => {
  const isRealOnlyMode = isRealOnly();
  const [meshData, setMeshData] = useState<TacticalGeoJson | null>(null);
  const [currentZoom, setCurrentZoom] = useState(zoom || 13);
  const [selectedSector, setSelectedSector] = useState<{
    id: string;
    name: string;
    population: number | null;
    income: number | null;
    audience: number | null;
    provenance: string;
  } | null>(null);

  const signalPolygons = geoSignals?.polygons || [];
  const showMesh = (settings.showTacticalMesh ?? settings.showIncome) && signalPolygons.length === 0;

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

  // Tile server selection: prefer a local TileServer (OpenMapTiles + tileserver-gl)
  // Set `VITE_TILESERVER_URL` in your .env (e.g. http://localhost:8080/styles/osm-bright/{z}/{x}/{y}.png)
  const viteEnv = (import.meta as any)?.env || {};
  const tileServerUrl = viteEnv.VITE_TILESERVER_URL || null;

  const defaultLight = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  const defaultDark = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

  const tileUrl = tileServerUrl
    ? tileServerUrl
    : (signalPolygons.length > 0 || isLightMode ? defaultLight : defaultDark);

  const attribution = tileServerUrl
    ? '&copy; <a href="https://openmaptiles.org">OpenMapTiles</a> &amp; <a href="https://www.openstreetmap.org">OSM</a>'
    : (signalPolygons.length > 0 || isLightMode)
      ? '&copy; <a href="https://carto.com/">CartoDB</a> Voyager'
      : '&copy; <a href="https://carto.com/">CartoDB</a> Dark Matter';


  const showPolygons = settings.showIncome !== false;

  const isPolygonVisible = (poly: GeoSignals['polygons'][number]) => {
    const level = String(poly.properties?.adminLevel || '').toLowerCase();
    if (level === 'estado' || level === 'state') return currentZoom <= 5;
    if (level === 'municipio') return currentZoom >= 6 && currentZoom <= 10;
    if (level === 'setor') return currentZoom >= 11;
    if (level === 'custom') return true;
    return currentZoom >= 11;
  };

  const visiblePolygons = signalPolygons.filter(isPolygonVisible);

  const choroplethBreaks = useMemo(() => {
    const source = visiblePolygons.length > 0 ? visiblePolygons : signalPolygons;
    const values = source
      .map((p) => extractChoroplethValue(p.properties))
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    return buildQuantileBreaks(values);
  }, [signalPolygons, visiblePolygons]);

  const rootClassName = ['relative', 'h-full', 'w-full', 'min-h-0', 'min-w-0', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClassName}>
      <MapContainer
        center={center}
        zoom={currentZoom}
        scrollWheelZoom={true}
        className="h-full w-full rounded-xl z-0"
        ref={setMapInstance}
        style={{ height: "100%", width: "100%", minHeight: "100%" }}
      >
        <MapZoomWatcher onZoomChange={setCurrentZoom} />
        <RecenterAutomatically lat={center[0]} lng={center[1]} zoom={zoom} />

        <LayersControl position="topright">
          {/* IBGE Sectors / Polygons */}
          {showPolygons && visiblePolygons.length > 0 && (
            <LayersControl.Overlay checked name="🧩 Setores IBGE (Censo)">
              <LayerGroup>
                {visiblePolygons.map((poly) => {
                  const pop = typeof poly.properties.population === 'number' ? poly.properties.population : null;
                  const audience = poly.properties.targetAudienceEstimate;
                  const label = poly.provenance?.label || 'REAL';
                  const choroplethValue = extractChoroplethValue(poly.properties);
                  const fillColor = getColorForValue(
                    choroplethValue,
                    choroplethBreaks,
                    isLightMode ? '#e2e8f0' : '#334155'
                  );
                  return (
                    <GeoJSON
                      key={poly.properties.id}
                      data={poly.geometry}
                      style={{
                        color: '#1f2937',
                        weight: 0.7,
                        fillColor,
                        fillOpacity: 0.6,
                      }}
                      onEachFeature={(_, layer) => {
                        const popText = typeof pop === 'number' ? formatNumberBr(pop) : 'N/A';
                        const inc = poly.properties.income;
                        const incomeText = typeof inc === 'number' ? `R$ ${inc.toFixed(0)}` : 'INDISPONÍVEL';
                        const audienceText = typeof audience === 'number' ? formatNumberBr(audience) : 'N/A';
                        const popupHtml = `
                          <div class="font-bold text-xs">
                            ${poly.properties.name || 'Setor IBGE'}
                            <br/>
                            <span class="text-[10px] text-gray-500">
                              Pop: ${popText}
                              <br/>
                              Renda: ${incomeText}
                              <br/>
                              Público-alvo: ${audienceText}
                            </span>
                            <br/>
                            <span class="inline-block px-1 rounded bg-slate-900 text-white text-[9px] mt-1">${label}</span>
                          </div>
                        `;
                        layer.bindTooltip(popupHtml, { sticky: true, direction: 'top' });
                        layer.bindPopup(popupHtml);
                        layer.on('click', () => {
                          if (onSelectFeature) onSelectFeature(poly.properties.id);
                          setSelectedSector({
                            id: poly.properties.id,
                            name: poly.properties.name || 'Setor IBGE',
                            population: typeof pop === 'number' ? pop : null,
                            income: typeof inc === 'number' ? inc : null,
                            audience: typeof audience === 'number' ? audience : null,
                            provenance: String(label || 'REAL')
                          });
                        });
                      }}
                    />
                  );
                })}
              </LayerGroup>
            </LayersControl.Overlay>
          )}

          {/* Hotspots and mobility flows removed by request (kept data pipelines). */}

          {/* Legacy/Simulated Layers (Hidden in Real Only via geoSignals flows/hotspots check or explicit isRealOnly) */}
          {/* NOTE: With GeoSignals, we prefer using that model. If not present, we check legacy settings if NOT strict. */}

          {isRealOnlyMode && (
            <LayersControl.Overlay checked name="⚠️ Modo Real (Simulação Desativada)">
              <LayerGroup>
                {/* Placeholder for real/strict mode feedback if needed */}
              </LayerGroup>
            </LayersControl.Overlay>
          )}

          {/* Simulated competitor markers removed for a cleaner map */}

          {/* Tactical mesh rendering removed to eliminate grid/lines on the map; data fetching still intact */}

        </LayersControl>

        <TileLayer
          attribution={attribution}
          url={tileUrl}
        />
      </MapContainer>

      {/* Selected sector panel */}
      {selectedSector && (
        <div className={`absolute top-5 right-5 w-[260px] rounded-xl border p-4 text-xs z-[1001] ${isLightMode ? 'bg-white/95 border-slate-200 text-slate-700' : 'bg-slate-900/95 border-slate-700 text-slate-200'}`}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Setor Selecionado</div>
              <div className="text-sm font-bold">{selectedSector.name}</div>
            </div>
            <button
              onClick={() => setSelectedSector(null)}
              className="text-[10px] px-2 py-1 rounded border border-transparent hover:border-slate-400/40"
            >
              Fechar
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase text-muted">População</span>
              <span className="font-bold">{selectedSector.population ? formatNumberBr(selectedSector.population) : 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase text-muted">Renda Média</span>
              <span className="font-bold">{typeof selectedSector.income === 'number' ? `R$ ${selectedSector.income.toFixed(0)}` : 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase text-muted">Público-alvo</span>
              <span className="font-bold">{selectedSector.audience ? formatNumberBr(selectedSector.audience) : 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase text-muted">Proveniência</span>
              <span className="font-bold">{selectedSector.provenance}</span>
            </div>
          </div>
        </div>
      )}

      {/* Legend / Info Overlay */}
      <div className={`absolute bottom-5 right-5 p-3 rounded-lg border text-xs z-[1000] ${isLightMode ? 'bg-white/90 border-slate-200 text-slate-700' : 'bg-slate-900/90 border-slate-700 text-slate-300'
        }`}>
        <h4 className={`font-bold mb-2 flex items-center gap-2 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
          Legendas
          {isRealOnlyMode && <span className="bg-green-600 text-white px-1.5 py-0.5 rounded text-[9px]">REAL ONLY</span>}
        </h4>
        <div className="text-[10px] uppercase font-bold mb-2">
          Zoom: {currentZoom} • Estados 0-5 • Municípios 6-10 • Setores 11+
        </div>
        {choroplethBreaks.length > 0 && (
          <>
            <div className="text-[10px] font-bold uppercase mb-1">Censo 2022 · População</div>
            {choroplethBreaks.map((breakItem, idx) => {
              const min = breakItem.min;
              const max = breakItem.max;
              const color = breakItem.color;
              return (
                <div key={`pop_${idx}`} className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded border" style={{ background: color, borderColor: color }}></div>
                  <span>{formatNumberBr(min)} - {formatNumberBr(max)}</span>
                </div>
              );
            })}
          </>
        )}
        {!isRealOnlyMode && (
          <>
            <div className="text-[10px] font-bold uppercase mt-2 mb-1">Fluxo de Veículos</div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-0.5" style={{ background: '#22c55e' }}></div>
              <span>Baixo</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-0.5" style={{ background: '#f59e0b' }}></div>
              <span>Médio</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-0.5" style={{ background: '#ef4444' }}></div>
              <span>Alto</span>
            </div>
            <div className="text-[10px] font-bold uppercase mt-2 mb-1">Hotspots</div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: '#1e40af' }}></div>
              <span>Concentração de público</span>
            </div>
          </>
        )}
        {isRealOnlyMode && (
          <div className={`text-[10px] mt-2 max-w-[180px] ${isLightMode ? 'text-slate-500' : 'text-gray-400'}`}>
            * Hotspots/fluxos simulados ficam ocultos em REAL_ONLY.
          </div>
        )}
      </div>
    </div>
  );
};
