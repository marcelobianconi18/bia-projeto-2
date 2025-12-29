import { buildApiUrl } from '../apiConfig';

export interface MetaInterest {
    id: string;
    name: string;
    audience_size?: number;
    type?: 'profile' | 'hashtag';
    verified?: boolean;
    followersText?: string;
}

export async function searchMetaInterests(query: string): Promise<MetaInterest[]> {
    if (!query || query.length < 2) return [];

    // Detecta intenção explícita do usuário
    const wantsProfile = query.startsWith('@');
    const wantsHashtag = query.startsWith('#');

    const cleanQuery = query.replace(/^[@#]/, '').trim();

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(`${buildApiUrl('/api/meta/targeting-search')}?q=${encodeURIComponent(query)}`, { // Envia query original para log, mas server trata
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) return [];

        const data = await response.json();

        if (Array.isArray(data)) {
            return data.map((item: any) => {
                const audience = item.audience_size || 0;

                // Formatação de Números (K/M)
                let followersText = '';
                if (audience >= 1000000) followersText = `${(audience / 1000000).toFixed(1)}M seguidores`;
                else if (audience >= 1000) followersText = `${(audience / 1000).toFixed(0)}k seguidores`;
                else followersText = `${audience} seguidores`;

                // Determina Tipo (Perfil ou Hashtag)
                let type: 'profile' | 'hashtag' = 'hashtag';

                // Se o servidor mandou dica (Sintético), usa. Se não (Real), infere.
                if (item.type_hint) {
                    type = item.type_hint;
                } else {
                    // Lógica para dados Reais da Meta
                    if (wantsProfile) type = 'profile';
                    else if (wantsHashtag) type = 'hashtag';
                    else type = (audience > 1000000 && !item.name.includes(' ')) ? 'profile' : 'hashtag';
                }

                // Formata o Nome Visual (@ ou #)
                let visualName = item.name;
                if (type === 'profile' && !visualName.startsWith('@')) {
                    visualName = `@${visualName.replace(/\s+/g, '').toLowerCase()}`;
                } else if (type === 'hashtag' && !visualName.startsWith('#')) {
                    visualName = `#${visualName.replace(/\s+/g, '').toLowerCase()}`;
                }

                // Selo Azul: Apenas para perfis grandes
                const verified = type === 'profile' && audience > 500000;

                return {
                    id: item.id,
                    name: visualName,
                    audience_size: audience,
                    type,
                    verified,
                    followersText
                };
            });
        }
        return [];

    } catch (error) {
        console.error("Search error", error);
        return [];
    }
}

export const verifyMetaAds = async () => {
    try {
        await fetch(buildApiUrl('/api/connectors/meta-ads/verify'), { method: 'HEAD' });
        return { status: 'ACTIVE' };
    } catch { return { status: 'ERROR' }; }
};
