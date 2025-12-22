import React, { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

type Props = { children: ReactNode };
type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
    // 👇 Força o TS a reconhecer props mesmo se alguma tipagem estiver “capenga”
    declare props: Props;

    state: State = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="h-full w-full flex flex-col items-center justify-center bg-slate-950 text-white p-8 font-mono">
                    <div className="bg-red-500/10 p-4 rounded-full mb-4 ring-2 ring-red-500/50">
                        <AlertTriangle size={48} className="text-red-500" />
                    </div>

                    <h1 className="text-xl font-black uppercase tracking-widest mb-2 text-red-100">
                        Falha no sistema tático
                    </h1>

                    <p className="text-sm text-red-200/60 mb-8 max-w-md text-center">
                        Ocorreu uma falha de renderização. Recarregue para retomar.
                    </p>

                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold uppercase tracking-wider transition-all"
                    >
                        <RefreshCw size={18} /> Reiniciar
                    </button>

                    {this.state.error && (
                        <pre className="mt-8 p-4 bg-black/50 rounded border border-white/5 text-[10px] text-slate-400 w-full max-w-lg overflow-auto max-h-40">
                            {String(this.state.error)}
                        </pre>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}
