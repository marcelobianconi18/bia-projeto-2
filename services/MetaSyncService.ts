import { buildApiUrl } from './apiConfig';
import { TARGETING_DNA, TargetingLayer } from './targetingDNA';

// Types alinhados com a Graph API v19.0
interface CustomLocation {
    latitude: number;
    longitude: number;
    radius: number; // Numérico simples
    distance_unit: 'kilometer' | 'mile';
    name?: string;
}

interface AdSetPayload {
    name: string;
    daily_budget: number;
    targeting: {
        age_min: number;
        age_max: number;
        geo_locations: {
            custom_locations: CustomLocation[];
            location_types?: string[];
        };
        flexible_spec?: Array<{
            interests: Array<{ id: string; name: string }>;
        }>;
    };
}

export class MetaSyncService {

    public static buildPayload(
        budgetBRL: number,
        hotspots: any[], // Dados reais com lat/lng
        targetingMode: TargetingLayer,
        drillRadiusKm: number
    ): AdSetPayload {

        // 1. Validar Dados de Entrada
        if (!hotspots || hotspots.length === 0) {
            throw new Error("Nenhum Hotspot identificado para criar campanha.");
        }

        // 2. Construir Geo Locations (Formato Estrito Meta API)
        const validLocations: CustomLocation[] = [];

        hotspots.forEach((spot, index) => {
            // Detecção robusta de coordenadas
            const lat = typeof spot.lat === 'number' ? spot.lat : (spot.coords ? spot.coords[0] : null);
            const lng = typeof spot.lng === 'number' ? spot.lng : (spot.coords ? spot.coords[1] : null);

            if (lat && lng) {
                validLocations.push({
                    latitude: parseFloat(lat.toFixed(6)), // Limitar precisão
                    longitude: parseFloat(lng.toFixed(6)),
                    radius: drillRadiusKm < 1 ? 1 : drillRadiusKm, // Meta exige min 1km
                    distance_unit: 'kilometer', // OBRIGATÓRIO (Fix do Invalid Parameter)
                    name: spot.label || `Hotspot ${index + 1}`
                });
            }
        });

        if (validLocations.length === 0) {
            throw new Error("Impossível sincronizar: Coordenadas GPS inválidas ou ausentes.");
        }

        // 3. Interesses (Validação Estrita)
        // Só envia interesses se tivermos um ID de API real. IDs falsos (600...) causam rejeição.
        const validInterests = (TARGETING_DNA[targetingMode] || [])
            .filter(item => item.apiCode && item.apiCode.length > 5) // Filtra mocks
            .map(item => ({
                id: item.apiCode!,
                name: item.name
            }));

        const payload: AdSetPayload = {
            name: `BIA_REAL_${new Date().toISOString().split('T')[0]}_${targetingMode}`,
            daily_budget: Math.floor(budgetBRL * 100), // Centavos
            targeting: {
                age_min: 25,
                age_max: 65,
                geo_locations: {
                    custom_locations: validLocations,
                    // location_types removido para evitar conflitos de permissão/versão
                }
            }
        };

        // Injeta interesses apenas se existirem códigos válidos
        if (validInterests.length > 0) {
            payload.targeting.flexible_spec = [{ interests: validInterests }];
        }

        return payload;
    }

    public static async executeSync(payload: AdSetPayload): Promise<any> {
        console.log("⚡ [BIA SYNC] Enviando Payload Real para Backend:", JSON.stringify(payload, null, 2));

        const response = await fetch(buildApiUrl('/api/meta-ads/campaign-create'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            // Prioriza a mensagem vinda do servidor (ex: "Token não configurado")
            throw new Error(data.message || 'Erro de comunicação com a API.');
        }

        return data;
    }
}
