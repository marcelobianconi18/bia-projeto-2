import React, { useEffect, useState } from 'react';
import { X, Check, AlertTriangle, Info, LucideIcon, Sparkles } from 'lucide-react';
import * as Icons from 'lucide-react';

// Tipos SOTA
export type DialogType = 'MODAL_CENTER' | 'DRAWER_RIGHT' | 'TOAST_BOTTOM';
export type Intent = 'NEUTRAL' | 'POSITIVE' | 'DANGER' | 'WARNING';

export interface DialogAction {
    label: string;
    onClick: () => void;
    primary?: boolean;
}

export interface LiquidDialogProps {
    isOpen: boolean;
    onClose: () => void;
    type?: DialogType;
    intent?: Intent;
    header?: {
        icon?: string; // Nome do ícone Lucide
        title: string;
        badge?: string;
    };
    children?: React.ReactNode; // Content flexível (Grid Bento, Texto, etc)
    actions?: DialogAction[];
}

// Mapeamento de Cores por Intenção
const intentStyles: Record<Intent, string> = {
    NEUTRAL: 'border-[rgba(255,255,255,0.08)] bg-gradient-to-b from-white/5 to-transparent',
    POSITIVE: 'border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 to-transparent',
    DANGER: 'border-red-500/30 bg-gradient-to-b from-red-500/10 to-transparent',
    WARNING: 'border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-transparent',
};

export const LiquidDialog: React.FC<LiquidDialogProps> = ({
    isOpen, onClose, type = 'MODAL_CENTER', intent = 'NEUTRAL', header, children, actions
}) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setVisible(true);
            // Scroll lock
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => setVisible(false), 300); // Wait for exit anim
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isOpen && !visible) return null;

    // Resolve Icon Dinâmico
    const HeaderIcon = (header?.icon && (Icons as any)[header.icon]) ? (Icons as any)[header.icon] : Sparkles;

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? 'bg-black/60 backdrop-blur-[4px]' : 'bg-black/0 backdrop-blur-none pointer-events-none'}`} onClick={onClose}>

            {/* O PRÓPRIO VIDRO LÍQUIDO */}
            <div
                onClick={e => e.stopPropagation()}
                className={`
            relative flex flex-col w-full max-w-lg overflow-hidden
            backdrop-blur-[40px] shadow-2xl transition-all duration-500 cubic-bezier(0.175, 0.885, 0.32, 1.275)
            border-[1px] ${intentStyles[intent]}
            ${type === 'MODAL_CENTER' ? 'rounded-[32px]' : ''}
            ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-10'}
        `}
                style={{
                    boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.5)',
                    background: 'rgba(15, 23, 42, 0.75)' // Base escura translúcida (SOTA Dark)
                }}
            >
                {/* Specular Reflection (Borda Superior Brilhante) */}
                <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-70" />

                {/* HEADER */}
                {header && (
                    <div className="p-6 pb-2 flex items-center gap-4">
                        <div className={`p-3 rounded-2xl flex items-center justify-center shadow-inner ${intent === 'POSITIVE' ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30' : 'bg-white/5 text-white ring-1 ring-white/10'}`}>
                            <HeaderIcon size={24} />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-bold text-white tracking-tight">{header.title}</h3>
                                {header.badge && (
                                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                                        {header.badge}
                                    </span>
                                )}
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                )}

                {/* CONTENT (Bento Grid Friendly) */}
                <div className="p-6 pt-4 text-slate-300 font-light leading-relaxed">
                    {children}
                </div>

                {/* ACTIONS */}
                {actions && actions.length > 0 && (
                    <div className="p-6 pt-0 flex gap-3">
                        {actions.map((action, idx) => (
                            <button
                                key={idx}
                                onClick={action.onClick}
                                className={`
                            flex-1 py-3.5 px-4 rounded-xl font-bold transition-all
                            ${action.primary
                                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5'
                                        : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 hover:border-white/10'}
                        `}
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
