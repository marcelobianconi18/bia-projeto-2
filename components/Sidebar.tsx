import React from 'react';
import { Target, Settings, LogOut, Sun, Moon } from 'lucide-react';
import { useTheme } from '../src/context/ThemeContext';

interface SidebarProps {
  currentView: string;
  onChangeView: (view: any) => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, onLogout }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="w-16 h-full liquid-card border-r border-r-[rgba(var(--glass-border),0.1)] flex flex-col items-center py-6 z-[1003] transition-all duration-300">
      {/* 1. BRAND IDENTITY (Logo) */}
      <div className="mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
          <span className="font-bold text-white text-lg">B</span>
        </div>
      </div>

      {/* 2. OPERATIONAL CORE */}
      <div className="flex-1 w-full flex flex-col items-center gap-4">
        <button
          onClick={() => onChangeView('COMMAND_CENTER')}
          className={`p-3 rounded-xl transition-all duration-300 group relative
            ${currentView === 'COMMAND_CENTER'
              ? 'bg-accent text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]'
              : 'text-[rgb(var(--text-secondary))] hover:bg-[rgba(var(--glass-bg),0.5)] hover:text-[rgb(var(--text-primary))]'
            }`}
          title="War Room (Meta Ads)"
        >
          <Target size={24} />
          {/* Tooltip Lateral */}
          <span className="absolute left-14 bg-[rgb(var(--bg-app))] text-[rgb(var(--text-primary))] text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-[rgba(var(--glass-border),0.1)] z-50 shadow-xl">
            War Room
          </span>
        </button>
      </div>

      {/* 3. UTILITIES (Rodapé) */}
      <div className="flex flex-col gap-4 mt-auto items-center">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-[rgb(var(--text-secondary))] hover:text-accent transition-transform hover:rotate-12"
          title={theme === 'light' ? "Mudar para Dark Mode" : "Mudar para Light Mode"}
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        <button className="p-2 text-[rgb(var(--text-secondary))] hover:text-accent transition-colors" title="Configurações">
          <Settings size={20} />
        </button>
        <button className="p-2 text-[rgb(var(--text-secondary))] hover:text-red-400 transition-colors" title="Sair" onClick={onLogout}>
          <LogOut size={20} />
        </button>
      </div>
    </div>
  );
};
