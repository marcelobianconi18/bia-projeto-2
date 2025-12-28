import { BriefingInteligente, GeoSignal } from '../types';

/**
 * BIANCONI SCAN ORCHESTRATOR (v4.1 - DEEP TARGETING SUPPORT)
 * Suporta roteamento inteligente e enriquece a inteligência tática com sugestões de exclusão.
 */

export async function runBriefingScan(briefing: BriefingInteligente): Promise<BriefingInteligente> {
    console.log(`--- BIA ORCHESTRATOR v4.1 [${briefing.archetype}] ---`);

    const enrichedBriefing = { ...briefing };

    try {
        // 1. ROTEAMENTO DE GEOGRAFIA (Polimorfismo)
        let locationToScan = briefing.geography.city;

        if (briefing.archetype !== 'LOCAL_BUSINESS') {
            // Modo Macro: Se vazio, assume 'Brasil'
            if (!locationToScan) locationToScan = 'Brasil';
            console.log(`🌍 Modo Digital/Persona Detectado. Alvo Expandido: ${locationToScan}`);
        } else {
            console.log(`📍 Modo Local Detectado. Alvo Preciso: ${locationToScan}`);
        }

        // 2. CHAMADA AO BACKEND (Recuperação de Hotspots)
        await executeBackendScan(enrichedBriefing, locationToScan);

        // 3. PÓS-PROCESSAMENTO TÁTICO (Simulando Gemini Deep Targeting)
        // Aqui injetamos sugestões de exclusão baseadas nos 'negativeHints' e 'financials'
        simulateDeepTargetingAnalysis(enrichedBriefing);

    } catch (error) {
        console.error("🚨 [ORCHESTRATOR CRITICAL]", error);
        injectFallbackData(enrichedBriefing);
    }

    return enrichedBriefing;
}

// Chama Backend para Hotspots
async function executeBackendScan(briefing: BriefingInteligente, locationQuery: string) {
    console.log(`📡 Solicitando Radar Tático para: ${locationQuery}...`);

    // Payload preparado
    const briefingPayload = {
        ...briefing,
        geography: { ...briefing.geography, city: locationQuery }
    };

    const response = await fetch('/api/intelligence/hotspots-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ briefing: briefingPayload })
    });

    if (!response.ok) throw new Error(`Backend Error: ${response.status}`);
    const data = await response.json();

    if (data.status === 'success' && data.data?.hotspots) {
        console.log(`✅ [BACKEND] Recebidos ${data.data.hotspots.length} pontos.`);

        // Inicializa GeoSignal
        briefing.geoSignals = {
            hotspots: data.data.hotspots,
            scannedArea: { lat: data.data.center[0], lng: data.data.center[1], radiusKm: 50 },
            bestSegments: [],
            excludedSegments: [],
            competitorsFound: briefing.targeting.tribeReferences
        };
        // Sincroniza Centro
        briefing.geography.lat = data.data.center[0];
        briefing.geography.lng = data.data.center[1];
    } else {
        throw new Error("Dados vazios do backend");
    }
}

// Simula a Análise Semântica que o Gemini faria
function simulateDeepTargetingAnalysis(briefing: BriefingInteligente) {
    if (!briefing.geoSignals) return;

    // A. Análise de Inclusão (Baseado nas Tribos + Arquétipo)
    let inclusions = ['Compradores Engajados', 'Interesse em Tecnologia'];
    if (briefing.financials.ticketPrice > 500) inclusions.push('Viajantes Internacionais Frequentes', 'Usuários de iPhone');
    if (briefing.archetype === 'PUBLIC_FIGURE') inclusions.push('Leitores de Notícias', 'Interesse em Política');

    // B. Análise de Exclusão (Blocklist Lógica)
    let exclusions = ['Caçadores de Promoção', 'Acesso via 2G/3G'];

    // Se ticket alto, bloqueia renda baixa inferida
    if (briefing.financials.ticketPrice > 200) {
        exclusions.push('Usuários de Feature Phones');
        exclusions.push('Acesso via Facebook Lite');
    }

    // Se citou 'Sem dinheiro' nos hints
    const negativeText = briefing.targeting.negativeHints.join(' ').toLowerCase();
    if (negativeText.includes('dinheiro') || negativeText.includes('gratis')) {
        exclusions.push('Free Trial Seekers');
        exclusions.push('Baixo Engajamento de Compra');
    }

    briefing.geoSignals.bestSegments = inclusions;
    briefing.geoSignals.excludedSegments = exclusions;

    console.log(`🛡️ [DEEP TARGETING] Gerado: ${inclusions.length} Inclusões / ${exclusions.length} Exclusões`);
}

function injectFallbackData(briefing: BriefingInteligente) {
    briefing.geoSignals = {
        hotspots: [],
        scannedArea: { lat: -23.55, lng: -46.63, radiusKm: 10 },
        bestSegments: [],
        excludedSegments: [],
        competitorsFound: []
    };
}
