import React, { useEffect, useMemo, useState } from 'react';
import { Timeseries168h } from '../types';
import { Loader2, AlertTriangle, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ProvenanceBadge } from './ProvenanceBadge';

interface Timeseries168WidgetProps {
    region: { kind: string; id?: string; city: string };
    isRealOnly: boolean;
}

/** validação mínima e segura (sem “inventar”) */
function isValidTimeseries168(payload: any): payload is Timeseries168h {
    const valuesOk =
        Array.isArray(payload?.values) &&
        (payload.values.length === 168 || payload.values.length === 0) &&
        payload.values.every((v: any) => typeof v === 'number' && Number.isFinite(v) && v >= 0);

    const provOk =
        payload?.provenance &&
        typeof payload.provenance.label === 'string' &&
        typeof payload.provenance.source === 'string';

    return Boolean(valuesOk && provOk);
}

export const Timeseries168Widget: React.FC<Timeseries168WidgetProps> = ({ region, isRealOnly }) => {
    const [loading, setLoading] = useState(false);
    const [ts, setTs] = useState<Timeseries168h | null>(null);
    const [error, setError] = useState<string | null>(null);

    // REAL_ONLY: não faz fetch; não renderiza Recharts; não “chuta curva”
    useEffect(() => {
        if (isRealOnly) {
            setLoading(false);
            setTs(null);
            setError(null);
            return;
        }

        const TIMEOUT_MS = 8000;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const source = 'GOOGLE_ADS';
        const regionKind = 'MUNICIPIO';
        const regionId = region.id ?? region.city;
        let alive = true;

        (async () => {
            try {
                setLoading(true);
                setError(null);

                const res = await fetch(
                    `/api/insights/timeseries168?source=${encodeURIComponent(source)}&regionKind=${encodeURIComponent(
                        regionKind
                    )}&regionId=${encodeURIComponent(regionId)}&tz=America/Sao_Paulo&windowDays=28`,
                    { signal: controller.signal }
                );

                // Stubs: 501 NOT_CONFIGURED
                if (res.status === 501) {
                    let j: any = null;
                    try { j = await res.json(); } catch { }

                    if (alive) {
                        setTs({
                            values: [],
                            provenance: {
                                label: 'NOT_CONFIGURED',
                                source: j?.connector || 'GOOGLE_ADS',
                                method: 'stub',
                                notes: j?.message || 'Fonte não configurada'
                            } as any
                        } as Timeseries168h);
                    }
                    return;
                }

                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const json = await res.json();
                if (!isValidTimeseries168(json)) throw new Error('INVALID_SCHEMA');

                if (alive) setTs(json);
            } catch (err: any) {
                if (!alive) return;
                if (err?.name === 'AbortError') {
                    setError('Timeout');
                } else {
                    console.error('Timeseries Fetch Error', err);
                    setError('Erro ao carregar');
                }
                setTs(null);
            } finally {
                clearTimeout(timeout);
                if (alive) setLoading(false);
            }
        })();

        return () => {
            alive = false;
            clearTimeout(timeout);
            controller.abort();
        };
    }, [isRealOnly, region.id, region.city]);

    const ok168 = !!ts?.values && ts.values.length === 168;

    const isUnavailable =
        isRealOnly ||
        ts?.provenance?.label === 'UNAVAILABLE' ||
        ts?.provenance?.label === 'NOT_CONFIGURED' ||
        !ok168;

    const formatTime = (idx: number) => {
        if (idx < 0) return '--';
        const dayMap = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
        const day = Math.floor(idx / 24);
        const hour = idx % 24;
        return `${dayMap[day] || ''} ${hour}h`;
    };

    const chartData = useMemo(() => {
        if (!ts?.values || ts.values.length !== 168) return [];
        return ts.values.map((v, i) => ({ label: formatTime(i), value: v }));
    }, [ts]);

    const { best, worst } = useMemo(() => {
        let b = { val: -1, idx: -1 };
        let w = { val: Infinity, idx: -1 };
        if (ts?.values?.length === 168) {
            ts.values.forEach((v, idx) => {
                if (v > b.val) b = { val: v, idx };
                if (v < w.val) w = { val: v, idx };
            });
        }
        return { best: b, worst: w };
    }, [ts]);

    // Loading
    if (loading) {
        return (
            <div className="p-4 flex justify-center">
                <Loader2 className="animate-spin text-ok" />
            </div>
        );
    }

    // Error
    if (error) {
        return (
            <div className="p-4 border border-red-900/50 bg-red-900/10 rounded flex items-center gap-2">
                <AlertTriangle className="text-red-500" size={16} />
                <span className="text-xs text-red-400 font-mono">{error}</span>
            </div>
        );
    }

    // REAL_ONLY / NOT_CONFIGURED / UNAVAILABLE
    if (isUnavailable) {
        return (
            <div className="p-4 text-center border border-dashed border-app rounded">
                <div className="text-[10px] text-muted2 uppercase font-black">UNAVAILABLE</div>
                <div className="text-[9px] text-muted mt-1">
                    {isRealOnly ? 'REAL_ONLY: fonte Ads desativada' : (ts?.provenance?.label ?? 'SEM_DADOS')}
                </div>
            </div>
        );
    }

    // Render chart (à prova de -1): dá altura explícita
    return (
        <div className="w-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-black text-app uppercase tracking-widest flex items-center gap-2">
                    <Clock size={14} className="text-purple-400" />
                    DATA_HORA (168h)
                </h3>
                {ts?.provenance && <ProvenanceBadge provenance={ts.provenance} small />}
            </div>

            <div className="w-full h-[180px] min-h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="label" stroke="var(--muted-2)" tick={{ fontSize: 9 }} interval={23} />
                        <YAxis hide />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                            itemStyle={{ color: 'var(--text)', fontSize: '11px', fontWeight: 'bold' }}
                            labelStyle={{ color: 'var(--muted)', fontSize: '9px', marginBottom: '4px' }}
                        />
                        <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorValue)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-3 p-3 border-t border-app bg-surface2 grid grid-cols-2 gap-2">
                <div className="text-[9px] text-muted">
                    Melhor: <span className="text-ok font-bold">{formatTime(best.idx)}</span>
                </div>
                <div className="text-[9px] text-muted">
                    Pior: <span className="text-red-500 font-bold">{formatTime(worst.idx)}</span>
                </div>
            </div>
        </div>
    );
};
