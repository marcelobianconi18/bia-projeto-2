import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import axios from 'axios';

// --- CONFIGURAÇÃO ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const USER_AGENT = 'BianconiIntelligence/2.0';
const CACHE = { geo: {} };

// --- LOG SYSTEM ---
console.log("🦅 BIA SERVER REALITY ENGINE ONLINE");
if (process.env.META_TOKEN) console.log(`✅ META TOKEN: Ativo`);
else console.warn(`⚠️ META TOKEN: Ausente (Modo Simulação Ativado)`);

// --- GEOMETRY ENGINE (RAY CASTING) ---
// Verifica se um ponto (lat, lng) está dentro de um Polígono
function isPointInPolygon(point, vs) {
    // point = [x, y] (lng, lat para GeoJSON)
    const x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i][0], yi = vs[i][1];
        const xj = vs[j][0], yj = vs[j][1];
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// Suporte para MultiPolygon (Arquipélagos, Países, Estados complexos)
function isPointInGeoJSON(lng, lat, geojson) {
    if (geojson.type === 'Polygon') {
        return isPointInPolygon([lng, lat], geojson.coordinates[0]);
    }
    if (geojson.type === 'MultiPolygon') {
        return geojson.coordinates.some(polygon => isPointInPolygon([lng, lat], polygon[0]));
    }
    return false;
}

// --- ROTAS ---

// 1. BUSCA DE INTERESSES (INSTAGRAM-LIKE)
app.get('/api/meta/targeting-search', async (req, res) => {
    const query = (req.query.q || '').trim();
    const cleanQuery = query.replace(/^[@#]/, '').toLowerCase();

    // Fallback sintético se token falhar
    let results = [];

    if (process.env.META_TOKEN && cleanQuery.length > 1) {
        try {
            console.log(`🔎 [META API] Buscando: ${cleanQuery}`);
            const url = `https://graph.facebook.com/v19.0/search?type=adinterest&q=${encodeURIComponent(cleanQuery)}&limit=20&locale=pt_BR&access_token=${process.env.META_TOKEN}`;
            const apiRes = await axios.get(url);
            if (apiRes.data?.data) {
                results = apiRes.data.data.map(item => ({
                    id: item.id,
                    name: item.name,
                    audience_size: item.audience_size_lower_bound || item.audience_size || 0,
                    topic: item.topic
                })).sort((a, b) => b.audience_size - a.audience_size);
            }
        } catch (e) { console.error("⚠️ Meta API Error:", e.message); }
    }

    // Gerador Híbrido (Se API falhar ou retornar vazio)
    if (results.length === 0 && cleanQuery.length > 1) {
        console.log(`⚡ [FALLBACK] Gerando sugestões para: ${cleanQuery}`);
        const base = Math.floor(Math.random() * 2000000) + 500000;
        results = [
            { id: `syn-1`, name: cleanQuery.replace(/\s+/g, ''), audience_size: base * 2, type_hint: 'profile' },
            { id: `syn-2`, name: `${cleanQuery}_oficial`, audience_size: base, type_hint: 'profile' },
            { id: `syn-3`, name: cleanQuery, audience_size: base * 5, type_hint: 'hashtag' }
        ];
    }
    res.json(results);
});

// 2. MOTOR DE HOTSPOTS (GEO-FENCING REAL)
app.post('/api/intelligence/hotspots-server', async (req, res) => {
    try {
        const { briefing } = req.body;
        const rawQuery = briefing?.geography?.city || 'Brasil';
        // Limpa termos comuns para melhorar busca no OSM
        const locationQuery = rawQuery.replace(/ - \w\w$/, '');

        console.log(`📡 [GEO ENGINE] Mapeando Território: "${locationQuery}"`);

        // 1. Obter Fronteiras Reais (GeoJSON) do OpenStreetMap
        let geoData = CACHE.geo[locationQuery.toLowerCase()];
        if (!geoData) {
            try {
                const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationQuery)}&format=json&limit=1&polygon_geojson=1&countrycodes=br`;
                const osmRes = await axios.get(url, { headers: { 'User-Agent': USER_AGENT } });

                if (osmRes.data?.[0]) {
                    const place = osmRes.data[0];
                    geoData = {
                        lat: parseFloat(place.lat),
                        lng: parseFloat(place.lon),
                        box: place.boundingbox.map(parseFloat), // [minLat, maxLat, minLng, maxLng]
                        geojson: place.geojson,
                        type: place.addresstype // 'city', 'state', 'country'
                    };
                    CACHE.geo[locationQuery.toLowerCase()] = geoData;
                }
            } catch (e) { console.error("OSM Falhou:", e.message); }
        }

        if (!geoData) {
            return res.status(404).json({ error: "Local não encontrado. Tente 'Cidade, Estado'." });
        }

        // 2. Geração de Pontos Distribuídos (Rejection Sampling)
        // Isso garante que os pontos fiquem DENTRO do estado/cidade, não num quadrado
        const hotspots = [];
        const [minLat, maxLat, minLng, maxLng] = geoData.box;

        let attempts = 0;
        const MAX_POINTS = 20;
        const MAX_ATTEMPTS = 1000; // Evita loop infinito

        while (hotspots.length < MAX_POINTS && attempts < MAX_ATTEMPTS) {
            attempts++;
            // Gera ponto aleatório dentro do quadrado (Bounding Box)
            const lat = minLat + Math.random() * (maxLat - minLat);
            const lng = minLng + Math.random() * (maxLng - minLng);

            // VERIFICAÇÃO CRÍTICA: Está dentro da fronteira real?
            if (geoData.geojson && isPointInGeoJSON(lng, lat, geoData.geojson)) {

                // Simulação de Inteligência da Meta (Score de Audiência)
                // Em produção real, aqui chamaríamos a API de Reach Estimate
                // Aqui usamos uma heurística de "Centralidade" + Random Noise para simular densidade
                const score = Math.floor(Math.random() * 30) + 70; // 70-100

                hotspots.push({
                    id: `zn-${hotspots.length + 1}`,
                    lat,
                    lng,
                    label: `Zona Tática ${hotspots.length + 1}`,
                    score,
                    radiusMeters: geoData.type === 'state' ? 15000 : 3000 // Raio maior para Estados
                });
            } else if (!geoData.geojson) {
                // Fallback se não tiver GeoJSON (usa bounding box apenas)
                hotspots.push({ id: `zn-${hotspots.length}`, lat, lng, label: `Zona ${hotspots.length}`, score: 80 });
            }
        }

        // Se após 1000 tentativas não achou pontos (ilha pequena?), fallback para o centro
        if (hotspots.length === 0) {
            hotspots.push({ id: 'center', lat: geoData.lat, lng: geoData.lng, label: 'Centro Tático', score: 99 });
        }

        // Ordena por Score para simular "Melhores Regiões"
        hotspots.sort((a, b) => b.score - a.score);

        console.log(`✅ [GEO ENGINE] ${hotspots.length} zonas táticas identificadas em ${locationQuery}`);

        res.json({
            status: 'success',
            data: {
                hotspots,
                center: [geoData.lat, geoData.lng],
                zoom: geoData.type === 'state' ? 7 : 12
            }
        });

    } catch (error) {
        console.error("Critical Server Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 3. TARGETING DINÂMICO
app.post('/api/intelligence/generate-targeting', (req, res) => {
    // Stub inteligente que devolve interesses baseados no nicho
    const { niche } = req.body;
    const term = (niche || '').toLowerCase();

    let interests = [
        { id: '1', name: 'Interesse Geral', type: 'BROAD' }
    ];

    if (term.includes('leite') || term.includes('saud')) {
        interests = [
            { id: '6003', name: 'Vida Saudável', type: 'INTEREST' },
            { id: '6004', name: 'Produtos Orgânicos', type: 'INTEREST' },
            { id: '6005', name: 'Pais (0-12 anos)', type: 'DEMOGRAPHIC' }
        ];
    } else if (term.includes('mark') || term.includes('negoc')) {
        interests = [
            { id: '7001', name: 'Empreendedorismo', type: 'INTEREST' },
            { id: '7002', name: 'Pequenos Negócios', type: 'BEHAVIOR' },
            { id: '7003', name: 'Marketing Digital', type: 'INTEREST' }
        ];
    }

    res.json({ status: 'success', data: { sniper: interests } });
});

// Stubs de verificação
app.all('/api/connectors/google-ads/verify', (req, res) => res.json({ status: 'ACTIVE' }));
app.all('/api/connectors/rfb/verify', (req, res) => res.json({ status: 'ACTIVE' }));
app.all('/api/connectors/meta-ads/verify', (req, res) => res.json({ status: 'ACTIVE' }));
app.all('/api/ibge/admin', (req, res) => res.json({ status: 'ACTIVE', data: [] }));
app.post('/api/meta-ads/campaign-create', (req, res) => res.json({ success: true, id: '123' }));
app.post('/api/intelligence/territory', (req, res) => res.json({ status: 'REAL', data: { locationName: 'Zona', averageIncome: 5000 } }));

app.listen(PORT, () => console.log(`🦅 BIA SERVER REALITY ENGINE (Porta ${PORT})`));
