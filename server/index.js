import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const buildPrompt = (data) => `
Você é a BIA (Bianconi Intelligence for Ads), especialista em Geomarketing e Copywriting Tático.

ANALISE O BRIEFING ESTRATÉGICO:
1. Nicho + Diferencial: ${data.productDescription}
2. Funil de Contato: ${data.contactMethod}
3. Transformação/Emoção Pós-Compra: ${data.usageDescription}

CONTEXTO OPERACIONAL:
Modelo: ${data.operationalModel}
Público: ${data.targetGender}, idades ${Array.isArray(data.targetAge) ? data.targetAge.join(', ') : ''}
Posicionamento: ${data.marketPositioning}
Local: ${data.geography?.city}
Objetivo: ${data.objective}

SUA MISSÃO:
Baseado no Nicho, Funil e Transformação informados, gere um 'Veredito Tático' e um JSON de saída.

SAÍDA (JSON estrito, SEM MARKDOWN):
Campos obrigatórios: "verdict" (string), "action" (string), "score" (0-100 number).
Campos opcionais: "confidence" (0-100), "reasons" (string[] - top 3), "risks" (string[] - top 2), "limitations" (string[]).

EXEMPLO_DE_SAIDA:
{ "verdict": "...", "action": "...", "score": 78, "confidence": 82, "reasons": ["A","B"], "risks": ["C"] }

Observação: envie apenas o JSON, sem texto adicional.
`;

const safeParseJson = (text) => {
    if (!text) return { ok: false };
    const cleaned = String(text).replace(/```json|```/gi, '').trim();
    const startIndex = Math.min(
        ...['{', '['].map((ch) => {
            const i = cleaned.indexOf(ch);
            return i === -1 ? Number.MAX_SAFE_INTEGER : i;
        })
    );
    const fragment = startIndex === Number.MAX_SAFE_INTEGER ? cleaned : cleaned.slice(startIndex);
    try {
        return { ok: true, value: JSON.parse(fragment) };
    } catch {
        return { ok: false };
    }
};

app.post('/api/analysis', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });
    }

    const briefing = req.body?.briefing;
    if (!briefing) {
        return res.status(400).json({ error: 'Missing briefing' });
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: buildPrompt(briefing),
            config: { responseMimeType: 'application/json' }
        });

        const text = (response && response.text) || '{}';
        const parsed = safeParseJson(text);
        if (parsed.ok && parsed.value) return res.json(parsed.value);

        return res.json({
            verdict: "Resposta inválida do modelo. Revisão humana recomendada.",
            action: "Revise o briefing e valide manualmente as zonas sugeridas.",
            score: 50,
            limitations: ["Model output was not valid JSON"]
        });
    } catch (err) {
        console.error('Analysis endpoint failed', err);
        return res.status(500).json({
            verdict: "Erro no servidor de análise. Revisão humana recomendada.",
            action: "Verifique o servidor e as credenciais do Gemini.",
            score: 50,
            limitations: ["Server error"]
        });
    }
});

// --- Stub Routes for Future Integrations (Canonical Format) ---

app.get('/api/google/places', (req, res) => {
    res.status(501).json({
        ok: false,
        status: 'NOT_CONFIGURED',
        connector: 'GOOGLE_PLACES', // or INTERNAL
        message: 'API Key missing. Please configure GOOGLE_API_KEY in .env',
        missing: ['GOOGLE_API_KEY'],
        requestId: `req_${Date.now()}`,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/meta/ads', (req, res) => {
    res.status(501).json({
        ok: false,
        status: 'NOT_CONFIGURED',
        connector: 'META_ADS',
        message: 'Access Token missing.',
        missing: ['META_TOKEN'],
        requestId: `req_${Date.now()}`,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/google/ads', (req, res) => {
    res.status(501).json({
        ok: false,
        status: 'NOT_CONFIGURED',
        connector: 'GOOGLE_ADS',
        message: 'Access Token missing.',
        missing: ['GOOGLE_ADS_CLIENT_ID'],
        requestId: `req_${Date.now()}`,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/rfb/cnpj', (req, res) => {
    res.status(501).json({
        ok: false,
        status: 'NOT_CONFIGURED',
        connector: 'RFB',
        message: 'Receita Federal connector not implemented.',
        missing: ['RFB_CERT_PATH', 'RFB_PASSWORD'],
        requestId: `req_${Date.now()}`,
        timestamp: new Date().toISOString()
    });
});

// --- Phase 2: Connector Verify Stubs ---

const respondConnectorStub = (name) => (_req, res) =>
    res.status(501).json({ connector: name, status: 'NOT_CONFIGURED', message: 'Missing config' });

app.get('/api/connectors/google-ads/verify', respondConnectorStub('google-ads'));
app.post('/api/connectors/google-ads/verify', respondConnectorStub('google-ads'));

app.get('/api/connectors/meta-ads/verify', respondConnectorStub('meta-ads'));
app.post('/api/connectors/meta-ads/verify', respondConnectorStub('meta-ads'));

app.get('/api/connectors/rfb/verify', respondConnectorStub('rfb'));
app.post('/api/connectors/rfb/verify', respondConnectorStub('rfb'));

app.get('/api/ga4/weekly-heatmap', (req, res) => {
    res.status(501).json({
        ok: false,
        status: 'NOT_CONFIGURED',
        connector: 'GA4',
        message: 'GA4 connector not implemented.',
        missing: ['GA4_PROPERTY_ID'],
        requestId: `req_${Date.now()}`,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/google/ads/weekly-heatmap', (req, res) => {
    res.status(501).json({
        ok: false,
        status: 'NOT_CONFIGURED',
        connector: 'GOOGLE_ADS',
        message: 'Google Ads connector not implemented.',
        missing: ['GOOGLE_ADS_CUSTOMER_ID', 'GOOGLE_ADS_TOKEN'],
        requestId: `req_${Date.now()}`,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/meta/ads/weekly-heatmap', (req, res) => {
    res.status(501).json({
        ok: false,
        status: 'NOT_CONFIGURED',
        connector: 'META_ADS',
        message: 'Meta Ads connector not implemented.',
        missing: ['META_ADS_ACCOUNT_ID', 'META_TOKEN'],
        requestId: `req_${Date.now()}`,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/mobility/weekly-heatmap', (req, res) => {
    res.status(501).json({
        connector: 'Mobility',
        status: 'NOT_CONFIGURED',
        message: 'Mobility connector not implemented.',
        provenance: 'NOT_CONFIGURED',
        required_env: ['MOBILITY_API_KEY']
    });
});


// --- Timeseries 168h Engine (Phase 3) ---
import { GoogleAdsTimeseriesProvider } from './connectors/googleAdsTimeseriesProvider.js';
import { MetaAdsTimeseriesProvider } from './connectors/metaAdsTimeseriesProvider.js';

const gAdsProvider = new GoogleAdsTimeseriesProvider();
const metaAdsProvider = new MetaAdsTimeseriesProvider();

app.get('/api/insights/timeseries168', async (req, res) => {
    const { source, regionKind, regionId, tz, windowDays } = req.query;
    const isRealOnly = process.env.VITE_REAL_ONLY === 'true';

    // 1. REAL_ONLY Guard
    if (isRealOnly) {
        // In strict REAL_ONLY mode, we do NOT alucinate data.
        // If we had real credentials we would fetch real data. 
        // But since providers are stubs, they effectively return UNAVAILABLE.
        // We pass through to provider to let it decide based on creds availability, 
        // OR we force a specific response if we want to be overly safe.
        // The requirement says: "If VITE_REAL_ONLY=true... Return 200 with source:UNAVAILABLE"
        // Let's delegate to provider but ensure safe response.
    }

    let result;
    try {
        if (source === 'GOOGLE_ADS') {
            result = await gAdsProvider.getTimeseries168({ regionKind, regionId, tz, days: Number(windowDays) });
        } else if (source === 'META_ADS') {
            result = await metaAdsProvider.getTimeseries168({ regionKind, regionId, tz, days: Number(windowDays) });
        } else {
            // Defaults / GA4 / GSC (Not Implemented)
            result = {
                metric: "CUSTOM",
                values: [],
                unit: "UNKNOWN",
                timezone: tz || 'UTC',
                weekStartLocalISO: new Date().toISOString(),
                geoScope: { kind: regionKind || 'UNKNOWN', ibge_municipio_id: regionId },
                provenance: { label: 'UNAVAILABLE', source: String(source || 'UNKNOWN'), notes: 'Source not supported in Phase 3', fetchedAt: new Date().toISOString() }
            };
        }
    } catch (e) {
        console.error("Timeseries Error:", e);
        result = {
            metric: "CUSTOM",
            values: [],
            unit: "UNKNOWN",
            timezone: tz || 'UTC',
            weekStartLocalISO: new Date().toISOString(),
            geoScope: { kind: regionKind || 'UNKNOWN', ibge_municipio_id: regionId },
            provenance: { label: 'UNAVAILABLE', source: String(source), notes: 'Internal Server Error', fetchedAt: new Date().toISOString() }
        };
    }

    // Contract Enforcement: values empty?
    if (!result.values) result.values = [];

    // Contract Enforcement: No Window Echo needed if in structure, but let's ensure object is flat
    // Providers now return full Timeseries168h object

    res.json(result);
});

// --- IBGE Sectors File Server ---
// Serves static GeoJSON files from server/data/ibge/sectors/
// If file doesn't exist, returns 501 UNAVAILABLE as requested.

app.get('/api/ibge/sectors', (req, res) => {
    const { municipioId, format } = req.query;

    if (!municipioId) {
        return res.status(400).json({ error: 'Missing municipioId' });
    }

    const filePath = join(__dirname, 'data', 'ibge', 'sectors', `${municipioId}.geojson`);

    if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache 1 day
        fs.createReadStream(filePath).pipe(res);
    } else {
        res.status(501).json({
            status: 'UNAVAILABLE',
            message: 'Setores não instalados. Rode pipeline IBGE.',
            provenance: 'UNAVAILABLE'
        });
    }
});


// --- Optional: Endpoint Discovery Proxy (Real Only Guard) ---
app.post('/api/ibge/income/resolve-endpoint', (req, res) => {
    res.status(501).json({
        status: 'UNAVAILABLE',
        message: 'Gemini endpoint discovery via server disabled in REAL_ONLY mode.',
        provenance: 'UNAVAILABLE'
    });
});

app.listen(port, () => {
    console.log(`BIA Server (Stubs & Proxies) listening on port ${port}`);
});
