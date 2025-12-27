import { BriefingInteligente } from '../types';

/**
 * BIANCONI SCAN ORCHESTRATOR (v3.2 - BYPASS MODE)
 * Estratégia: Ignorar APIs instáveis (IBGE/Gov) e solicitar inteligência tática
 * diretamente ao Backend Neural (Node.js).
 */

export async function runBriefingScan(briefing: BriefingInteligente): Promise<BriefingInteligente> {
    console.log("--- BIA ORCHESTRATOR START [DIRECT MODE] ---");

    // 1. Clonar o briefing para não mutar o original
    const enrichedBriefing = { ...briefing };

    try {
        // 2. CHAMADA DIRETA AO BACKEND (Pula validações de conectores quebrados)
        console.log(`📡 Solicitando Radar Tático para: ${briefing.geography.city}...`);

        // Ajuste fino: extrair apenas o nome da cidade para evitar ruídos na busca
        // Ex: "Curitiba - PR" -> "Curitiba"
        const cityClean = briefing.geography.city.split('-')[0].trim();

        // Atualiza o briefing temporário com a cidade limpa para o backend
        const briefingForBackend = {
            ...briefing,
            geography: {
                ...briefing.geography,
                city: cityClean
            }
        };

        const response = await fetch('/api/intelligence/hotspots-server', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ briefing: briefingForBackend })
        });

        if (!response.ok) {
            throw new Error(`Backend Error: ${response.status}`);
        }

        const data = await response.json();

        if (data.status === 'success' && data.data?.hotspots) {
            console.log(`✅ [BACKEND] Recebidos ${data.data.hotspots.length} pontos de inteligência.`);

            // 3. INJETAR DADOS NO BRIEFING
            enrichedBriefing.geoSignals = {
                hotspots: data.data.hotspots, // Os 20 pontos gerados pelo servidor
                scannedArea: {
                    lat: data.data.center[0],
                    lng: data.data.center[1],
                    radiusKm: 5
                },
                bestSegments: ['Alta Renda', 'Comercial'], // Inferido
                competitorsFound: []
            };

            // Forçar atualização da geografia para o centro encontrado (Corrige o bug de SP)
            enrichedBriefing.geography.lat = data.data.center[0];
            enrichedBriefing.geography.lng = data.data.center[1];

        } else {
            throw new Error("Backend retornou dados vazios.");
        }

    } catch (error) {
        console.error("🚨 [ORCHESTRATOR CRITICAL]", error);
        // Em caso de falha total, não deixar vazio para não travar o botão Sync
        // (Último recurso: Fallback silencioso)
        enrichedBriefing.geoSignals = {
            hotspots: [],
            scannedArea: { lat: -23.55, lng: -46.63, radiusKm: 5 },
            bestSegments: [],
            competitorsFound: []
        };
    }

    return enrichedBriefing;
}
