import React, { useEffect, useState } from 'react';
import { runFullSystemDiagnosis, HealthReport } from '../services/apiHealthCheck';
import { AlertCircle, CheckCircle, WifiOff, Activity, ShieldAlert } from 'lucide-react';

export const SystemHealthMonitor = () => {
    const [reports, setReports] = useState<HealthReport[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        runFullSystemDiagnosis().then(data => {
            setReports(data);
            setLoading(false);
        });
    }, []);

    const getIcon = (status: string) => {
        switch (status) {
            case 'REAL_LIVE': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'REAL_STATIC': return <Activity className="w-5 h-5 text-purple-500" />;
            case 'SIMULATED': return <ShieldAlert className="w-5 h-5 text-yellow-500" />;
            case 'DISCONNECTED': return <WifiOff className="w-5 h-5 text-gray-400" />;
            default: return <AlertCircle className="w-5 h-5 text-red-500" />;
        }
    };

    const getLabel = (status: string) => {
        const map: Record<string, string> = {
            'REAL_LIVE': 'CONECTADO (LIVE)',
            'REAL_STATIC': 'CONECTADO (CACHE)',
            'SIMULATED': 'MODO SIMULAÇÃO',
            'ERROR': 'ERRO CRÍTICO',
            'DISCONNECTED': 'SEM CHAVE'
        };
        return map[status] || status;
    };

    if (loading) return <div className="text-xs text-app animate-pulse">Iniciando Protocolo de Auditoria...</div>;

    return (
        <div className="bg-surface2 border border-app rounded-2xl p-4 mb-4">
            <h3 className="text-[10px] font-black text-muted2 mb-3 uppercase tracking-[0.2em]">Status das Conexões (War Room)</h3>
            <div className="space-y-3">
                {reports.map((r) => (
                    <div key={r.service} className="flex items-center justify-between text-xs bg-app/50 p-3 rounded-xl border border-white/5">
                        <div className="flex items-center gap-3">
                            {getIcon(r.status)}
                            <div>
                                <span className="font-black text-app block tracking-tight uppercase">{r.service}</span>
                                <span className="text-[10px] text-muted font-medium">{r.message}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className={`block font-black text-[9px] uppercase tracking-widest ${r.status.includes('REAL') ? 'text-ok' : r.status === 'SIMULATED' ? 'text-accent' : 'text-red-500'}`}>
                                {getLabel(r.status)}
                            </span>
                            <span className="text-[9px] text-muted2 font-mono">{r.latencyMs}ms</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
