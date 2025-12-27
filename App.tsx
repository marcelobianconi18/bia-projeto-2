import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { MetaCommandCenter } from './components/MetaCommandCenter'; // A Estrela do Show
import { BriefingWizard } from './components/BriefingWizard';
import { BriefingInteligente } from './types';

// --- MODO SINGLE FOCUS ATIVADO ---
// Removidos: CockpitHome, ExplorerPage (Lazy Imports deletados para performance)

function App() {
  // Estado Inicial: Se não tem briefing, mostra Wizard (se já tiver sido salvo no passado, idealmente persistiria, mas aqui reseta)
  const [hasBriefing, setHasBriefing] = useState(false);
  const [currentView, setCurrentView] = useState('COMMAND_CENTER'); // Default View forçada
  const [briefingData, setBriefingData] = useState<BriefingInteligente | null>(null);

  const handleBriefingComplete = (data: BriefingInteligente) => {
    console.log("🚀 [PROTOCOL SINGLE_FOCUS] Briefing concluído. Iniciando War Room...");
    setBriefingData(data);
    setHasBriefing(true);
    setCurrentView('COMMAND_CENTER'); // Redirecionamento Imediato (0 cliques)
  };

  // Se ainda não fez o briefing, mostre o Wizard (Tela Cheia)
  if (!hasBriefing) {
    return (
      <div className="h-screen w-screen bg-slate-950 text-white flex items-center justify-center">
        <BriefingWizard onComplete={handleBriefingComplete} />
      </div>
    );
  }

  // App Principal (Layout Simplificado)
  return (
    <div className="flex h-screen w-screen bg-[#f0f2f5] overflow-hidden">

      {/* Navegação Minimalista */}
      <Sidebar
        currentView={currentView}
        onChangeView={setCurrentView}
        onLogout={() => setHasBriefing(false)}
      />

      {/* Área de Conteúdo */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {/* ROTEAMENTO OTIMIZADO 
            Neste modo, apenas o COMMAND_CENTER existe.
            A estrutura switch/case foi mantida apenas para extensibilidade futura (ex: Settings),
            mas o foco hoje é 100% Meta Ads.
        */}
        {currentView === 'COMMAND_CENTER' && briefingData && (
          <MetaCommandCenter briefingData={briefingData} />
        )}

        {/* Fallback de Segurança */}
        {currentView !== 'COMMAND_CENTER' && (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            Funcionalidade em desenvolvimento ou restrita ao Admin.
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
