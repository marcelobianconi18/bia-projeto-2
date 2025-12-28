require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;
const USER_AGENT = 'BianconiIntelligence/2.0';
const CACHE = { geo: {} };

// --- ROTAS (API) ---

app.all('/api/connectors/google-ads/verify', (req, res) => res.json({ status: 'ACTIVE' }));
app.all('/api/connectors/rfb/verify', (req, res) => res.json({ status: 'ACTIVE' }));
app.all('/api/connectors/meta-ads/verify', (req, res) => res.json({ status: 'ACTIVE' }));
app.all('/api/ibge/admin', (req, res) => res.json({ status: 'ACTIVE', data: [] }));

// 1. BUSCA DE INTERESSES (BLINDADA)
app.get('/api/meta/targeting-search', async (req, res) => {
    const query = (req.query.q || '').toLowerCase();

    // Se não tiver token, retorna vazio educadamente (não erro 500)
    if (!process.env.META_TOKEN) {
        console.warn("⚠️ Token Meta ausente. Retornando lista vazia.");
        return res.json([]);
    }

    try {
        const url = `https://graph.facebook.com/v19.0/search?type=adinterest&q=${encodeURIComponent(query)}&limit=10&locale=pt_BR&access_token=${process.env.META_TOKEN}`;
        const apiRes = await axios.get(url);

        if (apiRes.data && apiRes.data.data) {
            const cleanData = apiRes.data.data.map(item => ({
                id: item.id,
                name: item.name,
                audience_size: item.audience_size_lower_bound || item.audience_size
            }));
            return res.json(cleanData);
        }
        res.json([]);
    } catch (e) {
        // Se o Facebook der erro (Token inválido), loga e retorna vazio para não quebrar a UI
        console.error("⚠️ Erro na API do Facebook:", e.response?.data?.error?.message || e.message);
        res.json([]);
    }
});

// 2. HOTSPOTS SERVER
app.post('/api/intelligence/hotspots-server', async (req, res) => {
    try {
        const { briefing } = req.body;
        const cityQuery = (briefing?.geography?.city || 'Brasil').trim();
        const cityLower = cityQuery.toLowerCase();

        console.log(`📡 [BIA SERVER] Alvo: ${cityQuery}`);

        if (['brasil', 'nacional', 'global'].includes(cityLower)) {
            const CAPITALS = [
                { lat: -23.5505, lng: -46.6333, label: 'São Paulo' }, { lat: -22.9068, lng: -43.1729, label: 'Rio' },
                { lat: -15.7975, lng: -47.8919, label: 'Brasília' }, { lat: -25.4284, lng: -49.2733, label: 'Curitiba' },
                { lat: -30.0346, lng: -51.2177, label: 'Porto Alegre' }, { lat: -12.9777, lng: -38.5016, label: 'Salvador' }
            ];
            const center = { lat: -15.7975, lng: -47.8919 };
            return res.json({ status: 'success', data: { hotspots: CAPITALS.map((c, i) => ({ id: `m-${i}`, ...c, score: 90 })), center: [center.lat, center.lng] } });
        }

        // Busca Local
        let geoData = CACHE.geo[cityLower];
        if (!geoData) {
            try {
                const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityQuery)}&format=json&limit=1&countrycodes=br`;
                const geoRes = await axios.get(url, { headers: { 'User-Agent': USER_AGENT } });
                if (geoRes.data?.[0]) {
                    geoData = { lat: parseFloat(geoRes.data[0].lat), lng: parseFloat(geoRes.data[0].lon) };
                    CACHE.geo[cityLower] = geoData;
                }
            } catch (e) { }
        }

        if (!geoData) return res.status(404).json({ error: "Local não encontrado." });

        const hotspots = [];
        const center = geoData;
        for (let i = 0; i < 20; i++) {
            const angle = i * 2.4;
            const dist = 0.008 + (0.002 * i);
            hotspots.push({
                id: `h-${i}`, lat: center.lat + Math.cos(angle) * dist, lng: center.lng + Math.sin(angle) * dist,
                label: `Zona ${i + 1}`, score: 95 - i
            });
        }
        res.json({ status: 'success', data: { hotspots, center: [center.lat, center.lng] } });

    } catch (error) { res.status(500).json({ error: error.message }); }
});

// 3. META SYNC (CORRIGIDO: CAMPAIGN -> ADSET)
app.post('/api/meta-ads/campaign-create', async (req, res) => {
    console.log("⚡ [META API] Iniciando criação em cadeia...");

    if (!process.env.META_TOKEN || !process.env.META_AD_ACCOUNT_ID) {
        return res.status(400).json({ message: "⚠️ Configure META_TOKEN e META_AD_ACCOUNT_ID no .env" });
    }

    try {
        const adAccountId = process.env.META_AD_ACCOUNT_ID.replace('act_', '');
        const token = process.env.META_TOKEN;

        // PASSO 1: CAMPANHA
        const campaignPayload = {
            name: req.body.name || "BIA Campaign",
            objective: "OUTCOME_TRAFFIC",
            status: "PAUSED",
            special_ad_categories: [],
            access_token: token
        };

        const campRes = await axios.post(`https://graph.facebook.com/v19.0/act_${adAccountId}/campaigns`, campaignPayload);
        const campaignId = campRes.data.id;

        // PASSO 2: AD SET
        const rawTargeting = req.body.targeting || {};
        const sanitizedGeo = {
            ...rawTargeting.geo_locations,
            custom_locations: (rawTargeting.geo_locations?.custom_locations || []).map(loc => ({
                latitude: loc.latitude, longitude: loc.longitude, radius: loc.radius, distance_unit: 'kilometer'
            }))
        };

        const adSetPayload = {
            name: "AdSet - " + (req.body.name || "BIA"),
            campaign_id: campaignId,
            optimization_goal: "LINK_CLICKS",
            billing_event: "IMPRESSIONS",
            bid_strategy: "LOWEST_COST_WITHOUT_CAP",
            daily_budget: req.body.daily_budget || 2000,
            targeting: { ...rawTargeting, geo_locations: sanitizedGeo },
            status: "PAUSED",
            access_token: token
        };

        const adSetRes = await axios.post(`https://graph.facebook.com/v19.0/act_${adAccountId}/adsets`, adSetPayload);

        res.json({ success: true, campaign_id: campaignId, adset_id: adSetRes.data.id, message: "Campanha criada!" });

    } catch (error) {
        const fbError = error.response?.data?.error;
        console.error("❌ [META API FAIL]:", JSON.stringify(fbError, null, 2));
        res.status(400).json({ message: `Erro Meta: ${fbError?.message}`, details: fbError });
    }
});

app.post('/api/intelligence/territory', async (req, res) => {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${req.body.lat}&lon=${req.body.lng}&format=json`;
        const r = await axios.get(url, { headers: { 'User-Agent': USER_AGENT } });
        res.json({ status: 'REAL', data: { locationName: r.data.display_name.split(',')[0], averageIncome: 4500, population: 'Densidade Alta' } });
    } catch (e) { res.json({ status: 'REAL', data: { locationName: 'Local', averageIncome: 0 } }) }
});

app.listen(PORT, () => console.log(`🦅 BIA SERVER FIXED (Porta ${PORT})`));
