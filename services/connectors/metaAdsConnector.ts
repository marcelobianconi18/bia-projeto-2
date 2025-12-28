// services/connectors/metaAdsConnector.ts

export interface MetaInterest {
    id: string;
    name: string;
    audience_size?: number;
    path?: string[];
}

// URL FIXA DO BACKEND
const API_URL = 'http://localhost:3001';

export async function searchMetaInterests(query: string): Promise<MetaInterest[]> {
    if (!query || query.length < 2) return [];

    // --- CORREÇÃO: REMOVER @ e # ---
    // Transforma "@canva" em "canva" e "#marketing" em "marketing"
    const cleanQuery = query.replace(/^[@#]/, '').trim();

    if (cleanQuery.length < 2) return [];

    try {
        console.log(`🔎 [FRONTEND] Buscando interesse limpo: "${cleanQuery}" (Original: ${query})`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(`${API_URL}/api/meta/targeting-search?q=${encodeURIComponent(cleanQuery)}`, {
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.warn(`⚠️ Backend respondeu com status: ${response.status}`);
            return [];
        }

        const data = await response.json();

        // Se a API retornar vazio, e for uma busca curta, pode ser normal.
        if (Array.isArray(data)) {
            console.log(`✅ Encontrados ${data.length} resultados para "${cleanQuery}"`);
            return data;
        }

        return [];

    } catch (error: any) {
        if (error.name !== 'AbortError') {
            console.error("❌ Erro de conexão:", error.message);
        }
        return [];
    }
}

export const verifyMetaAds = async () => {
    try {
        await fetch(`${API_URL}/api/connectors/meta-ads/verify`, { method: 'HEAD' });
        return { status: 'ACTIVE' };
    } catch (e) {
        return { status: 'ERROR' };
    }
};
