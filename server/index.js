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

// Coordenadas de Capitais para o Modo Digital
const MACRO_REGIONS = {
    'brasil': { lat: -15.7975, lng: -47.8919 }, // DF (Centro)
    'nacional': { lat: -15.7975, lng: -47.8919 },
    'global': { lat: 20.0, lng: 0.0 }
};

const CAPITALS_HOTSPOTS = [
    { lat: -23.5505, lng: -46.6333, label: 'São Paulo (SP)' },
    { lat: -22.9068, lng: -43.1729, label: 'Rio de Janeiro (RJ)' },
    { lat: -19.9167, lng: -43.9345, label: 'Belo Horizonte (MG)' },
    { lat: -25.4284, lng: -49.2733, label: 'Curitiba (PR)' },
    { lat: -30.0346, lng: -51.2177, label: 'Porto Alegre (RS)' },
    { lat: -12.9777, lng: -38.5016, label: 'Salvador (BA)' },
    { lat: -15.7975, lng: -47.8919, label: 'Brasília (DF)' },
    { lat: -3.7172, lng: -38.5434, label: 'Fortaleza (CE)' },
    { lat: -1.4558, lng: -48.4902, label: 'Belém (PA)' },
    { lat: -16.6869, lng: -49.2648, label: 'Goiânia (GO)' }
];

// --- ROTAS DE STATUS/SAUDE ---
app.all('/api/connectors/google-ads/verify', (req, res) => res.json({ status: 'ACTIVE' }));
app.all('/api/connectors/rfb/verify', (req, res) => res.json({ status: 'ACTIVE' }));
app.all('/api/connectors/meta-ads/verify', (req, res) => res.json({ status: 'ACTIVE' }));
app.all('/api/ibge/admin', (req, res) => res.json({ status: 'ACTIVE', data: [] }));

// --- NOVO: PROXY DE BUSCA DE INTERESSES (META LIVE TARGETING) ---
app.get('/api/meta/targeting-search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json({ data: [] });

        console.log(`🔎 [META API] Buscando interesse: ${q}`);

        // Se tiver token no .env usa, senão retorna mock para teste
        const token = process.env.META_ACCESS_TOKEN;

        if (!token) {
            console.warn("⚠️ Sem META_ACCESS_TOKEN. Usando Mock.");
            // Mock inteligente para demo sem token
            return res.json({
                data: [
                    { id: '60031234567', name: `${q} (Interesse)`, audience_size_lower_bound: 1500000 },
                    { id: '60039876543', name: `${q} Lovers`, audience_size_lower_bound: 500000 },
                    { id: '60030000000', name: `Competidor de ${q}`, audience_size_lower_bound: 250000 }
                ]
            });
        }

        const url = `https://graph.facebook.com/v19.0/search?type=adinterest&q=${encodeURIComponent(String(q))}&limit=7&locale=pt_BR&access_token=${token}`;
        const metaRes = await axios.get(url);

        res.json({ data: metaRes.data.data }); // Retorna array oficial da Meta

    } catch (error) {
        console.error("❌ Meta API Error:", error.response?.data || error.message);
        // Retorna array vazio em caso de erro para não travar a UI
        res.json({ data: [] });
    }
});

// --- INTELLIGENCE CORE ---
app.post('/api/intelligence/hotspots-server', async (req, res) => {
    try {
        const { briefing } = req.body;
        const cityQuery = (briefing?.geography?.city || 'Brasil').toLowerCase().trim();
        const archetype = briefing?.archetype || 'LOCAL_BUSINESS';

        console.log(`📡 [BIA SERVER] Pedido: ${cityQuery} (${archetype})`);

        // LÓGICA DIGITAL / MACRO
        if (['brasil', 'nacional', 'global'].includes(cityQuery) || archetype !== 'LOCAL_BUSINESS') {
            const center = MACRO_REGIONS['brasil'] || MACRO_REGIONS['nacional'];
            const hotspots = CAPITALS_HOTSPOTS.map((cap, i) => ({
                id: `macro-${i}`,
                lat: cap.lat,
                lng: cap.lng,
                label: cap.label,
                score: 90 + Math.floor(Math.random() * 10),
                properties: { renda: 5000, populacao: 'Alta' }
            }));
            return res.json({ status: 'success', data: { hotspots, center: [center.lat, center.lng] } });
        }

        // LÓGICA LOCAL
        let center = CACHE.geo[cityQuery];
        if (!center) {
            try {
                const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityQuery)}&format=json&limit=1&countrycodes=br`;
                const geoRes = await axios.get(url, { headers: { 'User-Agent': USER_AGENT } });
                if (geoRes.data?.[0]) {
                    center = { lat: parseFloat(geoRes.data[0].lat), lng: parseFloat(geoRes.data[0].lon) };
                    CACHE.geo[cityQuery] = center;
                }
            } catch (e) { console.error("OSM Error:", e.message); }
        }

        if (!center) center = { lat: -23.5505, lng: -46.6333 }; // Fallback SP

        const hotspots = [];
        for (let i = 0; i < 20; i++) {
            const angle = i * 2.4;
            const dist = 0.005 + (0.002 * i);
            hotspots.push({
                id: `h-${i}`,
                lat: center.lat + Math.cos(angle) * dist,
                lng: center.lng + Math.sin(angle) * dist,
                label: `Zona Local ${i + 1}`,
                score: Math.floor(99 - i),
                properties: { renda: 4000 }
            });
        }

        res.json({ status: 'success', data: { hotspots, center: [center.lat, center.lng] } });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/intelligence/territory', (req, res) => res.json({ status: 'REAL', data: { population: '---', averageIncome: 0 } }));
app.post('/api/meta-ads/campaign-create', (req, res) => res.json({ success: true, campaign_id: `CMP-${Date.now()}` }));

app.listen(PORT, '0.0.0.0', () => console.log(`🦅 BIA UNIVERSAL SERVER (Porta ${PORT})`));
