import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { MetaCommandCenter } from './components/MetaCommandCenter';
import { BriefingWizard } from './components/BriefingWizard';
import { BriefingInteligente } from './types';
import { ThemeProvider } from './src/context/ThemeContext'; // Importe o Contexto

const App: React.FC = () => {
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

  // AQUI ESTÁ A MÁGICA DO TEMA
  return (
    <ThemeProvider>
      <div className="flex h-screen w-full overflow-hidden bg-[rgb(var(--bg-app))] text-[rgb(var(--text-primary))] transition-colors duration-500">
        {!hasBriefing ? (
          <div className="h-full w-full flex items-center justify-center">
            <BriefingWizard onComplete={handleBriefingComplete} />
          </div>
        ) : (
          <>
            <Sidebar
              currentView={currentView}
              onChangeView={setCurrentView}
              onLogout={() => setHasBriefing(false)}
            />
            <main className="flex-1 overflow-auto relative z-10 flex flex-col">
              {/* ROTEAMENTO OTIMIZADO */}
              {currentView === 'COMMAND_CENTER' && briefingData && (
                <MetaCommandCenter briefingData={briefingData} />
              )}
              {currentView !== 'COMMAND_CENTER' && (
                <div className="flex-1 flex items-center justify-center text-[rgb(var(--text-secondary))]">
                  Funcionalidade em desenvolvimento ou restrita ao Admin.
                </div>
              )}
            </main>
          </>
        )}
      </div>
    </ThemeProvider>
  );
};

export default App;
