import React, { useState, useEffect, useRef } from 'react';
import { Target, ArrowRight, MapPin, Search, Store, Globe, Megaphone, CheckCircle, AlertTriangle, Loader2, ShieldAlert, BadgeCheck, XCircle } from 'lucide-react';
import { BriefingInteligente } from '../types';
import { runBriefingScan } from '../services/scanOrchestrator';

// Estado Inicial Robusto
const INITIAL_BRIEFING: BriefingInteligente = {
    archetype: 'LOCAL_BUSINESS',
    productDescription: '',
    financials: { ticketPrice: 0, monthlyBudget: 1500 },
    targeting: { tribeReferences: [], negativeHints: [], targetGender: 'Todos', targetAge: '25-45' },
    geography: { level: 'CITY', city: '', radius: 5, lat: 0, lng: 0 },
    geoSignals: null
};

interface Props {
    onComplete: (data: BriefingInteligente) => void;
}

// COMPONENTE HELPER: AUTOCOMPLETE (Live Targeting)
const InterestAutocomplete = ({
    placeholder,
    onSelect,
    variant = 'positive'
}: {
    placeholder: string,
    onSelect: (val: string) => void,
    variant?: 'positive' | 'negative'
}) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Debounce Search
    useEffect(() => {
        if (query.length < 2) { setResults([]); return; }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/meta/targeting-search?q=${query}`);
                const json = await res.json();
                setResults(json.data || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    // Click Outside
    useEffect(() => {
        function handleClickOutside(event: any) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setResults([]);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (item: any) => {
        onSelect(item.name);
        setQuery('');
        setResults([]);
    };

    // Formata números (ex: 1500000 -> 1.5M)
    const formatSize = (n: number) => {
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
        return n;
    };

    return (
        <div className="relative flex-1" ref={wrapperRef}>
            <div className="flex gap-2">
                <input
                    className={`flex-1 p-2 border rounded text-sm outline-none focus:ring-2 ${variant === 'positive' ? 'focus:ring-emerald-200 border-slate-300' : 'focus:ring-red-200 border-slate-300'}`}
                    placeholder={placeholder}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                />
            </div>
            {/* Dropdown Results */}
            {results.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 shadow-xl rounded-b z-50 max-h-48 overflow-y-auto">
                    {results.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => handleSelect(item)}
                            className="p-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 flex justify-between items-center"
                        >
                            <span className="text-sm font-medium text-slate-700">{item.name}</span>
                            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                                {formatSize(item.audience_size_lower_bound || 0)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
            {/* Simple Loading Indicator */}
            {loading && <div className="absolute right-3 top-2.5"><Loader2 size={14} className="animate-spin text-slate-400" /></div>}
        </div>
    );
};

export const BriefingWizard: React.FC<Props> = ({ onComplete }) => {
    const [step, setStep] = useState(0);
    const [data, setData] = useState<BriefingInteligente>(INITIAL_BRIEFING);
    const [isScanning, setIsScanning] = useState(false);

    const handleNext = () => setStep(s => s + 1);

    // Handlers de Tag via Autocomplete
    const addPosTag = (tagName: string) => {
        if (!data.targeting.tribeReferences.includes(tagName)) {
            setData({ ...data, targeting: { ...data.targeting, tribeReferences: [...data.targeting.tribeReferences, tagName] } });
        }
    };

    const addNegTag = (tagName: string) => {
        if (!data.targeting.negativeHints.includes(tagName)) {
            setData({ ...data, targeting: { ...data.targeting, negativeHints: [...data.targeting.negativeHints, tagName] } });
        }
    };

    const handleConfirmScanning = async () => {
        setIsScanning(true);
        try {
            console.log(`🚀 Iniciando Scan Deep Targeting [${data.archetype}]...`);
            const enrichedData = await runBriefingScan(data);
            onComplete(enrichedData);
        } catch (error) {
            console.error("❌ Erro fatal no Wizard:", error);
            onComplete(data);
        } finally {
            setIsScanning(false);
        }
    };

    // --- RENDERIZADORES DE ETAPA ---

    // STEP 0: O ARQUÉTIPO
    if (step === 0) return (
        <div className="max-w-4xl mx-auto p-6">
            <h2 className="text-3xl font-bold text-slate-800 mb-8 text-center">Qual a natureza da missão?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button onClick={() => { setData({ ...data, archetype: 'LOCAL_BUSINESS' }); handleNext(); }}
                    className="p-8 bg-white border-2 border-slate-200 hover:border-blue-600 rounded-2xl flex flex-col items-center gap-4 transition-all hover:shadow-xl group">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><Store size={32} /></div>
                    <div className="text-center"><h3 className="font-bold text-lg text-slate-700">Negócio Local</h3><p className="text-sm text-slate-500 mt-2">Pizzaria, Clínica, Imobiliária. Raio Físico.</p></div>
                </button>
                <button onClick={() => { setData({ ...data, archetype: 'DIGITAL_BUSINESS' }); handleNext(); }}
                    className="p-8 bg-white border-2 border-slate-200 hover:border-purple-600 rounded-2xl flex flex-col items-center gap-4 transition-all hover:shadow-xl group">
                    <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><Globe size={32} /></div>
                    <div className="text-center"><h3 className="font-bold text-lg text-slate-700">Digital / E-com</h3><p className="text-sm text-slate-500 mt-2">Curso, SaaS, Dropshipping. Escala Nacional.</p></div>
                </button>
                <button onClick={() => { setData({ ...data, archetype: 'PUBLIC_FIGURE' }); handleNext(); }}
                    className="p-8 bg-white border-2 border-slate-200 hover:border-amber-500 rounded-2xl flex flex-col items-center gap-4 transition-all hover:shadow-xl group">
                    <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><Megaphone size={32} /></div>
                    <div className="text-center"><h3 className="font-bold text-lg text-slate-700">Figura Pública</h3><p className="text-sm text-slate-500 mt-2">Político, Influencer. Autoridade e Alcance.</p></div>
                </button>
            </div>
        </div>
    );

    // STEP 1: FINANCEIRO & PRODUTO
    if (step === 1) return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-xl">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">
                {data.archetype === 'PUBLIC_FIGURE' ? 'Qual sua Pauta ou Ideologia?' :
                    data.archetype === 'DIGITAL_BUSINESS' ? 'Qual a Promessa do lnfoproduto?' :
                        'O que vamos vender?'}
            </h2>
            <input
                className="w-full p-4 border border-slate-300 rounded-lg mb-4"
                placeholder="Descreva o produto/ideia..."
                value={data.productDescription}
                onChange={e => setData({ ...data, productDescription: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Ticket (R$)</label>
                    <input type="number" className="w-full p-3 border border-slate-300 rounded" placeholder="0,00"
                        onChange={e => setData({ ...data, financials: { ...data.financials, ticketPrice: Number(e.target.value) } })}
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Verba (R$)</label>
                    <input type="number" className="w-full p-3 border border-slate-300 rounded" defaultValue={1500}
                        onChange={e => setData({ ...data, financials: { ...data.financials, monthlyBudget: Number(e.target.value) } })}
                    />
                </div>
            </div>
            <button onClick={handleNext} disabled={!data.productDescription} className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">
                Avançar <ArrowRight className="inline ml-2" size={18} />
            </button>
        </div>
    );

    // STEP 2: ATAQUE E DEFESA (LIVE TARGETING)
    if (step === 2) return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-slate-800 mb-1">Estratégia de Alvo</h2>
            <p className="text-sm text-slate-400 mb-6">Defina quem você QUER e quem você NÃO QUER impactar.</p>

            {/* CLUSTER A: INCLUSÃO (QUEM SEGUEM) */}
            <div className="mb-6">
                <label className="flex items-center gap-2 text-sm font-bold text-emerald-700 uppercase mb-2">
                    <BadgeCheck size={16} /> Tribo / Referências (Ataque)
                </label>
                <div className="flex gap-2 mb-2 relative">
                    <InterestAutocomplete
                        placeholder="Busque marcas, influencers ou interesses (ex: Apple)..."
                        onSelect={addPosTag}
                        variant="positive"
                    />
                </div>
                <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-slate-50 rounded border border-slate-100">
                    {data.targeting.tribeReferences.map(tag => (
                        <span key={tag} className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 animate-in fade-in zoom-in duration-300">
                            {tag} <button onClick={() => setData({ ...data, targeting: { ...data.targeting, tribeReferences: data.targeting.tribeReferences.filter(t => t !== tag) } })} className="hover:text-red-500">×</button>
                        </span>
                    ))}
                </div>
            </div>

            {/* CLUSTER B: EXCLUSÃO (QUEM EVITAR) */}
            <div className="mb-6">
                <label className="flex items-center gap-2 text-sm font-bold text-red-600 uppercase mb-2">
                    <ShieldAlert size={16} /> Blocklist / Negativas (Defesa)
                </label>
                <div className="flex gap-2 mb-2 relative">
                    <InterestAutocomplete
                        placeholder="Busque perfis para bloquear (ex: Free fire)..."
                        onSelect={addNegTag}
                        variant="negative"
                    />
                </div>
                <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-slate-50 rounded border border-slate-100">
                    {data.targeting.negativeHints.map(tag => (
                        <span key={tag} className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 animate-in fade-in zoom-in duration-300">
                            {tag} <button onClick={() => setData({ ...data, targeting: { ...data.targeting, negativeHints: data.targeting.negativeHints.filter(t => t !== tag) } })} className="hover:text-red-900">×</button>
                        </span>
                    ))}
                </div>
            </div>

            <button onClick={handleNext} disabled={data.targeting.tribeReferences.length < 1} className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">
                Avançar <ArrowRight className="inline ml-2" size={18} />
            </button>
        </div>
    );

    // STEP 3: GEOGRAFIA
    if (step === 3) {
        const isLocal = data.archetype === 'LOCAL_BUSINESS';
        return (
            <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-xl">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">{isLocal ? 'Onde é a base?' : 'Qual o território?'}</h2>
                <div className="relative mb-4">
                    <MapPin className="absolute left-3 top-3 text-slate-400" />
                    <input
                        className="w-full p-3 pl-10 border border-slate-300 rounded-lg"
                        placeholder={isLocal ? "Cidade (ex: Curitiba)" : "Região (ex: Brasil)"}
                        value={data.geography.city}
                        onChange={e => setData({ ...data, geography: { ...data.geography, city: e.target.value } })}
                    />
                </div>
                {isLocal && <div className="text-xs text-slate-500 bg-blue-50 p-2 rounded mb-4">ℹ️ Análise de ruas num raio de 5km.</div>}
                {!isLocal && <div className="text-xs text-slate-500 bg-purple-50 p-2 rounded mb-4">🚀 Modo Digital: Análise de Capitais e Polos.</div>}

                <button onClick={() => setStep(4)} disabled={!data.geography.city} className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">
                    Revisar Missão <Search className="inline ml-2" size={18} />
                </button>
            </div>
        );
    }

    // STEP 4: REVISÃO
    return (
        <div className="max-w-2xl mx-auto p-8 bg-slate-900 text-white rounded-xl shadow-2xl text-center">
            {isScanning ? (
                <div className="flex flex-col items-center">
                    <Loader2 size={64} className="text-blue-500 animate-spin mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Processando Deep Targeting...</h2>
                    <p className="text-slate-400">Cruzando {data.targeting.tribeReferences.length} Tribos contra {data.targeting.negativeHints.length} Bloqueios...</p>
                </div>
            ) : (
                <>
                    <div className="flex justify-center mb-6"><CheckCircle size={64} className="text-emerald-400" /></div>
                    <h2 className="text-2xl font-bold mb-6">Confirme o Protocolo</h2>

                    <div className="bg-slate-800 rounded-lg p-4 text-left mb-6 space-y-2 text-sm">
                        <div className="flex justify-between border-b border-slate-700 pb-1">
                            <span className="text-slate-400">Arquétipo:</span><span className="font-bold text-blue-400">{data.archetype}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-700 pb-1">
                            <span className="text-slate-400">Alvo:</span><span className="font-bold">{data.geography.city}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-700 pb-1">
                            <span className="text-slate-400">Verba:</span><span className="font-bold text-emerald-400">R$ {data.financials.monthlyBudget}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block mb-1">Ataque (Inclusão):</span>
                            <div className="flex flex-wrap gap-1 mb-2">{data.targeting.tribeReferences.map(t => <span key={t} className="bg-emerald-900 text-emerald-200 px-1.5 rounded text-[10px]">{t}</span>)}</div>
                        </div>
                        <div>
                            <span className="text-slate-400 block mb-1">Defesa (Exclusão):</span>
                            <div className="flex flex-wrap gap-1">{data.targeting.negativeHints.length > 0 ? data.targeting.negativeHints.map(t => <span key={t} className="bg-red-900 text-red-200 px-1.5 rounded text-[10px]">{t}</span>) : <span className="text-slate-600 italic">Nenhum bloqueio</span>}</div>
                        </div>
                    </div>

                    <button onClick={handleConfirmScanning} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all transform hover:scale-105">
                        EXECUTAR VARREDURA TÁTICA
                    </button>
                </>
            )}
        </div>
    );
};
