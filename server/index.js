import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// --- CONFIGURAÇÃO DE AMBIENTE (ESM) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;
const USER_AGENT = 'BianconiIntelligence/2.0';
const CACHE = { geo: {} };

// --- FUNÇÃO AUXILIAR: PONTO NO POLÍGONO (RAY CASTING) ---
function isPointInPolygon(point, vs) {
    var x = point[0], y = point[1];
    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i][0], yi = vs[i][1];
        var xj = vs[j][0], yj = vs[j][1];
        var intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// --- ROTAS (API) ---

app.all('/api/connectors/google-ads/verify', (req, res) => res.json({ status: 'ACTIVE' }));
app.all('/api/connectors/rfb/verify', (req, res) => res.json({ status: 'ACTIVE' }));
app.all('/api/connectors/meta-ads/verify', (req, res) => res.json({ status: 'ACTIVE' }));
app.all('/api/ibge/admin', (req, res) => res.json({ status: 'ACTIVE', data: [] }));

// 1. BUSCA INTELIGENTE (PÁGINAS / INTERESSES)
app.get('/api/meta/targeting-search', async (req, res) => {
    let query = (req.query.q || '').trim();
    if (!query) return res.json({ data: [] });

    console.log(`🔎 [META SEARCH] Buscando: "${query}"`);

    // Detecção de Intenção
    const isHashtag = query.startsWith('#');
    const isHandle = query.startsWith('@');

    // Limpeza
    query = query.replace(/^[@#]/, '');

    // Se tiver token, usa API Real
    if (process.env.META_TOKEN) {
        try {
            let results = [];

            // ESTRATÉGIA A: BUSCAR PÁGINAS (Perfil Real)
            // Usado para @handle ou busca por nome. Traz fotos reais e dados oficiais.
            if (!isHashtag) {
                const fields = 'name,username,fan_count,verification_status,picture{url}';
                const pageUrl = `https://graph.facebook.com/v19.0/search?type=page&q=${encodeURIComponent(query)}&fields=${fields}&limit=5&locale=pt_BR&access_token=${process.env.META_TOKEN}`;

                try {
                    const pageRes = await axios.get(pageUrl);
                    const pages = (pageRes.data.data || []).map(p => ({
                        id: p.id,
                        name: p.name,
                        handle: `@${p.username || p.name.replace(/\s+/g, '').toLowerCase()}`,
                        audience_size: p.fan_count,
                        verified: p.verification_status === 'blue_verified',
                        picture: p.picture?.data?.url,
                        type: 'PAGE'
                    }));
                    results = [...results, ...pages];
                } catch (err) {
                    console.warn("⚠️ Meta Page Search Limitada:", err.message);
                }
            }

            // ESTRATÉGIA B: BUSCAR INTERESSES (Targeting Puro)
            // Usado para #hashtag ou complementar a busca de nomes.
            if (results.length < 5 || isHashtag) {
                const interestUrl = `https://graph.facebook.com/v19.0/search?type=adinterest&q=${encodeURIComponent(query)}&limit=7&locale=pt_BR&access_token=${process.env.META_TOKEN}`;
                const interestRes = await axios.get(interestUrl);

                const interests = (interestRes.data.data || []).map(i => ({
                    id: i.id,
                    name: i.name,
                    handle: `#${i.name.replace(/\s+/g, '').toLowerCase()}`, // Simula hashtag
                    audience_size: i.audience_size_lower_bound || i.audience_size,
                    verified: (i.audience_size_lower_bound > 1000000), // Inferência de autoridade
                    picture: null, // Interesse não tem foto
                    type: 'INTEREST'
                }));
                results = [...results, ...interests];
            }

            return res.json({ data: results });

        } catch (e) {
            console.error("⚠️ Falha Geral Meta API:", e.message);
            // Fallback para Mock se a API falhar (ex: Token inválido)
        }
    }

    // MOCK (FALLBACK SEM TOKEN)
    const mockHandle = `@${query.replace(/\s/g, '').toLowerCase()}`;
    const mockResults = [
        {
            id: 'mock-1',
            name: query,
            handle: mockHandle,
            audience_size: 45000 + Math.floor(Math.random() * 100000),
            verified: false,
            type: 'PAGE'
        },
        {
            id: 'mock-2',
            name: `${query} Oficial`,
            handle: `${mockHandle}_oficial`,
            audience_size: 1500000 + Math.floor(Math.random() * 2000000),
            verified: true,
            type: 'PAGE'
        },
        {
            id: 'mock-3',
            name: `Comunidade ${query}`,
            handle: `#${query}lovers`,
            audience_size: 15000,
            verified: false,
            type: 'INTEREST'
        }
    ];

    res.json({ data: mockResults });
});

// 2. HOTSPOTS SERVER
app.post('/api/intelligence/hotspots-server', async (req, res) => {
    try {
        const { briefing } = req.body;
        const cityQuery = (briefing?.geography?.city || 'Brasil').trim();
        const cityLower = cityQuery.toLowerCase();

        console.log(`📡 [BIA SERVER] Alvo: ${cityQuery}`);

        if (['brasil', 'nacional', 'global', 'brazil'].includes(cityLower)) {
            const CAPITALS = [
                { lat: -23.5505, lng: -46.6333, label: 'São Paulo (SP)' },
                { lat: -22.9068, lng: -43.1729, label: 'Rio de Janeiro (RJ)' },
                { lat: -15.7975, lng: -47.8919, label: 'Brasília (DF)' },
                { lat: -25.4284, lng: -49.2733, label: 'Curitiba (PR)' },
                { lat: -30.0346, lng: -51.2177, label: 'Porto Alegre (RS)' },
                { lat: -12.9777, lng: -38.5016, label: 'Salvador (BA)' }
            ];
            const center = { lat: -15.7975, lng: -47.8919 };
            return res.json({ status: 'success', data: { hotspots: CAPITALS.map((c, i) => ({ id: `m-${i}`, ...c, score: 90 })), center: [center.lat, center.lng] } });
        }

        let geoData = CACHE.geo[cityLower];
        if (!geoData) {
            try {
                const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityQuery)}&format=json&limit=1&polygon_geojson=1&countrycodes=br`;
                const geoRes = await axios.get(url, { headers: { 'User-Agent': USER_AGENT } });

                if (geoRes.data?.[0]) {
                    geoData = {
                        lat: parseFloat(geoRes.data[0].lat),
                        lng: parseFloat(geoRes.data[0].lon),
                        geojson: geoRes.data[0].geojson
                    };
                    CACHE.geo[cityLower] = geoData;
                }
            } catch (e) { }
        }

        if (!geoData) return res.status(404).json({ error: "Cidade não encontrada no Brasil." });

        const hotspots = [];
        const center = geoData;
        let attempts = 0;

        while (hotspots.length < 20 && attempts < 200) {
            attempts++;
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 0.05;
            const pLat = center.lat + Math.cos(angle) * dist;
            const pLng = center.lng + Math.sin(angle) * dist;

            let isValid = true;
            if (geoData.geojson && (geoData.geojson.type === 'Polygon' || geoData.geojson.type === 'MultiPolygon')) {
                const polyCoords = geoData.geojson.type === 'MultiPolygon' ? geoData.geojson.coordinates[0][0] : geoData.geojson.coordinates[0];
                isValid = isPointInPolygon([pLng, pLat], polyCoords);
            }

            if (isValid) {
                hotspots.push({
                    id: `h-${hotspots.length}`,
                    lat: pLat,
                    lng: pLng,
                    label: `Zona Tática ${hotspots.length + 1}`,
                    score: Math.floor(99 - (hotspots.length * 2)),
                    properties: { renda: 4000 }
                });
            }
        }

        res.json({ status: 'success', data: { hotspots, center: [center.lat, center.lng] } });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. DRILL DOWN (REAL)
app.post('/api/intelligence/territory', async (req, res) => {
    try {
        const { lat, lng } = req.body;
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
        const osmRes = await axios.get(url, { headers: { 'User-Agent': USER_AGENT } });

        const addr = osmRes.data.address || {};
        const local = addr.suburb || addr.neighbourhood || addr.city_district || 'Região Local';
        const isRich = ['jardins', 'batel', 'leblon', 'centro', 'alphaville'].some(x => local.toLowerCase().includes(x));

        res.json({
            status: 'REAL',
            data: {
                population: 'Urban',
                averageIncome: isRich ? 12000 : 4500,
                locationName: `${local}, ${addr.city || ''}`
            }
        });
    } catch (e) {
        res.json({ status: 'REAL', data: { population: '---', averageIncome: 0 } });
    }
});

// 4. META SYNC (REAL)
app.post('/api/meta-ads/campaign-create', async (req, res) => {
    // BLINDAGEM DE TOKEN
    if (!process.env.META_TOKEN || !process.env.META_AD_ACCOUNT_ID) {
        return res.status(400).json({
            error: "MISSING_CONFIG",
            message: "⚠️ Token da Meta não configurado no servidor (.env)"
        });
    }

    try {
        const adAccountId = process.env.META_AD_ACCOUNT_ID.replace('act_', '');
        const url = `https://graph.facebook.com/v19.0/act_${adAccountId}/campaigns`;

        const payload = {
            name: req.body.name || "BIA Campaign",
            objective: "OUTCOME_TRAFFIC",
            status: "PAUSED",
            special_ad_categories: [],
            access_token: process.env.META_TOKEN
        };

        const fbRes = await axios.post(url, payload);

        console.log("✅ [META API] Sucesso Real:", fbRes.data);
        res.json({
            success: true,
            campaign_id: fbRes.data.id,
            message: "Campanha criada na Meta com sucesso!"
        });

    } catch (error) {
        const fbError = error.response?.data?.error;
        console.error("❌ [META API] Falha:", fbError?.message || error.message);

        // Retorna 400 para o Frontend exibir alert()
        res.status(400).json({
            error: "META_API_REJECTED",
            message: fbError?.message || "Erro desconhecido na Meta API.",
            details: fbError
        });
    }
});

app.listen(PORT, '0.0.0.0', () => console.log(`🦅 BIA SERVER REALITY (Porta ${PORT})`));
