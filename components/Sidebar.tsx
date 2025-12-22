
import React from 'react';
import { LayoutDashboard, Map, Settings, LogOut, Hexagon, ShieldAlert } from 'lucide-react';
import { DashboardView } from '../types';

interface SidebarProps {
  currentView: DashboardView;
  onChangeView: (view: DashboardView) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, onLogout }) => {
  return (
    <div className="w-20 h-full glass-panel border-r border-slate-200 flex flex-col items-center py-6 z-[2000] relative">
      {/* Brand Icon */}
      <div className="mb-8 w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
        <Hexagon className="text-white fill-current" size={20} />
      </div>

      {/* Navigation */}
      <div className="flex-1 flex flex-col gap-6 w-full px-2">
        <button
          onClick={() => onChangeView('COCKPIT')}
          className={`group flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${currentView === 'COCKPIT' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          title="Cockpit"
        >
          <LayoutDashboard size={24} className={currentView === 'COCKPIT' ? 'text-blue-600' : ''} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Cockpit</span>
        </button>

        <button
          onClick={() => onChangeView('EXPLORER')}
          className={`group flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${currentView === 'EXPLORER' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          title="Mapa"
        >
          <Map size={24} className={currentView === 'EXPLORER' ? 'text-blue-600' : ''} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Mapa</span>
        </button>

        <button
          onClick={() => onChangeView('COMMAND_CENTER')}
          className={`group flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${currentView === 'COMMAND_CENTER' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          title="Meta Ads Tactical"
        >
          <ShieldAlert size={24} className={currentView === 'COMMAND_CENTER' ? 'text-blue-600' : ''} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Meta Ads</span>
        </button>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col gap-4 mt-auto">
        <button className="text-slate-400 hover:text-blue-600 transition">
          <Settings size={20} />
        </button>
        <button onClick={onLogout} className="text-slate-400 hover:text-red-500 transition">
          <LogOut size={20} />
        </button>
      </div>
    </div>
  );
};
