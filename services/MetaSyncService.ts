import { TARGETING_DNA, TargetingLayer } from './targetingDNA';

// --- 1. DEFINIÇÕES DE PROTOCOLO (TYPES) ---

interface GeoLocation {
    latitude: number;
    longitude: number;
    radius_meters: number;
    name: string;
}

interface AdSetPayload {
    name: string;
    optimization_goal: 'LEAD_GENERATION' | 'REACH';
    billing_event: 'IMPRESSIONS';
    daily_budget: number; // em centavos (BRL)
    targeting: {
        age_min: number;
        age_max: number;
        geo_locations: {
            custom_locations: GeoLocation[];
            location_types: ['home', 'recent'];
        };
        flexible_spec: Array<{
            interests: Array<{ id: string; name: string }>;
        }>;
    };
    status: 'PAUSED' | 'ACTIVE';
}

interface SyncResponse {
    success: boolean;
    campaign_id?: string;
    message: string;
    timestamp: string;
}

// --- 2. O MOTOR DE SINCRONIZAÇÃO (CLASS) ---

export class MetaSyncService {

    /**
     * Constrói o JSON final para a API do Facebook Marketing
     */
    public static buildPayload(
        budgetBRL: number,
        selectedHotspots: any[], // Dados da Zona [C2]
        targetingMode: TargetingLayer, // Dados da Zona [C1]
        drillRadiusKm: number // Dados da Zona [D]
    ): AdSetPayload {

        // 1. Converter Orçamento
        const budgetCents = Math.floor(budgetBRL * 100);

        // 2. Montar Geo-Locations (Baseado nos Hotspots Ativos + Drill Radius)
        const locations: GeoLocation[] = selectedHotspots.map(spot => ({
            name: spot.name,
            latitude: spot.coords[0],
            longitude: spot.coords[1],
            radius_meters: Math.floor(drillRadiusKm * 1000)
        }));

        // 3. Montar Interesses (Baseado no targetingDNA)
        const interests = TARGETING_DNA[targetingMode].map(item => ({
            id: item.apiCode || '00000', // Fallback se não tiver ID real
            name: item.name
        }));

        // 4. Montar Payload Final
        return {
            name: `BIA_AUTO_GEN_${new Date().toISOString().split('T')[0]}_${targetingMode}`,
            optimization_goal: 'LEAD_GENERATION',
            billing_event: 'IMPRESSIONS',
            daily_budget: budgetCents,
            targeting: {
                age_min: 25,
                age_max: 65,
                geo_locations: {
                    custom_locations: locations,
                    location_types: ['home', 'recent']
                },
                flexible_spec: [
                    { interests: interests }
                ]
            },
            status: 'PAUSED' // Segurança: Sempre criar pausado para revisão humana
        };
    }

    /**
   * Executa o envio REAL para a API do Facebook Marketing via Backend Proxy
   */
    public static async executeSync(payload: AdSetPayload): Promise<SyncResponse> {
        console.log("⚡ [BIA NETWORK] Iniciando Handshake com Meta Graph API (Real via Server)...");

        try {
            const response = await fetch('/api/meta-ads/campaign-create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Falha no servidor de anúncios.');
            }

            const data = await response.json();
            return {
                success: true,
                campaign_id: data.campaign_id,
                message: data.message || 'Campanha criada com sucesso no Gerenciador de Anúncios.',
                timestamp: data.timestamp
            };
        } catch (error: any) {
            console.error("❌ ERRO SYNC:", error);
            throw new Error(error.message || "Falha crítica na conexão com Meta Ads.");
        }
    }
}
