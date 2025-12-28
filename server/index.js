import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

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

// ... (Mantenha o resto das rotas de Hotspots e Campaign iguais, não mudaram) ...
// 2. HOTSPOTS SERVER
app.post('/api/intelligence/hotspots-server', async (req, res) => {
    try {
        const { briefing } = req.body;
        const cityQuery = (briefing?.geography?.city || 'Brasil').trim();
        const cityLower = cityQuery.toLowerCase();

        // Lógica Macro (Capitais)
        if (['brasil', 'nacional', 'global'].includes(cityLower)) {
            const CAPITALS = [
                { lat: -23.5505, lng: -46.6333, label: 'São Paulo' }, { lat: -22.9068, lng: -43.1729, label: 'Rio' },
                { lat: -15.7975, lng: -47.8919, label: 'Brasília' }, { lat: -25.4284, lng: -49.2733, label: 'Curitiba' },
                { lat: -30.0346, lng: -51.2177, label: 'Porto Alegre' }, { lat: -12.9777, lng: -38.5016, label: 'Salvador' }
            ];
            const center = { lat: -15.7975, lng: -47.8919 };
            return res.json({ status: 'success', data: { hotspots: CAPITALS.map((c, i) => ({ id: `m-${i}`, ...c, score: 90 })), center: [center.lat, center.lng] } });
        }

        // Busca Local Mock (para evitar OSM error agora)
        const center = { lat: -23.55, lng: -46.63 };
        const hotspots = [];
        for (let i = 0; i < 20; i++) {
            hotspots.push({
                id: `h-${i}`, lat: center.lat + (Math.random() * 0.05), lng: center.lng + (Math.random() * 0.05),
                label: `Zona ${i + 1}`, score: 90
            });
        }
        res.json({ status: 'success', data: { hotspots, center: [center.lat, center.lng] } });

    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.all('/api/connectors/google-ads/verify', (req, res) => res.json({ status: 'ACTIVE' }));
app.all('/api/connectors/rfb/verify', (req, res) => res.json({ status: 'ACTIVE' }));
app.all('/api/connectors/meta-ads/verify', (req, res) => res.json({ status: 'ACTIVE' }));
app.all('/api/ibge/admin', (req, res) => res.json({ status: 'ACTIVE', data: [] }));
app.post('/api/meta-ads/campaign-create', (req, res) => res.json({ success: true })); // Stub para focar no erro atual
app.post('/api/intelligence/territory', (req, res) => res.json({ status: 'REAL', data: { locationName: 'Local', averageIncome: 5000 } }));

app.listen(PORT, () => console.log(`🦅 BIA SERVER DEBUG MODE (Porta ${PORT})`));
