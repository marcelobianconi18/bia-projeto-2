
import React, { useState, useEffect } from 'react';
import { BriefingData, GeminiAnalysis, MapSettings, TacticalFeature, AdTechZoneData } from '../types';
import { BiaWarRoomMap } from './BiaWarRoomMap';
import { BlockXRayCard } from './BlockXRayCard';
import { 
  ChevronLeft, Flame, Activity, 
  Target, Search, Users, LayoutGrid,
  Radar, Navigation, Loader2, Maximize, MapPin, Smartphone, Ghost, ShieldCheck, Database
} from 'lucide-react';
import L from 'leaflet';

interface ExplorerPageProps {
  mapCenter: [number, number];
  mapSettings: MapSettings;
  setMapSettings: (s: MapSettings) => void;
  briefingData: BriefingData;
  analysis: GeminiAnalysis | null;
  onBack: () => void;
  onCenterChange?: (coords: [number, number]) => void;
  hotspots?: any[];
}

export const ExplorerPage: React.FC<ExplorerPageProps> = ({
  mapCenter,
  mapSettings,
  setMapSettings,
  briefingData,
  analysis,
  onBack,
  onCenterChange,
  hotspots = []
}) => {
  const [map, setMap] = useState<L.Map | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<TacticalFeature | null>(null);

  const cityName = briefingData.geography.city.split(',')[0] || "Região";

  const handleCenterOnUser = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (map) map.flyTo([latitude, longitude], 15, { duration: 1.5 });
        setIsLocating(false);
      },
      () => setIsLocating(false)
    );
  };

  const handleSelectFeature = (feature: TacticalFeature) => {
    setSelectedFeature(feature);
    const centroid = L.geoJSON(feature.geometry).getBounds().getCenter();
    if (onCenterChange) onCenterChange([centroid.lat, centroid.lng]);
  };

  return (
    <div className="flex h-full w-full bg-white text-slate-900 overflow-hidden font-sans select-none">
      <aside className="w-[300px] h-full border-r border-slate-200 bg-white flex flex-col z-[1000] shadow-sm">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-slate-950 rounded-lg flex items-center justify-center">
                <Target size={18} className="text-[#39ff14]" />
             </div>
             <h1 className="font-black text-lg tracking-tight uppercase">BIA <span className="text-slate-400 font-medium italic">GIS</span></h1>
          </div>
          <ChevronLeft size={16} className="text-slate-400 cursor-pointer hover:text-blue-600" onClick={onBack} />
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
           <div className="bg-slate-950 rounded-xl p-4 border border-white/5 space-y-3">
             <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">LAYER_ACTIVE: CENSUS_2022</span>
                <div className="w-1.5 h-1.5 bg-[#39ff14] rounded-full animate-pulse"></div>
             </div>
             <p className="text-[10px] text-slate-400 leading-tight">Visualizando polígonos reais de quarteirões com agregação de audiência PostGIS.</p>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Configuração Tática</h3>
             <button onClick={() => setMapSettings({...mapSettings, showIncome: !mapSettings.showIncome})} className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${mapSettings.showIncome ? 'bg-slate-900 text-white' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-3"><Database size={16} /> <span className="text-xs font-bold uppercase">Heatmap de Renda</span></div>
             </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 relative flex flex-col bg-slate-50">
        <header className="h-16 w-full bg-white border-b border-slate-200 flex items-center justify-between px-8 z-[1000]">
           <span className="font-black text-[10px] uppercase tracking-widest text-slate-500">GIS SNIPER // {cityName}</span>
           <div className="flex items-center gap-4">
              <button onClick={handleCenterOnUser} className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 transition shadow-sm">
                 {isLocating ? <Loader2 size={18} className="animate-spin" /> : <Navigation size={18} />}
              </button>
           </div>
        </header>

        <div className="flex-1 relative">
          <BiaWarRoomMap 
            center={mapCenter} 
            settings={mapSettings} 
            setMapInstance={setMap}
            onSelectFeature={handleSelectFeature}
            cityName={cityName}
            geoSignals={briefingData.geoSignals}
          />
          
          {selectedFeature && (
            <BlockXRayCard 
               data={{
                  id: selectedFeature.properties.geocode,
                  lat: L.geoJSON(selectedFeature.geometry).getBounds().getCenter().lat,
                  lng: L.geoJSON(selectedFeature.geometry).getBounds().getCenter().lng,
                  income: selectedFeature.properties.income,
                  population: selectedFeature.properties.population,
                  footfallTraffic: selectedFeature.properties.volume,
                  isGhost: selectedFeature.properties.volume < 10,
                  techFingerprint: selectedFeature.properties.income > 5000 ? 'iOS_5G' : 'ANDROID_WIFI',
                  cnpjDensity: 12,
                  creativeHook: briefingData.productDescription,
                  dominantProfile: briefingData.targetGender
               }} 
            />
          )}
        </div>
      </main>
    </div>
  );
};
