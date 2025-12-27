import React from 'react';
import { Target, Settings, LogOut, ShieldAlert } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onChangeView: (view: any) => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, onLogout }) => {
  return (
    <div className="w-16 bg-slate-900 flex flex-col items-center py-6 border-r border-slate-800 z-[1003]">
      {/* 1. BRAND IDENTITY (Logo) */}
      <div className="mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
          <span className="font-bold text-white text-lg">B</span>
        </div>
      </div>

      {/* 2. OPERATIONAL CORE (The Single Button) */}
      <div className="flex-1 w-full flex flex-col items-center gap-4">
        {/* WAR ROOM - Único Destino */}
        <button
          onClick={() => onChangeView('COMMAND_CENTER')}
          className={`p-3 rounded-xl transition-all duration-300 group relative
            ${currentView === 'COMMAND_CENTER'
              ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]'
              : 'text-slate-500 hover:text-blue-400 hover:bg-slate-800'
            }`}
          title="War Room (Meta Ads)"
        >
          <Target size={24} />
          {/* Tooltip Lateral */}
          <span className="absolute left-14 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-slate-700">
            War Room
          </span>
        </button>
      </div>

      {/* 3. UTILITIES (Rodapé) */}
      <div className="flex flex-col gap-4 mt-auto">
        <button className="p-2 text-slate-600 hover:text-slate-300 transition-colors" title="Configurações">
          <Settings size={20} />
        </button>
        <button className="p-2 text-slate-600 hover:text-red-400 transition-colors" title="Sair" onClick={onLogout}>
          <LogOut size={20} />
        </button>
      </div>
    </div>
  );
};
