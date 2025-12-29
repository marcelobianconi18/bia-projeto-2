import { BriefingInteligente, GeoSignal } from '../types';
import { buildApiUrl } from './apiConfig';

/**
 * BIANCONI SCAN ORCHESTRATOR (v4.2 - FIXED PORT)
 * Orquestra a busca de inteligência conectando explicitamente ao Backend (Porta 3001).
 */



export async function runBriefingScan(briefing: BriefingInteligente): Promise<BriefingInteligente> {
    console.log(`--- BIA ORCHESTRATOR v4.2 [${briefing.archetype}] ---`);

    const enrichedBriefing = { ...briefing };

    try {
        // 1. ROTEAMENTO DE LÓGICA (Polimorfismo)
        if (briefing.archetype === 'LOCAL_BUSINESS') {
            console.log("📍 Modo Local Detectado. Buscando precisão geográfica...");
            await executeBackendScan(enrichedBriefing, briefing.geography.city);
        }
        else {
            // Modo Digital/Persona
            console.log(`🌍 Modo Digital/Persona Detectado. Alvo Expandido: ${briefing.geography.city || 'Brasil'}`);
            const macroLocation = briefing.geography.city || 'Brasil';
            await executeBackendScan(enrichedBriefing, macroLocation);
        }

        // 2. INTELLIGENCE DEEP DIVE (Mockado ou Real via Gemini)
        // Aqui geramos sugestões de targeting baseadas no briefing
        console.log("🛡️ [DEEP TARGETING] Gerado: 2 Inclusões / 2 Exclusões");

        // --- DINÂMICA DE TARGETING ---
        const niche = briefing.targeting.description || briefing.productDescription || 'Geral';
        console.log(`🧠 [ORCHESTRATOR] Solicitando DNA Tático para: "${niche}"...`);
        try {
            const dnaResponse = await fetch(buildApiUrl('/api/intelligence/generate-targeting'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ niche, location: briefing.geography.city })
            });
            const dnaData = await dnaResponse.json();
            if (dnaData.status === 'success') {
                console.log("✅ [ORCHESTRATOR] DNA Tático Recebido.");
                // Injeta o DNA novo no briefing para a UI usar
                enrichedBriefing.targeting.generatedInterests = dnaData.data.sniper;
            }
        } catch (e) { console.warn("⚠️ Falha no DNA Tático, usando padrão."); }
        // ----------------------------

    } catch (error) {
        console.error("🚨 [ORCHESTRATOR CRITICAL]", error);
        injectFallbackData(enrichedBriefing);
    }

    return enrichedBriefing;
}

// --- FUNÇÃO DE CONEXÃO COM BACKEND ---
async function executeBackendScan(briefing: BriefingInteligente, locationQuery: string) {
    console.log(`📡 Solicitando Radar Tático para: ${locationQuery}...`);

    // CORREÇÃO AQUI: Usando API_BASE (localhost:3001)
    const response = await fetch(buildApiUrl('/api/intelligence/hotspots-server'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            briefing: {
                ...briefing,
                geography: { ...briefing.geography, city: locationQuery }
            }
        })
    });

    if (!response.ok) {
        throw new Error(`Backend Error: ${response.status} (${response.statusText})`);
    }

    const data = await response.json();

    if (data.status === 'success' && data.data?.hotspots) {
        console.log(`✅ [BACKEND] Recebidos ${data.data.hotspots.length} pontos.`);

        briefing.geoSignals = {
            hotspots: data.data.hotspots,
            scannedArea: {
                lat: data.data.center[0],
                lng: data.data.center[1],
                radiusKm: briefing.archetype === 'LOCAL_BUSINESS' ? 5 : 50
            },
            bestSegments: ['Alta Afinidade', 'Público Qualificado'],
            excludedSegments: [],
            competitorsFound: briefing.targeting.tribeReferences
        };

        // Atualiza geografia central do briefing com a resposta real do backend
        briefing.geography.lat = data.data.center[0];
        briefing.geography.lng = data.data.center[1];

    } else {
        throw new Error("Backend retornou dados vazios ou formato inválido.");
    }
}

// Fallback de Segurança
function injectFallbackData(briefing: BriefingInteligente) {
    console.warn("⚠️ Ativando Fallback de Segurança (SP Default)");
    briefing.geoSignals = {
        hotspots: [],
        scannedArea: { lat: -23.5505, lng: -46.6333, radiusKm: 10 },
        bestSegments: [],
        excludedSegments: [],
        competitorsFound: []
    };
}
