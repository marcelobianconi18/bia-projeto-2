import { buildApiUrl } from './apiConfig';
import { TARGETING_DNA, TargetingLayer } from './targetingDNA';

// Types alinhados com a Graph API v19.0
interface CustomLocation {
    latitude: number;
    longitude: number;
    radius: number;
    distance_unit: 'kilometer' | 'mile';
    name?: string;
}

interface AdSetPayload {
    name: string;
    daily_budget: number;
    special_ad_categories: string[]; // Adicionado para Compliance
    targeting: {
        age_min: number;
        age_max: number;
        genders?: number[]; // 1=Male, 2=Female
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

    /**
     * Detecta Categorias de Anúncio Especial (Compliance Shield)
     * Obrigatório para Imóveis, Crédito e Emprego para evitar bloqueios.
     */
    private static detectSpecialCategory(textContext: string): string[] {
        const text = textContext.toLowerCase();

        // 🏠 Housing (Moradia)
        const housingKeywords = ['imóvel', 'imovel', 'apartamento', 'casa', 'condomínio', 'aluguel', 'corretor', 'financiamento imobiliário', 'loteamento', 'minha casa minha vida'];
        if (housingKeywords.some(w => text.includes(w))) return ['HOUSING'];

        // 💳 Credit (Crédito)
        const creditKeywords = ['empréstimo', 'cartão de crédito', 'consorcio', 'consórcio', 'financiamento de veículo', 'score de crédito'];
        if (creditKeywords.some(w => text.includes(w))) return ['CREDIT'];

        // 💼 Employment (Emprego)
        const employmentKeywords = ['vaga', 'contratação', 'estágio', 'trabalhe conosco', 'oportunidade de emprego', 'rh', 'recrutamento'];
        if (employmentKeywords.some(w => text.includes(w))) return ['EMPLOYMENT'];

        return []; // Anúncio Padrão
    }

    /**
     * Converte range de string (ex: "25-45") para números. 
     * Trata "65+" e inputs inválidos com segurança.
     */
    private static parseAgeRange(ageString?: string): { min: number, max: number } {
        if (!ageString) return { min: 18, max: 65 }; // Default seguro

        if (ageString.includes('+')) {
            const min = parseInt(ageString.replace('+', '')) || 18;
            return { min, max: 65 };
        }

        const parts = ageString.split('-');
        if (parts.length === 2) {
            return {
                min: parseInt(parts[0]) || 18,
                max: parseInt(parts[1]) || 65
            };
        }

        return { min: 18, max: 65 };
    }

    /**
     * Mapeia gênero para API do Meta
     * Masculino -> [1], Feminino -> [2], Todos -> undefined (não enviar o campo = Todos)
     */
    private static parseGender(genderString?: string): number[] | undefined {
        if (!genderString) return undefined;
        const g = genderString.toLowerCase();

        if (g.startsWith('h') || g.includes('masc')) return [1];
        if (g.startsWith('m') || g.includes('fem')) return [2];

        return undefined; // Ambos
    }

    public static buildPayload(
        briefing: any, // Recebe briefing completo para contexto
        hotspots: any[],
        targetingMode: TargetingLayer,
        drillRadiusKm: number
    ): AdSetPayload {

        // 1. Extração de Contexto para Compliance
        const businessContext = `${briefing.businessDescription || ''} ${briefing.niche || ''}`;
        const specialCategories = this.detectSpecialCategory(businessContext);
        const isSpecialCategory = specialCategories.length > 0;

        // 2. Demografia Dinâmica
        let { min, max } = this.parseAgeRange(briefing.targetAge);
        let genders = this.parseGender(briefing.targetGender);

        // 🛡️ SAFETY OVERRIDE: Se for Categoria Especial, o Meta OBRIGA demografia aberta
        if (isSpecialCategory) {
            console.warn(`🛡️ [COMPLIANCE SHIELD] Categoria Especial (${specialCategories[0]}) detectada. Forçando demografia aberta para evitar rejeição.`);
            min = 18;
            max = 65;
            genders = undefined; // Todos
        }

        // 3. Validar Geo Locations
        if (!hotspots || hotspots.length === 0) {
            throw new Error("Nenhum Hotspot identificado para criar campanha.");
        }

        const validLocations: CustomLocation[] = [];
        hotspots.forEach((spot, index) => {
            const lat = typeof spot.lat === 'number' ? spot.lat : (spot.coords ? spot.coords[0] : null);
            const lng = typeof spot.lng === 'number' ? spot.lng : (spot.coords ? spot.coords[1] : null);

            if (lat && lng) {
                validLocations.push({
                    latitude: parseFloat(lat.toFixed(6)),
                    longitude: parseFloat(lng.toFixed(6)),
                    radius: drillRadiusKm < 1 ? 1 : drillRadiusKm,
                    distance_unit: 'kilometer',
                    name: spot.label || `Hotspot ${index + 1}`
                });
            }
        });

        if (validLocations.length === 0) throw new Error("Impossível sincronizar: Coordenadas GPS inválidas.");

        // 4. Interesses (Targeting DNA - Dinâmico vs Estático)
        const modeKey = targetingMode.toLowerCase(); // 'sniper', 'contextual', 'expansive'

        let sourceInterests = [];

        // Tenta pegar da Inteligência Dinâmica (Backend/Gemini)
        if (briefing.targeting && briefing.targeting[modeKey] && Array.isArray(briefing.targeting[modeKey])) {
            sourceInterests = briefing.targeting[modeKey].map((i: any) => ({
                apiCode: i.id, // O backend retorna 'id', mapeamos para apiCode para padronizar filtro
                name: i.name
            }));
            console.log(`🧠 [SYNC] Usando Targeting Dinâmico (${sourceInterests.length} interesses) para modo ${targetingMode}`);
        } else {
            // Fallback para DNA Estático (apenas se a IA falhou falhou)
            console.warn(`⚠️ [SYNC] Targeting Dinâmico não encontrado para ${targetingMode}. Usando Fallback Estático.`);
            sourceInterests = TARGETING_DNA[targetingMode] || [];
        }

        const validInterests = sourceInterests
            .filter((item: any) => {
                if (!item.apiCode) return false;
                // Aceita IDs numéricos reais ou simulados do sistema
                return /^\d+$/.test(item.apiCode) || item.apiCode.length > 5;
            })
            .map((item: any) => ({ id: item.apiCode!, name: item.name }));

        if (validInterests.length === 0 && targetingMode !== 'CONTEXTUAL') {
            console.warn("⚠️ [SYNC] Lista de interesses vazia.");
        }

        // 5. Montagem Final
        const payload: AdSetPayload = {
            name: `BIA_REAL_${new Date().toISOString().split('T')[0]}_${targetingMode}_${specialCategories[0] || 'STD'}`,
            daily_budget: Math.floor((briefing.budget || 20) * 100), // R$ -> Centavos
            special_ad_categories: specialCategories.length > 0 ? specialCategories : [],
            targeting: {
                age_min: min,
                age_max: max,
                geo_locations: {
                    custom_locations: validLocations
                }
            }
        };

        // Adiciona Gênero se não for nulo (e não for especial)
        if (genders) payload.targeting.genders = genders;

        // Adiciona Interesses se houver
        if (validInterests.length > 0) {
            payload.targeting.flexible_spec = [{ interests: validInterests }];
        }

        return payload;
    }

    public static async executeSync(payload: AdSetPayload): Promise<any> {
        console.log("⚡ [BIA SYNC] Enviando Payload Seguro para Backend:", JSON.stringify(payload, null, 2));

        const response = await fetch(buildApiUrl('/api/meta-ads/campaign-create'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || data.error?.message || 'Erro de comunicação com a API do Meta.');
        }

        return data;
    }
}
