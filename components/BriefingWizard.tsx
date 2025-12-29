import React, { useState, useEffect, useRef } from 'react';
import { Target, ArrowRight, MapPin, Search, Store, Globe, Megaphone, CheckCircle, Loader2, ShieldAlert, BadgeCheck, X, Instagram, Hash } from 'lucide-react';
import { BriefingInteligente } from '../types';
import { runBriefingScan } from '../services/scanOrchestrator';
import { searchMetaInterests } from '../services/connectors/metaAdsConnector';

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

// COMPONENTE: INSTAGRAM PROFILE SEARCH
const InstagramProfileSearch = ({
    placeholder,
    onAdd,
    currentCount,
    maxLimit = 10,
    variant = 'positive'
}: {
    placeholder: string,
    onAdd: (val: string) => void,
    currentCount: number,
    maxLimit?: number,
    variant?: 'positive' | 'negative'
}) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length >= 2) {
                setLoading(true);
                const results = await searchMetaInterests(query);

                setResults(results);
                setLoading(false);

                // Debug visual no console
                if (results.length === 0 && query.length > 3) {
                    console.log("⚠️ Nenhum resultado. Verifique se o Backend (Porta 3001) está rodando.");
                    console.log("⚠️ Dica: Verifique VITE_API_BASE_URL se estiver em outro ambiente.");
                }
            } else {
                setResults([]);
            }
        }, 400); // 400ms debounce
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
        if (currentCount >= maxLimit) {
            alert(`Limite de ${maxLimit} perfis atingido.`);
            return;
        }
        // Save format uses handle for UI consistency
        onAdd(item.handle || item.name);
        setQuery('');
        setResults([]);
    };

    const formatSize = (n: number) => {
        if (!n) return '?';
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
        return n;
    };

    return (
        <div className="relative flex-1" ref={wrapperRef}>
            <div className="flex gap-2 items-center">
                <Instagram size={20} className={variant === 'positive' ? 'text-pink-600' : 'text-slate-400'} />
                <input
                    className={`flex-1 p-3 border rounded-lg text-sm outline-none focus:ring-2 transition-all ${variant === 'positive' ? 'focus:ring-pink-200 border-pink-200' : 'focus:ring-red-200 border-slate-300'}`}
                    placeholder={placeholder}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    disabled={currentCount >= maxLimit}
                />
            </div>
            {/* Dropdown Results */}
            {results.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 shadow-xl rounded-b-lg z-50 max-h-72 overflow-y-auto mt-1 custom-scrollbar">
                    {results.map((item, idx) => (
                        <li key={item.id || idx} onClick={() => handleSelect(item)} className="p-2 hover:bg-slate-50 cursor-pointer border-b last:border-0 border-slate-100">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-1">
                                    <span className={`font-bold ${item.type === 'profile' ? 'text-blue-600' : 'text-slate-600'}`}>
                                        {item.name}
                                    </span>
                                    {/* Selo Azul Simulado */}
                                    {item.verified && (
                                        <svg className="w-3 h-3 text-blue-500 fill-current" viewBox="0 0 24 24">
                                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                                        </svg>
                                    )}
                                </div>
                                <span className="text-[10px] text-slate-400 font-medium">
                                    {item.followersText}
                                </span>
                            </div>
                        </li>
                    ))}
                </div>
            )}
            {/* Loading */}
            {loading && <div className="absolute right-3 top-3.5"><Loader2 size={16} className="animate-spin text-slate-400" /></div>}
        </div>
    );
};

export const BriefingWizard: React.FC<Props> = ({ onComplete }) => {
    const [step, setStep] = useState(0);
    const [data, setData] = useState<BriefingInteligente>(INITIAL_BRIEFING);
    const [isScanning, setIsScanning] = useState(false);

    const handleNext = () => setStep(s => s + 1);

    // Handlers
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

    const removePosTag = (tag: string) => {
        setData({ ...data, targeting: { ...data.targeting, tribeReferences: data.targeting.tribeReferences.filter(t => t !== tag) } });
    };

    const removeNegTag = (tag: string) => {
        setData({ ...data, targeting: { ...data.targeting, negativeHints: data.targeting.negativeHints.filter(t => t !== tag) } });
    };

    const handleConfirmScanning = async () => {
        setIsScanning(true);
        try {
            console.log(`🚀 Iniciando Scan Deep Targeting [${data.archetype}]...`);
            const enrichedData = await runBriefingScan(data);
            await new Promise(r => setTimeout(r, 1500));
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

    // STEP 2: ATAQUE E DEFESA (INSTAGRAM PROFILES)
    if (step === 2) return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-xl">
            <h2 className="text-2xl font-bold text-slate-800 mb-1">Estratégia de Alvo</h2>
            <p className="text-sm text-slate-500 mb-6">Defina de 1 a 10 perfis referência e quais deseja bloquear.</p>

            {/* CLUSTER A: INCLUSÃO (QUEM SEGUEM) */}
            <div className="mb-8">
                <div className="flex justify-between items-end mb-2">
                    <label className="flex items-center gap-2 text-sm font-bold text-pink-600 uppercase">
                        <BadgeCheck size={16} /> Tribo / Referências (Ataque)
                    </label>
                    <span className="text-xs text-slate-400">{data.targeting.tribeReferences.length}/10</span>
                </div>

                <InstagramProfileSearch
                    placeholder="Ex: @canvabrasil ou #marketing..."
                    onAdd={addPosTag}
                    currentCount={data.targeting.tribeReferences.length}
                    variant="positive"
                />

                <div className="flex flex-wrap gap-2 mt-3 min-h-[40px] p-3 bg-slate-50 rounded-lg border border-slate-100">
                    {data.targeting.tribeReferences.map(tag => (
                        <span key={tag} className="bg-white border border-pink-100 text-pink-700 pl-3 pr-2 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in zoom-in duration-300">
                            {tag} <button onClick={() => removePosTag(tag)} className="text-slate-300 hover:text-red-500 transition-colors"><X size={14} /></button>
                        </span>
                    ))}
                    {data.targeting.tribeReferences.length === 0 && <span className="text-slate-400 text-xs italic">Nenhum perfil adicionado.</span>}
                </div>
            </div>

            {/* CLUSTER B: EXCLUSÃO (QUEM EVITAR) */}
            <div className="mb-6">
                <div className="flex justify-between items-end mb-2">
                    <label className="flex items-center gap-2 text-sm font-bold text-red-600 uppercase">
                        <ShieldAlert size={16} /> Blocklist / Negativas (Defesa)
                    </label>
                    <span className="text-xs text-slate-400">{data.targeting.negativeHints.length}/10</span>
                </div>

                <InstagramProfileSearch
                    placeholder="Ex: @freefire ou perfis indesejados..."
                    onAdd={addNegTag}
                    currentCount={data.targeting.negativeHints.length}
                    variant="negative"
                />

                <div className="flex flex-wrap gap-2 mt-3 min-h-[40px] p-3 bg-slate-50 rounded-lg border border-slate-100">
                    {data.targeting.negativeHints.map(tag => (
                        <span key={tag} className="bg-white border border-red-100 text-red-700 pl-3 pr-2 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in zoom-in duration-300">
                            {tag} <button onClick={() => removeNegTag(tag)} className="text-slate-300 hover:text-red-500 transition-colors"><X size={14} /></button>
                        </span>
                    ))}
                    {data.targeting.negativeHints.length === 0 && <span className="text-slate-400 text-xs italic">Nenhum bloqueio definido.</span>}
                </div>
            </div>

            <button onClick={handleNext} disabled={data.targeting.tribeReferences.length < 1} className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition-all">
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

                    <div className="bg-slate-800 rounded-lg p-4 text-left mb-6 space-y-3 text-sm">
                        <div className="flex justify-between border-b border-slate-700 pb-2">
                            <span className="text-slate-400">Arquétipo:</span><span className="font-bold text-blue-400">{data.archetype}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-700 pb-2">
                            <span className="text-slate-400">Alvo:</span><span className="font-bold">{data.geography.city}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-700 pb-2">
                            <span className="text-slate-400">Verba:</span><span className="font-bold text-emerald-400">R$ {data.financials.monthlyBudget}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block mb-1">Ataque (Inclusão) - {data.targeting.tribeReferences.length} perfis:</span>
                            <div className="flex flex-wrap gap-1 mb-2 max-h-20 overflow-y-auto custom-scrollbar">{data.targeting.tribeReferences.map(t => <span key={t} className="bg-emerald-900 text-emerald-200 px-2 py-0.5 rounded text-xs">{t}</span>)}</div>
                        </div>
                        <div>
                            <span className="text-slate-400 block mb-1">Defesa (Exclusão) - {data.targeting.negativeHints.length} perfis:</span>
                            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto custom-scrollbar">{data.targeting.negativeHints.length > 0 ? data.targeting.negativeHints.map(t => <span key={t} className="bg-red-900 text-red-200 px-2 py-0.5 rounded text-xs">{t}</span>) : <span className="text-slate-600 italic">Nenhum bloqueio</span>}</div>
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
