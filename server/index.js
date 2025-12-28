import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const IBGE_DATA_ROOT = path.join(process.cwd(), 'server', 'data', 'ibge');

async function geocodeCity(city, state) {
    if (!city) return null;

    const query = `${city}${state ? `, ${state}` : ''}, Brasil`;

    try {
        const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: {
                format: 'json',
                limit: 1,
                q: query
            },
            headers: { 'User-Agent': 'bia-geo/1.0' },
            timeout: 5000
        });

        if (Array.isArray(data) && data.length > 0) {
            const hit = data[0];
            return {
                lat: Number(hit.lat),
                lng: Number(hit.lon),
                displayName: hit.display_name
            };
        }
        return null;
    } catch (err) {
        console.warn('⚠️  [GEOCODER] Falha ao geocodificar', query, err.message);
        return null;
    }
}

// Rota de Teste de Token (Nova)
app.get('/api/debug/token', async (req, res) => {
    const token = process.env.META_TOKEN || '';
    res.json({
        token_present: !!token,
        token_preview: token.substring(0, 10) + '...',
        ad_account: process.env.META_AD_ACCOUNT_ID
    });
});

// 1. BUSCA DE INTERESSES (COM LOG DE ERRO REAL)
app.get('/api/meta/targeting-search', async (req, res) => {
    const query = (req.query.q || '').toLowerCase();

    console.log(`🔎 [SERVER] Recebido pedido de busca: "${query}"`);

    if (!process.env.META_TOKEN) {
        console.error("❌ [SERVER] ERRO: META_TOKEN não encontrado no .env");
        return res.json([]);
    }

    try {
        const url = `https://graph.facebook.com/v19.0/search?type=adinterest&q=${encodeURIComponent(query)}&limit=10&locale=pt_BR&access_token=${process.env.META_TOKEN}`;

        const apiRes = await axios.get(url);

        if (apiRes.data && apiRes.data.data) {
            console.log(`✅ [SERVER] Facebook retornou ${apiRes.data.data.length} itens.`);

            const cleanData = apiRes.data.data.map(item => ({
                id: item.id,
                name: item.name,
                audience_size: item.audience_size_lower_bound || item.audience_size
            }));
            return res.json(cleanData);
        }
        res.json([]);

    } catch (e) {
        // AQUI ESTÁ O SEGREDO: Vamos ver o erro real no terminal
        const fbError = e.response?.data?.error;
        console.error("🚨 [SERVER] ERRO FACEBOOK:", JSON.stringify(fbError, null, 2));

        // Se for erro de permissão, avisa no console
        if (fbError?.code === 190) console.error("👉 CAUSA: Token inválido ou expirado.");
        if (fbError?.code === 100) console.error("👉 CAUSA: Permissão 'ads_read' faltando.");

        res.json([]);
    }
});

// 2. HOTSPOTS SERVER
app.post('/api/intelligence/hotspots-server', async (req, res) => {
    try {
        const { briefing } = req.body;
        const cityQuery = (briefing?.geography?.city || 'Brasil').trim();
        const state = briefing?.geography?.state;
        const cityLower = cityQuery.toLowerCase();

        let center = null;

        // Se já veio coordenada válida no briefing, priorize
        if (briefing?.geography?.lat && briefing?.geography?.lng) {
            center = { lat: briefing.geography.lat, lng: briefing.geography.lng, source: 'briefing' };
        }

        // Macro fallback
        if (!center && ['brasil', 'nacional', 'global'].includes(cityLower)) {
            center = { lat: -15.7975, lng: -47.8919, source: 'macro' };
        }

        // Geocodifica cidade solicitada
        if (!center) {
            const geo = await geocodeCity(cityQuery, state);
            if (geo) {
                center = { lat: geo.lat, lng: geo.lng, source: 'geocode', displayName: geo.displayName };
            }
        }

        // Fallback definitivo: São Paulo
        if (!center) {
            center = { lat: -23.5505, lng: -46.6333, source: 'fallback' };
        }

        const radiusKm = Number(briefing?.geography?.radius) || 5;
        const radiusDegrees = Math.max(0.005, (radiusKm / 111) * 0.8); // 1 deg ~= 111km
        const hotspots = [];

        for (let i = 0; i < 20; i++) {
            const latOffset = (Math.random() - 0.5) * radiusDegrees;
            const lngOffset = (Math.random() - 0.5) * radiusDegrees;
            hotspots.push({
                id: `h-${i}`,
                lat: center.lat + latOffset,
                lng: center.lng + lngOffset,
                label: `Zona ${i + 1} - ${cityQuery}`,
                score: 85 + Math.floor(Math.random() * 10),
                radiusMeters: radiusKm * 1000
            });
        }
        res.json({ status: 'success', data: { hotspots, center: [center.lat, center.lng], provenance: center.source } });

    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.all('/api/connectors/google-ads/verify', (req, res) => res.json({ status: 'ACTIVE' }));
app.all('/api/connectors/rfb/verify', (req, res) => res.json({ status: 'ACTIVE' }));
app.all('/api/connectors/meta-ads/verify', (req, res) => res.json({ status: 'ACTIVE' }));
app.all('/api/ibge/admin', (req, res) => res.json({ status: 'ACTIVE', data: [] }));
app.post('/api/meta-ads/campaign-create', (req, res) => res.json({ success: true })); // Stub para focar no erro atual
app.post('/api/intelligence/territory', (req, res) => res.json({ status: 'REAL', data: { locationName: 'Local', averageIncome: 5000 } }));

// IBGE Admin (Estados/Municipios)
app.get('/api/ibge/admin', async (req, res) => {
    try {
        const level = (req.query.level || '').toString();
        if (!['state', 'municipio'].includes(level)) {
            return res.status(400).json({ error: 'Parâmetro level deve ser "state" ou "municipio".' });
        }

        const filePath = path.join(IBGE_DATA_ROOT, 'admin', `${level}.geojson`);
        try {
            const raw = await fs.readFile(filePath, 'utf8');
            const json = JSON.parse(raw);
            return res.json(json);
        } catch (err) {
            console.warn(`⚠️  [IBGE Admin] Arquivo não encontrado para ${level}:`, err.message);
            return res.status(404).json({ error: `GeoJSON de admin (${level}) não encontrado.` });
        }
    } catch (error) {
        console.error('🚨 [IBGE Admin] Erro interno', error);
        res.status(500).json({ error: 'Falha ao carregar camada administrativa.' });
    }
});

// IBGE Sectors (Setores Censitários)
app.get('/api/ibge/sectors', async (req, res) => {
    try {
        const municipioId = (req.query.municipioId || '').toString().trim();
        if (!municipioId) {
            return res.status(400).json({ error: 'Parâmetro municipioId é obrigatório.' });
        }

        const filePath = path.join(IBGE_DATA_ROOT, 'sectors', `${municipioId}.geojson`);
        try {
            const raw = await fs.readFile(filePath, 'utf8');
            const json = JSON.parse(raw);
            return res.json(json);
        } catch (err) {
            console.warn(`⚠️  [IBGE Sectors] Arquivo não encontrado para ${municipioId}:`, err.message);
            return res.status(404).json({ error: `GeoJSON de setores para ${municipioId} não encontrado.` });
        }
    } catch (error) {
        console.error('🚨 [IBGE Sectors] Erro interno', error);
        res.status(500).json({ error: 'Falha ao carregar setores IBGE.' });
    }
});

app.listen(PORT, () => console.log(`🦅 BIA SERVER DEBUG MODE (Porta ${PORT})`));
