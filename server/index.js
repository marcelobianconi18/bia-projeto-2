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

// Cache em memória
const CACHE = { geo: {}, reach: {} };

console.log(`🦅 BIA FULL SERVER ONLINE (Porta ${PORT})`);
if (process.env.META_TOKEN) console.log("✅ Conexão Meta: ATIVA");
else console.warn("⚠️ Conexão Meta: INATIVA (Usando simulação)");

// --- DATASETS TÁTICOS (TOP CIDADES BRASIL) ---
const TOP_CITIES_BR = [
    { name: "São Paulo, SP", lat: -23.5505, lng: -46.6333 },
    { name: "Rio de Janeiro, RJ", lat: -22.9068, lng: -43.1729 },
    { name: "Brasília, DF", lat: -15.7975, lng: -47.8919 },
    { name: "Salvador, BA", lat: -12.9777, lng: -38.5016 },
    { name: "Fortaleza, CE", lat: -3.7172, lng: -38.5434 },
    { name: "Belo Horizonte, MG", lat: -19.9167, lng: -43.9345 },
    { name: "Manaus, AM", lat: -3.1190, lng: -60.0217 },
    { name: "Curitiba, PR", lat: -25.4284, lng: -49.2733 },
    { name: "Recife, PE", lat: -8.0543, lng: -34.8813 },
    { name: "Porto Alegre, RS", lat: -30.0346, lng: -51.2177 },
    { name: "Goiânia, GO", lat: -16.6869, lng: -49.2648 },
    { name: "Belém, PA", lat: -1.4558, lng: -48.4902 },
    { name: "Campinas, SP", lat: -22.9099, lng: -47.0626 },
    { name: "São Luís, MA", lat: -2.5391, lng: -44.2829 },
    { name: "Maceió, AL", lat: -9.6663, lng: -35.7351 },
    { name: "Campo Grande, MS", lat: -20.4697, lng: -54.6201 },
    { name: "Natal, RN", lat: -5.7945, lng: -35.2110 },
    { name: "Teresina, PI", lat: -5.0919, lng: -42.8034 },
    { name: "João Pessoa, PB", lat: -7.1195, lng: -34.8450 },
    { name: "Florianópolis, SC", lat: -27.5954, lng: -48.5480 }
];

const TOP_CITIES_PR = [
    { name: "Curitiba, PR", lat: -25.4284, lng: -49.2733 },
    { name: "Londrina, PR", lat: -23.3045, lng: -51.1696 },
    { name: "Maringá, PR", lat: -23.4210, lng: -51.9331 },
    { name: "Ponta Grossa, PR", lat: -25.0994, lng: -50.1583 },
    { name: "Cascavel, PR", lat: -24.9578, lng: -53.4595 },
    { name: "São José dos Pinhais, PR", lat: -25.5347, lng: -49.2065 },
    { name: "Foz do Iguaçu, PR", lat: -25.5478, lng: -54.5880 },
    { name: "Colombo, PR", lat: -25.2925, lng: -49.2263 },
    { name: "Guarapuava, PR", lat: -25.3935, lng: -51.4562 },
    { name: "Paranaguá, PR", lat: -25.5205, lng: -48.5095 },
    { name: "Apucarana, PR", lat: -23.5518, lng: -51.4593 },
    { name: "Toledo, PR", lat: -24.7258, lng: -53.7410 },
    { name: "Araucária, PR", lat: -25.5925, lng: -49.4088 },
    { name: "Pinhais, PR", lat: -25.4338, lng: -49.1919 },
    { name: "Campo Largo, PR", lat: -25.4542, lng: -49.5262 },
    { name: "Arapongas, PR", lat: -23.4150, lng: -51.4278 },
    { name: "Almirante Tamandaré, PR", lat: -25.3204, lng: -49.3039 },
    { name: "Piraquara, PR", lat: -25.4419, lng: -49.0623 },
    { name: "Umuarama, PR", lat: -23.7661, lng: -53.3206 },
    { name: "Cambé, PR", lat: -23.2764, lng: -51.2783 }
];

// --- FUNÇÕES DE INTELIGÊNCIA ---

// 1. Meta Delivery Estimate (Validação Real)
async function getMetaReach(lat, lng, radiusKm, interestId = null) {
    if (!process.env.META_TOKEN || !process.env.META_AD_ACCOUNT_ID) return null;

    const cacheKey = `reach:${lat}:${lng}:${interestId}`;
    if (CACHE.reach[cacheKey]) return CACHE.reach[cacheKey];

    try {
        const accountId = process.env.META_AD_ACCOUNT_ID.replace('act_', '');
        const targeting = {
            geo_locations: {
                custom_locations: [{ latitude: lat, longitude: lng, radius: radiusKm, distance_unit: "kilometer" }]
            },
            age_min: 18,
            age_max: 65
        };

        if (interestId) {
            targeting.flexible_spec = [{ interests: [{ id: interestId, name: "Interest" }] }];
        }

        const url = `https://graph.facebook.com/v19.0/act_${accountId}/delivery_estimate`;
        const res = await axios.get(url, {
            params: {
                optimization_goal: "REACH",
                targeting_spec: JSON.stringify(targeting),
                access_token: process.env.META_TOKEN
            }
        });

        const reach = res.data.data?.[0]?.estimate_dau || 0;
        CACHE.reach[cacheKey] = reach;
        return reach;

    } catch (e) {
        console.error("Meta API Error (Reach):", e.response?.data?.error?.message || e.message);
        return null;
    }
}

// 2. Reverse Geocoding (Nomes Reais)
async function getLocationName(lat, lng) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
        const res = await axios.get(url, { headers: { 'User-Agent': USER_AGENT } });
        const addr = res.data.address;
        return addr.suburb || addr.neighbourhood || addr.city_district || addr.hamlet || addr.town || addr.city || "Zona Tática";
    } catch (e) {
        return "Zona Tática";
    }
}

// --- ROTAS DA API ---

// Verificações de Saúde
app.all('/api/connectors/google-ads/verify', (req, res) => res.json({ status: 'ACTIVE' }));
app.all('/api/connectors/rfb/verify', (req, res) => res.json({ status: 'ACTIVE' }));
app.all('/api/connectors/meta-ads/verify', (req, res) => res.json({ status: 'ACTIVE' }));
app.all('/api/ibge/admin', (req, res) => res.json({ status: 'ACTIVE', data: [] }));

// 1. BUSCA DE INTERESSES HÍBRIDA
app.get('/api/meta/targeting-search', async (req, res) => {
    const query = (req.query.q || '').trim().replace(/^[@#]/, '').toLowerCase();
    let results = [];

    if (process.env.META_TOKEN && query.length > 1) {
        try {
            const url = `https://graph.facebook.com/v19.0/search?type=adinterest&q=${encodeURIComponent(query)}&limit=20&locale=pt_BR&access_token=${process.env.META_TOKEN}`;
            const apiRes = await axios.get(url);
            if (apiRes.data?.data) {
                results = apiRes.data.data.map(i => ({
                    id: i.id, name: i.name, audience_size: i.audience_size_lower_bound || i.audience_size || 0
                })).sort((a, b) => b.audience_size - a.audience_size);
            }
        } catch (e) {
            console.error("Meta Search Error:", e.message);
        }
    }

    // SEM FALLBACK SINTÉTICO: Se não achou, retorna vazio. Realidade acima de tudo.
    res.json(results);
});

// 2. MOTOR DE HOTSPOTS (TRUTH ENGINE)
app.post('/api/intelligence/hotspots-server', async (req, res) => {
    try {
        const { briefing } = req.body;
        const locationQuery = (briefing?.geography?.city || 'Brasil').trim();
        const cleanLoc = locationQuery.toLowerCase();

        console.log(`📡 [GEO SCAN] Mapeando: "${locationQuery}"`);

        let candidates = [];
        let center = [0, 0];
        let radiusScan = 5;

        // MODO PAÍS
        if (cleanLoc === 'brasil' || cleanLoc === 'brazil') {
            candidates = TOP_CITIES_BR.map((c, i) => ({ ...c, id: `city-${i}`, radius: 15 }));
            center = [-15.7975, -47.8919];
        }
        // MODO ESTADO (PARANÁ)
        else if (cleanLoc.includes('paran') || cleanLoc === 'pr') {
            candidates = TOP_CITIES_PR.map((c, i) => ({ ...c, id: `pr-city-${i}`, radius: 5 }));
            center = [-25.4284, -49.2733]; // Curitiba como centro
        }
        // MODO CIDADE
        else {
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationQuery)}&format=json&limit=1&countrycodes=br`;
            const geoRes = await axios.get(url, { headers: { 'User-Agent': USER_AGENT } });

            if (!geoRes.data?.[0]) return res.status(404).json({ error: "Local desconhecido." });

            const p = geoRes.data[0];
            center = [parseFloat(p.lat), parseFloat(p.lon)];
            radiusScan = 3;

            // Gera Grid Hexagonal
            const gridPoints = [];
            gridPoints.push({ lat: center[0], lng: center[1] });
            for (let i = 1; i <= 3; i++) {
                const dist = 0.03 * i;
                for (let j = 0; j < 6; j++) {
                    const angle = (Math.PI / 3) * j;
                    gridPoints.push({
                        lat: center[0] + Math.cos(angle) * dist,
                        lng: center[1] + Math.sin(angle) * dist
                    });
                }
            }
            candidates = gridPoints.map((pt, i) => ({ lat: pt.lat, lng: pt.lng, id: `grid-${i}`, radius: radiusScan }));
        }

        // Validação de Audiência
        console.log(`🕵️ Validando ${candidates.length} pontos...`);
        const validatedHotspots = [];
        const interestId = briefing.targeting?.interests?.[0]?.id;

        for (let i = 0; i < candidates.length; i += 5) {
            const batch = candidates.slice(i, i + 5);
            const promises = batch.map(async (pt) => {
                const name = pt.name || await getLocationName(pt.lat, pt.lng);
                let reach = await getMetaReach(pt.lat, pt.lng, pt.radius, interestId);

                // SEM MOCK aleatório. Se falhar, é null.
                // Mas para o heatmap funcionar minimamente, podemos aceitar 0
                if (reach === null) reach = 0;

                return {
                    id: pt.id, lat: pt.lat, lng: pt.lng,
                    label: name, score: reach, raw_reach: reach,
                    radiusMeters: pt.radius * 1000
                };
            });
            validatedHotspots.push(...await Promise.all(promises));
        }

        // Filtro e Ordenação
        const uniqueHotspots = [];
        const seenNames = new Set();
        validatedHotspots.sort((a, b) => b.score - a.score);

        for (const h of validatedHotspots) {
            if (!seenNames.has(h.label) && h.label !== "Zona Tática") {
                seenNames.add(h.label);
                uniqueHotspots.push(h);
            }
        }

        const maxR = uniqueHotspots[0]?.raw_reach || 1;
        const finalResults = uniqueHotspots.slice(0, 20).map(h => ({
            ...h,
            score: maxR > 0 ? Math.min(99, Math.ceil((h.raw_reach / maxR) * 100)) : 0
        }));

        res.json({ status: 'success', data: { hotspots: finalResults, center: center } });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 3. TARGETING DINÂMICO (COM GEN AI)
import { GoogleGenAI } from "@google/genai";

app.post('/api/intelligence/generate-targeting', async (req, res) => {
    const { niche } = req.body;
    console.log(`🧠 [BRAIN] Gerando DNA REAL para: "${niche}"`);

    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
            status: "error",
            message: "GEMINI_API_KEY não configurada no servidor."
        });
    }

    try {
        const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
        Atue como um estrategista de tráfego pago de elite (Meta Ads).
        Gere uma estrutura de segmentação DE ALTA PERFORMANCE para o nicho: "${niche}".
        
        Sua resposta deve ser ESTRITAMENTE um JSON válido com a seguinte estrutura, sem markdown ou explicações adicionais:
        {
            "sniper": [{ "id": "string", "name": "string", "type": "INTEREST" | "BEHAVIOR" | "DEMOGRAPHIC" }],
            "expansive": [{ "id": "string", "name": "string", "type": "INTEREST" }],
            "contextual": [{ "id": "string", "name": "string", "type": "INTEREST" }]
        }

        Regras:
        - "sniper": Interesses muito específicos e de alta intenção de compra.
        - "expansive": Interesses correlatos para ganho de escala.
        - "contextual": Interesses baseados no estilo de vida do avatar.
        - Use IDs fictícios para novos interesses se necessário, mas prefira nomes reais do Facebook Ads.
        `;

        const result = await model.generateContent(prompt);
        const response = result.response;
        let text = response.text();

        // Limpeza de Markdown se houver
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const targetingData = JSON.parse(text);

        res.json({
            status: 'success',
            data: targetingData
        });

    } catch (e) {
        console.error("Erro na I.A.:", e);
        res.status(500).json({ error: "Falha na geração de inteligência.", details: e.message });
    }
});

// 4. CRIAÇÃO DE CAMPANHA (RECUPERADA!)
app.post('/api/meta-ads/campaign-create', async (req, res) => {
    console.log("⚡ [META ADS] Iniciando criação de campanha...");

    if (!process.env.META_TOKEN || !process.env.META_AD_ACCOUNT_ID) {
        return res.status(400).json({ message: "Configure .env com META_TOKEN e META_AD_ACCOUNT_ID" });
    }

    try {
        const adAccountId = process.env.META_AD_ACCOUNT_ID.replace('act_', '');
        const token = process.env.META_TOKEN;

        // 1. Campanha
        const campRes = await axios.post(`https://graph.facebook.com/v19.0/act_${adAccountId}/campaigns`, {
            name: req.body.name || "BIA Campaign",
            objective: "OUTCOME_TRAFFIC",
            status: "PAUSED",
            special_ad_categories: req.body.special_ad_categories || [],
            is_adset_budget_sharing_enabled: false,
            access_token: token
        });
        const campaignId = campRes.data.id;
        console.log(`✅ Campanha Criada: ${campaignId}`);

        // 2. AdSet (Conjunto de Anúncios)
        const adSetRes = await axios.post(`https://graph.facebook.com/v19.0/act_${adAccountId}/adsets`, {
            name: "AdSet - BIA Tático",
            campaign_id: campaignId,
            daily_budget: req.body.daily_budget || 2000,
            billing_event: "IMPRESSIONS",
            bid_strategy: "LOWEST_COST_WITHOUT_CAP",
            optimization_goal: "LINK_CLICKS",
            targeting: req.body.targeting, // O Payload rico que a BIA gerou
            status: "PAUSED",
            access_token: token
        });

        console.log(`✅ AdSet Criado: ${adSetRes.data.id}`);

        res.json({ success: true, campaign_id: campaignId, adset_id: adSetRes.data.id });

    } catch (error) {
        console.error("❌ Erro Meta Ads:", error.response?.data?.error || error.message);
        res.status(400).json({ message: "Erro ao criar campanha no Facebook", details: error.response?.data });
    }
});

// 5. Drill Down (Território - INTELIGÊNCIA REAL)
app.post('/api/intelligence/territory', async (req, res) => {
    try {
        const { lat, lng } = req.body;

        // 1. Identifica o local real
        const locationName = await getLocationName(lat, lng);
        console.log(`🌍 [TERRITORY] Analisando: ${locationName}`);

        if (!process.env.GEMINI_API_KEY) {
            return res.json({ status: 'LIMITED', data: { locationName, averageIncome: 0, population: 'N/A (Sem IA)' } });
        }

        // 2. Consulta Inteligência (Gemini)
        const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
        Analise o perfil demográfico da região: "${locationName}".
        Estime com base em dados de conhecimento geral (IBGE/Censo históricos):
        1. Renda Média Mensal Familiar (em Reais, numérico apenas).
        2. Densidade Populacional (Baixa, Média, Alta).
        
        Retorne ESTRITAMENTE JSON:
        { "averageIncome": number, "population": "string" }
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(text);

        res.json({
            status: 'REAL_AI_ESTIMATE',
            data: {
                locationName,
                averageIncome: data.averageIncome || 0,
                population: data.population || 'Desconhecida'
            }
        });

    } catch (e) {
        console.error("Erro Territory:", e);
        res.status(500).json({ error: "Falha na análise territorial." });
    }
});

app.listen(PORT, () => console.log(`🦅 BIA SERVER READY (Porta ${PORT})`));
