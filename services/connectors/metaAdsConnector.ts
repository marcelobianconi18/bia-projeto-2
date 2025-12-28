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
    // 1. Validação de Input (Evita chamadas inúteis)
    if (!query || query.length < 2) return [];

    try {
        console.log(`🔎 [FRONTEND] Buscando interesse: "${query}" em ${API_URL}`);

        // Timeout de segurança (3 segundos) para não travar a UI se o servidor estiver lento
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(`${API_URL}/api/meta/targeting-search?q=${encodeURIComponent(query)}`, {
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Se o servidor estiver desligado ou der erro, não tenta ler JSON
        if (!response.ok) {
            console.warn(`⚠️ Backend inacessível ou erro: ${response.status}`);
            return []; // Retorna vazio, mas NÃO QUEBRA
        }

        const data = await response.json();

        // Validação final de tipo
        return Array.isArray(data) ? data : [];

    } catch (error: any) {
        // Log discreto para não assustar no console se for apenas servidor desligado
        if (error.name === 'AbortError') {
            console.warn("⏱️ Busca cancelada (Timeout)");
        } else {
            console.error("❌ Erro de conexão (Meta Search): Servidor Offline?", error.message);
        }
        return []; // BLINDAGEM: Retorna array vazio para o Wizard continuar funcionando
    }
}

// Verificação de Saúde
export const verifyMetaAds = async () => {
    try {
        await fetch(`${API_URL}/api/connectors/meta-ads/verify`, { method: 'HEAD' });
        return { status: 'ACTIVE' };
    } catch (e) {
        return { status: 'ERROR' };
    }
};
