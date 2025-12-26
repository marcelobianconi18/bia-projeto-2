import React, { useState } from 'react';
import { BriefingInteligente, BriefingData, OperationalModel, MarketPositioning, TargetGender, AgeRange, DataSourcesConfig } from '../types';
import {
  ArrowRight, CheckCircle, MapPin, Target, Users, Building2, Smartphone, Activity, Search, Loader2, Check,
  Store, Bike, Truck, ShoppingBag, ShoppingCart, AlertCircle, Globe, Map, User, Heart, Coins, Gem, GraduationCap, ShieldCheck, Zap, MessageCircle, Eye, MousePointer2, Layers
} from 'lucide-react';
import { geocodeCity } from '../services/connectors/osmGeocode';
import { runBriefingScan } from '../services/scanOrchestrator';
import { ScanResult } from '../types';

// Map legacy State Anchors for fallback if needed, or remove if fully deprecated.
// Keeping it minimal for now as we use Nominatim for City.
const BR_STATES_BY_REGION = [
  { region: 'Norte', states: ['Acre (AC)', 'Amapá (AP)', 'Amazonas (AM)', 'Pará (PA)', 'Rondônia (RO)', 'Roraima (RR)', 'Tocantins (TO)'] },
  { region: 'Nordeste', states: ['Alagoas (AL)', 'Bahia (BA)', 'Ceará (CE)', 'Maranhão (MA)', 'Paraíba (PB)', 'Pernambuco (PE)', 'Piauí (PI)', 'Rio Grande do Norte (RN)', 'Sergipe (SE)'] },
  { region: 'Centro-Oeste', states: ['Distrito Federal (DF)', 'Goiás (GO)', 'Mato Grosso (MT)', 'Mato Grosso do Sul (MS)'] },
  { region: 'Sudeste', states: ['Espírito Santo (ES)', 'Minas Gerais (MG)', 'Rio de Janeiro (RJ)', 'São Paulo (SP)'] },
  { region: 'Sul', states: ['Paraná (PR)', 'Rio Grande do Sul (RS)', 'Santa Catarina (SC)'] }
];

interface BriefingWizardProps {
  onComplete: (data: BriefingData, scanResult?: ScanResult) => void;
  onExplorerMode?: () => void;
}

type ConnectorKey = keyof DataSourcesConfig;

// Ensure initial state matches new Type definition
const initialBriefing: BriefingData = {
  productDescription: '',
  contactMethod: '',
  usageDescription: '',
  operationalModel: null,
  dataSources: {
    ibge: { connected: true },
    osm: { connected: true },
    googleAds: { connected: false, status: 'DISCONNECTED' },
    metaAds: { connected: false, status: 'DISCONNECTED' },
    rfb: { connected: false, status: 'DISCONNECTED' }
  },
  marketPositioning: null,
  targetGender: null,
  targetAge: [],
  geography: {
    city: '',
    state: [],
    country: 'BR',
    level: 'City',
    selectedItems: []
  },
  objective: null
};

export const BriefingWizard: React.FC<BriefingWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<BriefingData>(initialBriefing);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geoError, setGeoError] = useState('');

  // Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const [scanLogs, setScanLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setScanLogs(prev => [...prev, msg]);

  const handleConfirmScanning = async () => {
    setIsScanning(true);
    setScanLogs([]);
    addLog(">> INICIANDO BIA PROTOCOL v3.1...");
    addLog(">> Validando Integridade do Briefing... OK");

    try {
      // 1. Simulação visual de processos (Feedback UX)
      await new Promise(r => setTimeout(r, 600));
      addLog(">> Conectando ao Backbone IBGE (Malha 2022)...");

      await new Promise(r => setTimeout(r, 800));
      addLog(">> Escaneando Concorrentes (Google Places)...");

      // 2. Execução Real (Orchestrator)
      const result = await runBriefingScan(data as any); // Cast as compatible

      if (result.geocode.status === 'ERROR') {
        addLog("!! ERRO CRÍTICO: FALHA NA GEOCODIFICAÇÃO !!");
        alert("Não foi possível localizar a cidade. Verifique a grafia.");
        setIsScanning(false);
        return;
      }

      addLog(">> Compilando GeoSignals...");
      await new Promise(r => setTimeout(r, 500));

      addLog(">> Sincronização Concluída. Liberando Dashboard.");
      await new Promise(r => setTimeout(r, 400)); // Final delay for reading

      onComplete(data, result);

    } catch (err) {
      console.error(err);
      addLog("!! ERRO DE CONEXÃO !!");
      alert("Erro ao conectar com serviços de inteligência. Tente novamente.");
      setIsScanning(false);
    }
  };

  const update = (field: keyof BriefingData, val: any) => setData(prev => ({ ...prev, [field]: val }));

  const toggleArray = <T extends string>(field: keyof BriefingData, val: T, max?: number) => {
    const arr = (data[field] as T[]) || [];
    if (arr.includes(val)) update(field, arr.filter(v => v !== val));
    else if (!max || arr.length < max) update(field, [...arr, val]);
  };

  const updateDataSource = (key: ConnectorKey, connected: boolean, meta: any = {}) => {
    setData(prev => ({
      ...prev,
      dataSources: {
        ...prev.dataSources,
        [key]: {
          ...prev.dataSources[key],
          connected,
          ...meta
        }
      }
    }));
  };

  const toggleAllDataSources = () => {
    const allConnected = data.dataSources.googleAds?.connected &&
      data.dataSources.metaAds?.connected &&
      data.dataSources.rfb?.connected;

    const newState = !allConnected;

    setData(prev => ({
      ...prev,
      dataSources: {
        ...prev.dataSources,
        googleAds: { ...prev.dataSources.googleAds, connected: newState },
        metaAds: { ...prev.dataSources.metaAds, connected: newState },
        rfb: { ...prev.dataSources.rfb, connected: newState }
      }
    }));
  };

  const validateStep = (): boolean => {
    switch (step) {
      case 1: return data.productDescription.length >= 10 && data.contactMethod.length >= 5 && data.usageDescription.length >= 10;
      case 2: return !!data.operationalModel;
      case 3:
        // Validate Connectors logic
        const ds = data.dataSources;
        // Basic validation: if connected, ensure fields (if implemented) or just pass for now since we are in simple mode
        return true;
      case 4: return !!data.marketPositioning;
      case 5: return !!data.targetGender;
      case 6: return data.targetAge.length > 0;
      case 7: {
        const hasCoords = !!data.geography.coords || (typeof data.geography.lat === 'number' && typeof data.geography.lng === 'number');
        return data.geography.city.length > 3 && (hasCoords || !!data.geography.municipioId || data.geography.selectedItems.length > 0);
      }
      case 8: return !!data.objective;
      default: return true;
    }
  };

  const handleGeocode = async () => {
    if (!data.geography.city || data.geography.city.length < 3) return;
    setIsGeocoding(true);
    setGeoError('');

    // Use OSM Connector directly for validation
    const res = await geocodeCity(data.geography.city);

    if (res.status === 'SUCCESS' && res.data) {
      setData(prev => ({
        ...prev,
        geography: {
          ...prev.geography,
          city: res.data!.displayName,
          coords: { lat: res.data!.lat, lng: res.data!.lng },
          lat: res.data!.lat,
          lng: res.data!.lng,
          selectedItems: [{
            id: 'osm-1',
            shortName: res.data!.displayName.split(',')[0],
            fullName: res.data!.displayName,
            hierarchy: { municipality: res.data!.displayName.split(',')[0], state: '', region: '' },
            coords: { lat: res.data!.lat, lng: res.data!.lng }
          }]
        }
      }));
    } else {
      setGeoError('Cidade não encontrada. Tente "Cidade, UF"');
      setData(prev => ({ ...prev, geography: { ...prev.geography, coords: undefined, lat: undefined, lng: undefined } }));
    }
    setIsGeocoding(false);
  };

  const next = () => { if (validateStep()) setStep(prev => prev + 1); };
  const back = () => setStep(prev => Math.max(1, prev - 1));

  const renderStep = () => {
    switch (step) {
      case 1: // Entrevista IA
        return (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-xl font-bold text-purple-400 flex items-center gap-2 mb-2"><Activity className="w-5 h-5" /> Entrevista de Mapeamento</h2>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Descreva seu produto/serviço (min 10 chars)</label>
              <textarea className="w-full bg-slate-800 border border-slate-700 rounded p-3 text-sm text-white" rows={2} value={data.productDescription} onChange={e => update('productDescription', e.target.value)} placeholder="Ex: Vendo pizzas artesanais..." />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Como o cliente entra em contato? (min 5 chars)</label>
              <input className="w-full bg-slate-800 border border-slate-700 rounded p-3 text-sm text-white" value={data.contactMethod} onChange={e => update('contactMethod', e.target.value)} placeholder="Ex: WhatsApp, Instagram..." />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Como o cliente utiliza o produto? (min 10 chars)</label>
              <textarea className="w-full bg-slate-800 border border-slate-700 rounded p-3 text-sm text-white" rows={2} value={data.usageDescription} onChange={e => update('usageDescription', e.target.value)} placeholder="Ex: Come em família no jantar..." />
            </div>
          </div>
        );
      case 2: // Modelo Operacional
        return (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-xl font-bold text-purple-400 flex items-center gap-2"><Store className="w-5 h-5" /> Modelo Operacional</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'Fixed', label: 'Ponto Fixo' }, { id: 'ClientVisit', label: 'Vou até Cliente' },
                { id: 'Itinerant', label: 'Itinerante' }, { id: 'Shopping', label: 'Shopping/Centro' },
                { id: 'Investor', label: 'Investidor' }, { id: 'Digital', label: '100% Digital' }
              ].map(opt => (
                <button key={opt.id} onClick={() => update('operationalModel', opt.id)}
                  className={`p-4 rounded border text-xs font-bold uppercase transition-all ${data.operationalModel === opt.id ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'} `}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );
      case 3: // Fontes de Dados (Phase 2 Updated)
        const allSelected = data.dataSources.googleAds?.connected &&
          data.dataSources.metaAds?.connected &&
          data.dataSources.rfb?.connected;

        return (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-purple-400 flex items-center gap-2"><Zap className="w-5 h-5" /> Fontes de Dados</h2>
              <button
                onClick={toggleAllDataSources}
                className="text-xs font-bold text-purple-300 hover:text-purple-100 uppercase transition-colors"
              >
                {allSelected ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
            </div>
            <p className="text-xs text-slate-500">Selecione onde você já atua ou quer monitorar.</p>
            <div className="space-y-4">

              {/* Google Ads */}
              <div className={`p-4 rounded border transition-all ${data.dataSources.googleAds.connected ? 'bg-purple-900/20 border-purple-500' : 'bg-slate-800 border-slate-700'} `}>
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-2 text-xs font-bold uppercase text-white"><MapPin size={16} /> Google Ads</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={data.dataSources.googleAds.connected} onChange={(e) => updateDataSource('googleAds', e.target.checked)} />
                    <div className="w-9 h-5 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
                {data.dataSources.googleAds.connected && (
                  <div className="space-y-2 mt-3 animate-fade-in">
                    <input
                      placeholder="Customer ID (ex: 123-456-7890)"
                      className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-xs text-white"
                      value={data.dataSources.googleAds.customerId || ''}
                      onChange={(e) => updateDataSource('googleAds', true, { customerId: e.target.value })}
                    />
                    <input
                      placeholder="Account ID (Opcional)"
                      className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-xs text-white"
                      value={data.dataSources.googleAds.accountId || ''}
                      onChange={(e) => updateDataSource('googleAds', true, { accountId: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {/* Meta Ads */}
              <div className={`p-4 rounded border transition-all ${data.dataSources.metaAds.connected ? 'bg-purple-900/20 border-purple-500' : 'bg-slate-800 border-slate-700'} `}>
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-2 text-xs font-bold uppercase text-white"><Layers size={16} /> Meta Ads</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={data.dataSources.metaAds.connected} onChange={(e) => updateDataSource('metaAds', e.target.checked)} />
                    <div className="w-9 h-5 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
                {data.dataSources.metaAds.connected && (
                  <div className="space-y-2 mt-3 animate-fade-in">
                    <input
                      placeholder="Ad Account ID (act_...)"
                      className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-xs text-white"
                      value={data.dataSources.metaAds.adAccountId || ''}
                      onChange={(e) => updateDataSource('metaAds', true, { adAccountId: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {/* RFB */}
              <div className={`p-4 rounded border transition-all ${data.dataSources.rfb.connected ? 'bg-purple-900/20 border-purple-500' : 'bg-slate-800 border-slate-700'} `}>
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-2 text-xs font-bold uppercase text-white"><ShieldCheck size={16} /> Receita Federal</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={data.dataSources.rfb.connected} onChange={(e) => updateDataSource('rfb', e.target.checked)} />
                    <div className="w-9 h-5 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
                {data.dataSources.rfb.connected && (
                  <div className="space-y-2 mt-3 animate-fade-in">
                    <input
                      placeholder="CNPJ (Somente números, opcional)"
                      className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-xs text-white"
                      value={data.dataSources.rfb.cnpj || ''}
                      onChange={(e) => updateDataSource('rfb', true, { cnpj: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {/* IBGE (Always On) */}
              <div className="p-4 rounded border bg-slate-800/50 border-slate-700 flex items-center justify-between opacity-70 cursor-not-allowed">
                <span className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400"><Activity size={16} /> IBGE (Demografia)</span>
                <Check size={16} className="text-green-500" />
              </div>

            </div>
          </div>
        );
      case 4: // Posicionamento
        return (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-xl font-bold text-purple-400 flex items-center gap-2"><Gem className="w-5 h-5" /> Posicionamento</h2>
            <div className="grid grid-cols-1 gap-3">
              {[{ id: 'Popular', icon: Users }, { id: 'CostBenefit', icon: Coins }, { id: 'Premium', icon: Gem }, { id: 'Luxury', icon: GraduationCap }].map(opt => (
                <button key={opt.id} onClick={() => update('marketPositioning', opt.id)}
                  className={`p-4 rounded border flex items-center gap-4 transition-all ${data.marketPositioning === opt.id ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'} `}>
                  <opt.icon size={20} /> <span className="text-xs font-bold uppercase">{opt.id}</span>
                </button>
              ))}
            </div>
          </div>
        );
      case 5: // Genero
        return (
          <div className="space-y-4 animate-fade-in text-center">
            <h2 className="text-xl font-bold text-purple-400 flex justify-center gap-2"><User className="w-5 h-5" /> Público Alvo: Gênero</h2>
            <div className="flex gap-3">
              {[{ id: 'Female', label: 'Feminino' }, { id: 'Male', label: 'Masculino' }, { id: 'Mixed', label: 'Misto' }].map(opt => (
                <button key={opt.id} onClick={() => update('targetGender', opt.id)}
                  className={`flex-1 p-6 rounded border flex flex-col items-center gap-2 transition-all ${data.targetGender === opt.id ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'} `}>
                  <span className="text-xs font-black uppercase">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        );
      case 6: // Idade
        return (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-xl font-bold text-purple-400 flex items-center gap-2"><Activity className="w-5 h-5" /> Faixa Etária (Máx 3)</h2>
            <div className="grid grid-cols-2 gap-3">
              {['18-24', '25-34', '35-44', '45-54', '55-64', '65+'].map(age => (
                <button key={age} onClick={() => toggleArray('targetAge', age, 3)}
                  className={`p-4 rounded border text-xs font-black transition-all ${data.targetAge.includes(age as any) ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'} `}>
                  {age}
                </button>
              ))}
            </div>
          </div>
        );
      case 7: // Geografia
        return (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-xl font-bold text-purple-400 flex items-center gap-2"><Globe className="w-5 h-5" /> Território de Ataque</h2>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-400">Cidade Alvo</label>
              <div className="flex gap-2">
                <input className={`flex-1 bg-slate-800 border ${geoError ? 'border-red-500' : 'border-slate-700'} rounded p-3 text-sm text-white`}
                  value={data.geography.city}
                  onChange={e => setData(prev => ({
                    ...prev,
                    geography: { ...prev.geography, city: e.target.value, coords: undefined, lat: undefined, lng: undefined }
                  }))}
                  onKeyDown={e => e.key === 'Enter' && handleGeocode()}
                  placeholder="Ex: Curitiba, PR" />
                <button onClick={handleGeocode} disabled={isGeocoding} className="bg-purple-600 px-4 rounded text-white">
                  {isGeocoding ? <Loader2 className="animate-spin" /> : <Search />}
                </button>
              </div>
              {geoError && <p className="text-xs text-red-400">{geoError}</p>}
              {data.geography.coords && (
                <div className="p-3 bg-green-900/20 border border-green-500/30 rounded flex items-center gap-2 text-green-400 text-xs">
                  <CheckCircle size={16} /> Localização confirmada: {data.geography.city}
                </div>
              )}
            </div>
          </div>
        );
      case 8: // Objetivo
        return (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-xl font-bold text-purple-400 flex items-center gap-2"><Target className="w-5 h-5" /> Objetivo Final</h2>
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'DominateRegion', label: 'Dominar Região' }, { id: 'SellMore', label: 'Vender Mais' },
                { id: 'FindSpot', label: 'Encontrar Ponto' }, { id: 'ValidateIdea', label: 'Validar Ideia' }
              ].map(opt => (
                <button key={opt.id} onClick={() => update('objective', opt.id)}
                  className={`p-5 rounded border text-left transition-all ${data.objective === opt.id ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'} `}>
                  <span className="text-sm font-bold uppercase">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        );
      case 9: // Resumo (Review Deck & Trigger)
        return (
          <div className="space-y-6 animate-fade-in relative">
            {/* --- LOADING OVERLAY (TERMINAL STYLE) --- */}
            {isScanning && (
              <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-50 rounded-xl flex flex-col items-center justify-center p-6 border border-slate-700">
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-6" />
                <div className="w-full max-w-sm font-mono text-xs space-y-2">
                  {scanLogs.map((log, i) => (
                    <div key={i} className={`truncate ${log.includes('!!') ? 'text-red-400 font-bold' : log.includes('>>') ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {log}
                    </div>
                  ))}
                  <div className="animate-pulse text-emerald-600">_</div>
                </div>
              </div>
            )}

            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center p-3 bg-blue-50 rounded-full border border-blue-100 mb-3 shadow-sm">
                <ShieldCheck size={24} className="text-blue-600" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Confirmação Tática</h2>
              <p className="text-xs text-slate-500 font-medium">Revise os parâmetros antes da injeção de dados.</p>
            </div>

            {/* --- GLASS CARD SUMMARY --- */}
            <div className="bg-white/60 backdrop-blur-sm border border-slate-200 rounded-xl p-1 shadow-sm">
              <div className="grid grid-cols-1 divide-y divide-slate-100">
                {/* Mission */}
                <div className="p-3 flex items-start gap-3">
                  <div className="mt-1"><Target className="w-4 h-4 text-slate-400" /></div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Missão / Objetivo</p>
                    <div className="text-sm font-bold text-slate-800">{data.objective || 'Não definido'}</div>
                    <div className="text-[10px] text-slate-500 italic mt-0.5 trim-text">"{data.productDescription?.slice(0, 40)}..."</div>
                  </div>
                </div>

                {/* Territory */}
                <div className="p-3 flex items-start gap-3 bg-slate-50/50">
                  <div className="mt-1"><MapPin className="w-4 h-4 text-blue-500" /></div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Território Alvo</p>
                    <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      {data.geography.city}
                      <CheckCircle className="w-3 h-3 text-emerald-500" />
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">IBGE Scope: {data.geography.level}</div>
                  </div>
                </div>

                {/* Model & Econ */}
                <div className="p-3 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1"><Store size={10} /> Modelo</p>
                    <div className="text-xs font-bold text-slate-700">{data.operationalModel}</div>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1"><Gem size={10} /> Posicionamento</p>
                    <div className="text-xs font-bold text-slate-700">{data.marketPositioning}</div>
                  </div>
                </div>

                {/* Source Grid */}
                <div className="p-3">
                  <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-2">Monitoramento Ativo</p>
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded text-[9px] font-bold border ${data.dataSources.googleAds.connected ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>Google Ads</span>
                    <span className={`px-2 py-1 rounded text-[9px] font-bold border ${data.dataSources.metaAds.connected ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>Meta Ads</span>
                    <span className={`px-2 py-1 rounded text-[9px] font-bold border ${data.dataSources.rfb.connected ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>RFB</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleConfirmScanning}
              disabled={isScanning}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl font-bold text-white shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 hover:scale-[1.01] transition-all uppercase tracking-widest flex items-center justify-center gap-3 text-sm"
            >
              {isScanning ? (
                <>
                  <Loader2 className="animate-spin" /> PROCESSANDO...
                </>
              ) : (
                <>
                  GERAR ESTRATÉGIA REAL <Zap size={16} className="text-yellow-300 fill-yellow-300" />
                </>
              )}
            </button>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-app p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/20 rounded-full blur-[120px]"></div>
      </div>
      <div className="w-full max-w-lg bg-surface/80 backdrop-blur-xl border border-app rounded-3xl shadow-2xl p-8 relative z-10 transition-all duration-500">
        <div className="flex justify-between items-center mb-8">
          <span className="text-[10px] font-black text-muted2 uppercase tracking-widest">BIA SCAN v4.0 REAL_DATA</span>
          <div className="flex gap-1">
            {[...Array(9)].map((_, i) => (
              <div key={i} className={`h-1 w-4 rounded-full transition-all ${step > i ? 'bg-accent' : 'bg-surface2'} `}></div>
            ))}
          </div>
        </div>
        <div className="min-h-[350px] flex flex-col justify-center">
          {renderStep()}
        </div>
        <div className="flex justify-between mt-8 pt-6 border-t border-app">
          <button onClick={back} disabled={step <= 1} className="text-xs font-bold text-muted hover:text-app uppercase disabled:opacity-0">Voltar</button>
          {step < 9 && (
            <button onClick={next} disabled={!validateStep()} className="bg-accent hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg text-xs font-black uppercase flex items-center gap-2 transition-all">
              Continuar <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
