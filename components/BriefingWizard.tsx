
import React, { useState } from 'react';
import { BriefingData, RichLocationData } from '../types';
import { 
  ArrowRight, CheckCircle, MapPin, Target, Users, Building2, Smartphone, DollarSign, Activity, Search, Loader2, Check,
  Store, Bike, Truck, ShoppingBag, TrendingUp, ShoppingCart, ChevronLeft, AlertCircle, X, Globe, Map, User, Facebook, FileText,
  Scale, Star, Gem, GraduationCap, Briefcase, Home, Heart, MapPinned, Navigation, Lightbulb, Coins, Zap, MousePointer2,
  // Fix: Added missing icons required for step 3 and step 9
  Database, ShieldCheck
} from 'lucide-react';

interface BriefingWizardProps {
  onComplete: (data: BriefingData) => void;
}

const initialData: BriefingData = {
  productDescription: '',
  contactMethod: '',
  usageDescription: '',
  operationalModel: '',
  dataSources: [],
  marketPositioning: '',
  targetGender: '',
  targetAge: [],
  geography: { city: '', selectedItems: [], level: 'city' },
  objective: ''
};

const STATE_ANCHORS: Record<string, [number, number]> = {
  'Acre (AC)': [-9.02, -70.81], 'Alagoas (AL)': [-9.57, -36.78], 'Amapá (AP)': [1.41, -51.77],
  'Amazonas (AM)': [-3.41, -64.59], 'Bahia (BA)': [-12.97, -38.50], 'Ceará (CE)': [-3.71, -38.54],
  'Distrito Federal (DF)': [-15.78, -47.93], 'Espírito Santo (ES)': [-19.18, -40.30],
  'Goiás (GO)': [-16.68, -49.25], 'Maranhão (MA)': [-2.53, -44.30], 'Mato Grosso (MT)': [-12.68, -56.92],
  'Mato Grosso do Sul (MS)': [-20.44, -54.61], 'Minas Gerais (MG)': [-18.51, -44.55],
  'Pará (PA)': [-1.45, -48.50], 'Paraíba (PB)': [-7.11, -34.86], 'Paraná (PR)': [-25.25, -52.02],
  'Pernambuco (PE)': [-8.05, -34.88], 'Piauí (PI)': [-5.08, -42.80], 'Rio de Janeiro (RJ)': [-22.90, -43.17],
  'Rio Grande do Norte (RN)': [-5.79, -35.20], 'Rio Grande do Sul (RS)': [-30.03, -51.21],
  'Rondônia (RO)': [-11.50, -63.83], 'Roraima (RR)': [2.82, -60.67], 'Santa Catarina (SC)': [-27.24, -50.21],
  'São Paulo (SP)': [-23.55, -46.63], 'Sergipe (SE)': [-10.91, -37.07], 'Tocantins (TO)': [-10.17, -48.33],
  'Brasil': [-14.23, -51.92]
};

const BR_STATES_BY_REGION = [
  { region: 'Norte', states: ['Acre (AC)', 'Amapá (AP)', 'Amazonas (AM)', 'Pará (PA)', 'Rondônia (RO)', 'Roraima (RR)', 'Tocantins (TO)'] },
  { region: 'Nordeste', states: ['Alagoas (AL)', 'Bahia (BA)', 'Ceará (CE)', 'Maranhão (MA)', 'Paraíba (PB)', 'Pernambuco (PE)', 'Piauí (PI)', 'Rio Grande do Norte (RN)', 'Sergipe (SE)'] },
  { region: 'Centro-Oeste', states: ['Distrito Federal (DF)', 'Goiás (GO)', 'Mato Grosso (MT)', 'Mato Grosso do Sul (MS)'] },
  { region: 'Sudeste', states: ['Espírito Santo (ES)', 'Minas Gerais (MG)', 'Rio de Janeiro (RJ)', 'São Paulo (SP)'] },
  { region: 'Sul', states: ['Paraná (PR)', 'Rio Grande do Sul (RS)', 'Santa Catarina (SC)'] }
];

export const BriefingWizard: React.FC<BriefingWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<BriefingData>(initialData);
  const [cityInput, setCityInput] = useState('');
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => Math.max(1, prev - 1));

  const updateData = (field: keyof BriefingData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: keyof BriefingData, value: string) => {
    const current = (data[field] as string[]) || [];
    if (current.includes(value)) {
      updateData(field, current.filter(i => i !== value));
    } else {
      updateData(field, [...current, value]);
    }
  };

  const updateNestedData = (parent: keyof BriefingData, field: string, value: any) => {
    setData(prev => ({
      ...prev,
      [parent]: { ...((prev[parent] as any) || {}), [field]: value }
    }));
  };

  const toggleGeoItem = (location: RichLocationData | string, limit: number) => {
    const isRich = typeof location !== 'string';
    const current = data.geography.selectedItems || [];
    const locId = isRich ? location.id : location;
    
    const isSelected = current.some(item => (typeof item === 'string' ? item : item.id) === locId);

    if (!isSelected && current.length >= limit) return;

    let updated: any[];
    if (isSelected) {
      updated = current.filter(item => (typeof item === 'string' ? item : item.id) !== locId);
    } else {
      updated = [...current, location];
      if (!isRich && STATE_ANCHORS[location]) {
         const coords = STATE_ANCHORS[location];
         updateNestedData('geography', 'lat', coords[0]);
         updateNestedData('geography', 'lng', coords[1]);
      }
    }

    const consolidatedString = updated.map(item => typeof item === 'string' ? item : item.fullName).join('; ');

    setData(prev => ({
      ...prev,
      geography: {
        ...prev.geography,
        selectedItems: updated,
        city: consolidatedString
      }
    }));
  };

  const setLevel = (level: 'city' | 'state' | 'country') => {
    const coords = level === 'country' ? STATE_ANCHORS['Brasil'] : undefined;
    setData(prev => ({
      ...prev,
      geography: {
        ...prev.geography,
        level,
        selectedItems: [],
        city: level === 'country' ? 'Brasil' : '',
        lat: coords ? coords[0] : prev.geography.lat,
        lng: coords ? coords[1] : prev.geography.lng
      }
    }));
  };

  const handleCitySearch = async () => {
    if (!cityInput.trim() || data.geography.selectedItems.length >= 10) return;
    setIsSearchingLocation(true);
    setLocationError('');
    try {
      const params = new URLSearchParams({ format: 'jsonv2', q: cityInput, limit: '1', countrycodes: 'br', addressdetails: '1' });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
      const results = await response.json();
      if (results && results.length > 0) {
        const place = results[0];
        const address = place.address;
        const municipality = address.city || address.town || address.village || address.municipality || '';
        const state = address["ISO3166-2-lvl4"] ? address["ISO3166-2-lvl4"].split('-')[1] : (address.state || '');
        const richData: RichLocationData = {
          id: place.place_id?.toString() || crypto.randomUUID(),
          shortName: address.road || address.suburb || municipality || place.display_name.split(',')[0],
          fullName: place.display_name,
          hierarchy: { municipality, state },
          coords: { lat: parseFloat(place.lat), lng: parseFloat(place.lon) }
        };
        updateNestedData('geography', 'lat', richData.coords.lat);
        updateNestedData('geography', 'lng', richData.coords.lng);
        toggleGeoItem(richData, 10);
        setCityInput('');
      } else {
        setLocationError("Localização não encontrada.");
      }
    } catch (error) {
      setLocationError("Erro de conexão.");
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1: return data.productDescription.length > 10 && data.contactMethod.length > 5;
      case 2: return !!data.operationalModel;
      case 3: return data.dataSources.length > 0;
      case 4: return !!data.marketPositioning;
      case 5: return !!data.targetGender;
      case 6: return data.targetAge.length > 0;
      case 7: return data.geography.level === 'country' ? data.geography.city === 'Brasil' : data.geography.selectedItems.length > 0;
      case 8: return !!data.objective;
      default: return true;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-xl font-bold text-purple-400 flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5" /> Entrevista IA
            </h2>
            <div className="space-y-1">
              <label className="block text-slate-400 text-[11px] font-bold uppercase tracking-wider">O que você vende e qual seu diferencial?</label>
              <textarea className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-purple-500 outline-none" rows={3} placeholder="Ex: Hamburgueria artesanal com entrega em 20 min..." value={data.productDescription} onChange={e => updateData('productDescription', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="block text-slate-400 text-[11px] font-bold uppercase tracking-wider">Como o cliente entra em contato?</label>
              <input className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-purple-500 outline-none" placeholder="Ex: WhatsApp, Site, Direct..." value={data.contactMethod} onChange={e => updateData('contactMethod', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="block text-slate-400 text-[11px] font-bold uppercase tracking-wider">Qual a sensação do cliente após comprar?</label>
              <input className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-purple-500 outline-none" placeholder="Ex: Alívio, Prazer, Segurança..." value={data.usageDescription} onChange={e => updateData('usageDescription', e.target.value)} />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-purple-400 flex items-center gap-2"><Building2 className="w-6 h-6" /> Modelo Operacional</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'Fixed', label: 'Local Fixo', icon: Store },
                { id: 'Delivery', label: 'Delivery', icon: Truck },
                { id: 'Digital', label: 'Infoproduto', icon: Smartphone },
                { id: 'Itinerant', label: 'Serviço em Casa', icon: Bike }
              ].map(opt => (
                <button key={opt.id} onClick={() => updateData('operationalModel', opt.id)} className={`p-6 rounded-xl border flex flex-col items-center gap-3 transition-all ${data.operationalModel === opt.id ? 'bg-purple-900/40 border-purple-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                  <opt.icon size={24} />
                  <span className="font-bold text-xs uppercase tracking-widest">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-purple-400 flex items-center gap-2"><Database className="w-6 h-6" /> Inteligência de Dados</h2>
            <p className="text-slate-400 text-sm italic">Quais sinais de rastreio você possui ativos?</p>
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'Pixel', label: 'Pixel Meta Ads Ativo', icon: Zap },
                { id: 'GoogleTag', label: 'Google Tag Manager', icon: Globe },
                { id: 'CRM', label: 'Base de Clientes (CRM)', icon: Users },
                { id: 'API', label: 'API de Conversão', icon: Activity }
              ].map(opt => (
                <button key={opt.id} onClick={() => toggleArrayItem('dataSources', opt.id)} className={`p-4 rounded-xl border flex items-center justify-between transition-all ${data.dataSources.includes(opt.id) ? 'bg-purple-900/40 border-purple-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                  <div className="flex items-center gap-3"><opt.icon size={18} /> <span className="font-bold text-xs uppercase tracking-widest">{opt.label}</span></div>
                  {data.dataSources.includes(opt.id) && <Check size={16} className="text-purple-400" />}
                </button>
              ))}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-purple-400 flex items-center gap-2"><Scale className="w-6 h-6" /> Posicionamento de Mercado</h2>
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'HighEnd', label: 'Premium / Alta Exclusividade', icon: Gem },
                { id: 'CostBenefit', label: 'Melhor Custo-Benefício', icon: Coins },
                { id: 'MassMarket', label: 'Popular / Grande Escala', icon: ShoppingCart },
                { id: 'Authority', label: 'Especialista / Autoridade', icon: GraduationCap }
              ].map(opt => (
                <button key={opt.id} onClick={() => updateData('marketPositioning', opt.id)} className={`p-4 rounded-xl border flex items-center justify-between transition-all ${data.marketPositioning === opt.id ? 'bg-purple-900/40 border-purple-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                  <div className="flex items-center gap-3"><opt.icon size={18} /> <span className="font-bold text-xs uppercase tracking-widest">{opt.label}</span></div>
                  {data.marketPositioning === opt.id && <CheckCircle size={16} className="text-purple-400" />}
                </button>
              ))}
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6 animate-fade-in text-center">
            <h2 className="text-2xl font-bold text-purple-400 flex items-center justify-center gap-2"><User className="w-6 h-6" /> Gênero Alvo</h2>
            <div className="flex gap-4">
              {[
                { id: 'Men', label: 'Homens', icon: User },
                { id: 'Women', label: 'Mulheres', icon: Heart },
                { id: 'All', label: 'Ambos', icon: Users }
              ].map(opt => (
                <button key={opt.id} onClick={() => updateData('targetGender', opt.id)} className={`flex-1 p-8 rounded-xl border flex flex-col items-center gap-4 transition-all ${data.targetGender === opt.id ? 'bg-purple-900/40 border-purple-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                   <opt.icon size={32} />
                   <span className="font-black text-[10px] uppercase tracking-widest">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-purple-400 flex items-center gap-2"><Activity className="w-6 h-6" /> Faixas Etárias</h2>
            <div className="grid grid-cols-2 gap-3">
              {['18-24', '25-34', '35-44', '45-54', '55+'].map(age => (
                <button key={age} onClick={() => toggleArrayItem('targetAge', age)} className={`p-4 rounded-xl border font-black text-xs transition-all ${data.targetAge.includes(age) ? 'bg-purple-900/40 border-purple-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                  {age} ANOS
                </button>
              ))}
            </div>
          </div>
        );
      case 7:
        const geoLevels = [{ id: 'city', label: 'Cidades', icon: MapPin }, { id: 'state', label: 'Estados', icon: Map }, { id: 'country', label: 'País', icon: Globe }];
        return (
          <div className="space-y-6 animate-fade-in text-slate-200">
            <h2 className="text-2xl font-bold text-purple-400 flex items-center gap-3"><MapPinned className="w-6 h-6" /> Geografia da Campanha</h2>
            <div className="flex gap-2 p-1 bg-slate-900/80 rounded-xl border border-slate-700">
              {geoLevels.map((l) => (
                <button key={l.id} onClick={() => setLevel(l.id as any)} className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${data.geography.level === l.id ? 'bg-purple-600 text-white' : 'text-slate-500'}`}><l.icon size={12} /> {l.label}</button>
              ))}
            </div>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {data.geography.level === 'city' && (
                <div className="flex gap-2 relative">
                  <input type="text" className="flex-1 bg-slate-800/60 border border-slate-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none" placeholder="Ex: Curitiba, PR" value={cityInput} onChange={e => setCityInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCitySearch()} />
                  <button onClick={handleCitySearch} disabled={isSearchingLocation} className="bg-purple-600 p-3 rounded-lg">{isSearchingLocation ? <Loader2 className="animate-spin" /> : <Search />}</button>
                </div>
              )}
              {data.geography.level === 'state' && (
                <div className="grid grid-cols-2 gap-2">
                  {BR_STATES_BY_REGION.flatMap(r => r.states).sort().map(state => (
                    <button key={state} onClick={() => toggleGeoItem(state, 1)} className={`p-3 rounded-lg border text-[10px] font-bold transition-all ${data.geography.selectedItems.includes(state) ? 'bg-purple-900/40 border-purple-500 text-white' : 'bg-slate-800/40 border-slate-700 text-slate-400'}`}>{state}</button>
                  ))}
                </div>
              )}
              {data.geography.level === 'country' && <button onClick={() => setLevel('country')} className={`w-full py-12 rounded-2xl border-2 font-black tracking-[0.3em] transition-all ${data.geography.city === 'Brasil' ? 'bg-[#39ff14] text-black border-[#39ff14]' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>BRASIL SELECIONADO</button>}
            </div>
          </div>
        );
      case 8:
        return (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-purple-400 flex items-center gap-2"><Target className="w-6 h-6" /> Objetivo de Conversão</h2>
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'Leads', label: 'Geração de Leads / WhatsApp', icon: MessageCircle },
                { id: 'Sales', label: 'Vendas Diretas / E-commerce', icon: ShoppingBag },
                { id: 'Awareness', label: 'Reconhecimento / Branding', icon: Eye },
                { id: 'Traffic', label: 'Visitas ao Perfil / Loja', icon: MousePointer2 }
              ].map(opt => (
                <button key={opt.id} onClick={() => updateData('objective', opt.id)} className={`p-5 rounded-xl border flex items-center justify-between transition-all ${data.objective === opt.id ? 'bg-purple-900/40 border-purple-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                  <div className="flex items-center gap-4"><opt.icon size={20} /> <span className="font-black text-xs uppercase tracking-widest">{opt.label}</span></div>
                  {data.objective === opt.id && <CheckCircle size={20} className="text-purple-400" />}
                </button>
              ))}
            </div>
          </div>
        );
      case 9:
        return (
          <div className="space-y-6 animate-fade-in text-center">
             <div className="w-20 h-20 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-500/50">
                <ShieldCheck size={40} className="text-purple-400" />
             </div>
             <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Briefing Finalizado</h2>
             <p className="text-slate-400 text-sm">A BIA está pronta para cruzar seus dados com as camadas de inteligência demográfica.</p>
             <div className="bg-slate-950 p-4 rounded-xl border border-white/5 text-left mt-6">
                <p className="text-[10px] text-slate-500 font-black uppercase mb-2">Protocolo Operacional:</p>
                <p className="text-xs text-slate-300">🎯 {data.objective} | 📍 {data.geography.city} | 💰 {data.marketPositioning}</p>
             </div>
             <button onClick={() => onComplete(data)} className="w-full mt-8 py-5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-black text-white shadow-xl hover:scale-[1.02] transition-all uppercase tracking-widest">ATIVAR RADAR BIA</button>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/20 rounded-full blur-[120px]"></div>
      </div>
      <div className="w-full max-w-2xl bg-slate-900/60 backdrop-blur-3xl border border-slate-700/50 rounded-[32px] shadow-2xl p-10 relative z-10">
          <div className="mb-8 flex justify-between items-center">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">BIA_BRIEFING_SCAN v3.1</span>
            <div className="flex gap-1.5">
              {[...Array(9)].map((_, i) => (
                <div key={i} className={`h-1.5 w-6 rounded-full transition-all duration-500 ${step > i ? 'bg-purple-500 shadow-[0_0_8px_#a855f7]' : 'bg-slate-800'}`}></div>
              ))}
            </div>
          </div>
          <div className="min-h-[400px] flex flex-col justify-center">
            {renderStep()}
          </div>
          <div className="mt-12 flex justify-between items-center">
            <button onClick={handleBack} disabled={step === 1} className="text-slate-500 hover:text-white disabled:opacity-0 transition-all font-black text-[10px] uppercase tracking-widest">Voltar</button>
            {step < 9 && (
              <button onClick={handleNext} disabled={!isStepValid()} className="px-10 py-4 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:opacity-50 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3">
                Continuar <ArrowRight size={14} />
              </button>
            )}
          </div>
      </div>
    </div>
  );
};

// Icons not imported from lucide-react in previous scope
const MessageCircle = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
);
const Eye = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
);
