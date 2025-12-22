import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="h-full w-full flex flex-col items-center justify-center bg-slate-950 text-white p-8 font-mono">
                    <div className="bg-red-500/10 p-4 rounded-full mb-4 ring-2 ring-red-500/50">
                        <AlertTriangle size={48} className="text-red-500" />
                    </div>
                    <h1 className="text-xl font-black uppercase tracking-widest mb-2 text-red-100">Falha no sistema Tático</h1>
                    <p className="text-sm text-red-200/60 mb-8 max-w-md text-center">
                        Uma interrupção crítica ocorreu na renderização do componente. Os protocolos de segurança foram ativados.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold uppercase tracking-wider transition-all"
                    >
                        <RefreshCw size={18} /> Reiniciar Sistema
                    </button>

                    {this.state.error && (
                        <div className="mt-8 p-4 bg-black/40 rounded border border-red-900/30 text-[10px] text-red-300 font-mono w-full max-w-lg overflow-auto">
                            {this.state.error.toString()}
                        </div>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}
