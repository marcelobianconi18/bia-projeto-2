import { getWeeklyHeatmapDigital } from './connectors';
import { runIbgeScan } from './connectors/ibgeConnector';
import { generateHotspots } from './hotspotsEngine';
import { BriefingInteligente } from '../types';

export type ApiStatus = 'REAL_LIVE' | 'REAL_STATIC' | 'SIMULATED' | 'ERROR' | 'DISCONNECTED';

export interface HealthReport {
    service: string;
    status: ApiStatus;
    latencyMs: number;
    message: string;
    lastCheck: string;
}

// Helper para medir latência
async function measure<T>(fn: () => Promise<T>): Promise<[T | null, number, any]> {
    const start = performance.now();
    try {
        const result = await fn();
        const end = performance.now();
        return [result, Math.round(end - start), null];
    } catch (error) {
        const end = performance.now();
        return [null, Math.round(end - start), error];
    }
}

// 1. PROTOCOLO META ADS (Audience Network)
export async function verifyMetaStatus(): Promise<HealthReport> {
    const apiKey = import.meta.env.VITE_META_ACCESS_TOKEN; // Ou process.env
    if (!apiKey) return { service: 'Meta Ads', status: 'DISCONNECTED', latencyMs: 0, message: 'Token não encontrado', lastCheck: new Date().toISOString() };

    // Teste: Buscar Heatmap Digital
    const [res, latency, err] = await measure(() => getWeeklyHeatmapDigital());

    if (err) return { service: 'Meta Ads', status: 'ERROR', latencyMs: latency, message: err.message || 'Erro desconhecido', lastCheck: new Date().toISOString() };

    // Análise de Provenance (Verdadeiro vs Simulado)
    const provenance = res?.provenance?.label || 'UNKNOWN';
    let status: ApiStatus = 'SIMULATED';

    if (provenance === 'REAL') status = 'REAL_LIVE';
    if (provenance === 'DERIVED' || provenance === 'UNAVAILABLE') status = 'SIMULATED';

    return {
        service: 'Meta Ads (Audience)',
        status,
        latencyMs: latency,
        message: res?.provenance?.notes || 'Conexão estabelecida',
        lastCheck: new Date().toISOString()
    };
}

// 2. PROTOCOLO GOOGLE (Places & Trends)
export async function verifyGoogleStatus(): Promise<HealthReport> {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
    if (!apiKey) return { service: 'Google Services', status: 'DISCONNECTED', latencyMs: 0, message: 'API Key ausente', lastCheck: new Date().toISOString() };

    // Teste: Simular uma busca de Hotspots em modo REAL
    // Mock briefing that satisfies the BriefingInteligente interface
    const mockBriefing: any = {
        id: 'health-check',
        name: 'Probe',
        businessName: 'Probe',
        mainTopic: 'Teste',
        operationalModel: 'RADIUS',
        marketPositioning: 'Premium', // valid enum
        objective: 'DominateRegion', // valid enum
        dataSources: { googleAds: { connected: false }, metaAds: { connected: false }, rfb: { connected: false }, ibge: { connected: false }, osm: { connected: false } },
        geography: { city: 'São Paulo', state: ['SP'], country: 'BR', level: 'City' },
        productDescription: ' probe',
        contactMethod: ' probe',
        usageDescription: ' probe',
        targetAge: [],
        targetGender: 'Mixed'
    };

    // Forçamos isRealOnly = true para testar a "verdade"
    // Using explicit center for SP Capital
    const [res, latency, err] = await measure(async () => generateHotspots(mockBriefing, [-23.55, -46.63], true));

    if (err) return { service: 'Google Places/Maps', status: 'ERROR', latencyMs: latency, message: err.message || 'Erro desconhecido', lastCheck: new Date().toISOString() };

    // Se retornou vazio em SP Capital, algo está errado ou desconectado
    if (Array.isArray(res) && res.length === 0) {
        return { service: 'Google Places/Maps', status: 'ERROR', latencyMs: latency, message: 'Retornou 0 resultados em zona densa (SP)', lastCheck: new Date().toISOString() };
    }

    const firstItem = res && res[0];
    const itemProv = firstItem?.provenance;
    const source = itemProv?.source || '';
    const label = itemProv?.label;

    let status: ApiStatus = 'REAL_LIVE';

    if (label === 'UNAVAILABLE') status = 'ERROR';
    else if (source.includes('IBGE') || source.includes('STATIC')) status = 'REAL_STATIC'; // Fallback do IBGE funcionou
    else if (source.includes('MOCK') || source.includes('INTERNAL')) status = 'SIMULATED';

    // If it was REAL_ONLY but we got UNAVAILABLE, treat as error/warning for Google Health but could mean IBGE fallback missing
    if (label === 'UNAVAILABLE' && source === 'IBGE') {
        return { service: 'Google/IBGE Fallback', status: 'ERROR', latencyMs: latency, message: 'Fallback Estático falhou em SP', lastCheck: new Date().toISOString() };
    }

    return {
        service: 'Google Geo',
        status,
        latencyMs: latency,
        message: `Fonte: ${source}`,
        lastCheck: new Date().toISOString()
    };
}

// 3. PROTOCOLO IBGE (Censo & Demografia)
export async function verifyIbgeStatus(): Promise<HealthReport> {
    // IBGE é Open Data, não costuma ter chave, mas testamos a conectividade com a API do Service
    const [res, latency, err] = await measure(() => runIbgeScan("São Paulo", "SP"));

    if (err) return { service: 'IBGE Gov API', status: 'ERROR', latencyMs: latency, message: err.message || 'Erro desconhecido', lastCheck: new Date().toISOString() };

    // Check if result itself indicates error
    if (!res || (res as any).status === 'ERROR') {
        return { service: 'IBGE Gov API', status: 'ERROR', latencyMs: latency, message: (res as any)?.notes || 'Falha interna', lastCheck: new Date().toISOString() };
    }

    // IBGE pode ser parcial (só pop, sem renda)
    // The runIbgeScan returns a ConnectorResult directly
    const isPartial = res?.status === 'PARTIAL';
    const provenance = res?.provenance;

    return {
        service: 'IBGE Data',
        status: (provenance === 'REAL' || provenance === 'PARTIAL_REAL') ? 'REAL_LIVE' : 'SIMULATED',
        latencyMs: latency,
        message: isPartial ? 'Dados Parciais (Pop OK, Renda N/A)' : 'Dados Completos',
        lastCheck: new Date().toISOString()
    };
}

// ORQUESTRADOR DE DIAGNÓSTICO
export async function runFullSystemDiagnosis(): Promise<HealthReport[]> {
    const meta = await verifyMetaStatus();
    const google = await verifyGoogleStatus();
    const ibge = await verifyIbgeStatus();

    return [meta, google, ibge];
}
