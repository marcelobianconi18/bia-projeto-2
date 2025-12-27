import React, { useState } from 'react';
import { Target, ArrowRight, CheckCircle, Loader2, AlertTriangle, MapPin, Search } from 'lucide-react';
import { BriefingInteligente } from '../types';
import { runBriefingScan } from '../services/scanOrchestrator';

// MOCK INICIAL (Mantendo estrutura, focando na lógica de submit)
const INITIAL_BRIEFING: BriefingInteligente = {
  productDescription: '',
  targetGender: 'Todos',
  targetAge: '25-45',
  geography: { city: '', radius: 5, lat: 0, lng: 0 },
  geoSignals: null
};

interface Props {
  onComplete: (data: BriefingInteligente) => void;
}

export const BriefingWizard: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<BriefingInteligente>(INITIAL_BRIEFING);
  const [isScanning, setIsScanning] = useState(false);

  const handleNext = () => setStep(s => s + 1);

  // --- AQUI ESTAVA O ERRO ---
  // Versão Blindada: Não verifica status de conector individualmente.
  // Confia no Orchestrator.
  const handleConfirmScanning = async () => {
    setIsScanning(true);
    try {
      console.log("🚀 Iniciando Scan Seguro...");

      // 1. Executa a varredura (O Orchestrator já trata erros e retorna o objeto)
      const enrichedData = await runBriefingScan(data);

      // 2. Validação simples de segurança
      if (!enrichedData.geoSignals || enrichedData.geoSignals.hotspots.length === 0) {
        console.warn("⚠️ Nenhum hotspot retornado, mas avançando.");
      } else {
        console.log(`✅ ${enrichedData.geoSignals.hotspots.length} Hotspots carregados.`);

        // GARANTIA DE DADOS: Se o backend retornou hotspots, salve no estado para garantir
        // que o componente pai receba exatamente o que foi achado.
        setData(prev => ({
          ...prev,
          geoSignals: enrichedData.geoSignals,
          geography: {
            ...prev.geography,
            lat: enrichedData.geography.lat,
            lng: enrichedData.geography.lng
          }
        }));
      }

      // 3. Finaliza sem tentar ler propriedades inexistentes
      onComplete(enrichedData);

    } catch (error) {
      console.error("❌ Erro fatal no Wizard:", error);
      // Fallback de Emergência para não travar o usuário
      onComplete(data);
    } finally {
      setIsScanning(false);
    }
  };

  // RENDERIZADORES DE ETAPA (Simplificados para focar na correção)

  // STEP 1: PRODUTO
  if (step === 1) return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-xl">
      <h2 className="text-2xl font-bold text-slate-800 mb-4">O que vamos vender?</h2>
      <input
        className="w-full p-4 border border-slate-300 rounded-lg mb-4"
        placeholder="Ex: Apartamentos de luxo, Clínica de Estética..."
        value={data.productDescription}
        onChange={e => setData({ ...data, productDescription: e.target.value })}
      />
      <button onClick={handleNext} disabled={!data.productDescription} className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">
        Avançar <ArrowRight className="inline ml-2" size={18} />
      </button>
    </div>
  );

  // STEP 2: LOCAL
  if (step === 2) return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-xl">
      <h2 className="text-2xl font-bold text-slate-800 mb-4">Onde está o alvo?</h2>
      <div className="relative mb-4">
        <MapPin className="absolute left-3 top-3 text-slate-400" />
        <input
          className="w-full p-3 pl-10 border border-slate-300 rounded-lg"
          placeholder="Cidade (ex: Foz do Iguaçu)"
          value={data.geography.city}
          onChange={e => setData({ ...data, geography: { ...data.geography, city: e.target.value } })}
        />
      </div>
      <button onClick={() => setStep(3)} disabled={!data.geography.city} className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">
        Localizar Alvo <Search className="inline ml-2" size={18} />
      </button>
    </div>
  );

  // STEP 3: SCANNING (Onde ocorria o erro)
  return (
    <div className="max-w-2xl mx-auto p-8 bg-slate-900 text-white rounded-xl shadow-2xl text-center">
      <div className="mb-6 flex justify-center">
        {isScanning ? (
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center font-bold text-xs">SCAN</div>
          </div>
        ) : (
          <Target size={64} className="text-emerald-400 animate-pulse" />
        )}
      </div>

      <h2 className="text-2xl font-bold mb-2">
        {isScanning ? 'Triangulando Hotspots...' : 'Sistemas Prontos'}
      </h2>
      <p className="text-slate-400 mb-8">
        {isScanning
          ? 'Conectando ao Backend Neural e gerando matriz tática...'
          : `Alvo confirmado: ${data.geography.city}. Iniciar varredura?`}
      </p>

      {!isScanning && (
        <button
          onClick={handleConfirmScanning}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all transform hover:scale-105"
        >
          INICIAR VARREDURA TÁTICA
        </button>
      )}
    </div>
  );
};
