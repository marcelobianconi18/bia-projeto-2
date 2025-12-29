// services/connectors/metaAdsConnector.ts

export interface MetaInterest {
    id: string;
    name: string;
    audience_size?: number;
    path?: string[];
}

import { buildApiUrl } from '../apiConfig';

export async function searchMetaInterests(query: string): Promise<MetaInterest[]> {
    if (!query || query.length < 2) return [];

    // 1. Detecta Intenção Explicita (@ ou #)
    const wantsProfile = query.startsWith('@');
    const wantsHashtag = query.startsWith('#');

    // 2. Limpeza para API (Remove @/# para buscar "marketing" ao invés de "#marketing")
    const cleanQuery = query.replace(/^[@#]/, '').trim();
    if (cleanQuery.length < 2) return [];

    try {
        console.log(`🔎 [FRONTEND] Buscando: "${cleanQuery}" (Intenção: ${wantsProfile ? 'Perfil' : wantsHashtag ? 'Hashtag' : 'Geral'})`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const response = await fetch(`${buildApiUrl('/api/meta/targeting-search')}?q=${encodeURIComponent(cleanQuery)}`, {
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) return [];

        const data = await response.json();

        if (Array.isArray(data)) {
            // 3. Pós-Processamento e Formatação
            return data.map((item: any) => {
                let formattedName = item.name;
                const isMassive = (item.audience_size || 0) > 1000000; // Simula "Selo Azul" para > 1M

                // Lógica de Prefixo
                if (wantsProfile) {
                    formattedName = `@${item.name.replace(/\s+/g, '')}`; // Força perfil sem espaços
                } else if (wantsHashtag) {
                    formattedName = `#${item.name.replace(/\s+/g, '')}`; // Força hashtag sem espaços
                } else {
                    // Heurística Mista (Busca Geral)
                    // Se tem espaços ou parece tópico genérico -> #Hashtag
                    // Se é nome único ou massivo -> @Perfil
                    if (item.name.includes(' ') || !isMassive) {
                        formattedName = `#${item.name.replace(/\s+/g, '')}`;
                    } else {
                        formattedName = `@${item.name}`;
                    }
                }

                return {
                    ...item,
                    name: formattedName,
                    verified: isMassive // Flag para UI (opcional)
                };
            });
        }
        return [];

    } catch (error: any) {
        if (error.name !== 'AbortError') console.error("❌ Search error:", error.message);
        return [];
    }
}

export const verifyMetaAds = async () => {
    try {
        await fetch(buildApiUrl('/api/connectors/meta-ads/verify'), { method: 'HEAD' });
        return { status: 'ACTIVE' };
    } catch (e) {
        return { status: 'ERROR' };
    }
};
