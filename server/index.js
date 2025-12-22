import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// In-memory rate limiting (simple implementation)
const ipRequestCounts = new Map();
const RESET_INTERVAL = 60 * 1000; // 1 minute
const MAX_REQUESTS = 60; // 60 requests per minute

setInterval(() => {
    ipRequestCounts.clear();
}, RESET_INTERVAL);

const checkRateLimit = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const current = ipRequestCounts.get(ip) || 0;
    if (current >= MAX_REQUESTS) {
        return res.status(429).json({ error: 'Too many requests' });
    }
    ipRequestCounts.set(ip, current + 1);
    next();
};

app.post('/api/analyze', checkRateLimit, async (req, res) => {
    try {
        const { briefing } = req.body;
        if (!briefing) {
            return res.status(400).json({ error: 'Briefing data required' });
        }

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            console.error('GOOGLE_API_KEY not set on server');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const ai = new GoogleGenAI({ apiKey });

        // Construct prompt (same as client logic)
        const prompt = `
      Você é a BIA (Bianconi Intelligence for Ads), especialista em Geomarketing e Copywriting Tático.
      ANALISE O BRIEFING ESTRATÉGICO:
      1. Nicho + Diferencial: ${briefing.productDescription}
      2. Funil de Contato: ${briefing.contactMethod}
      3. Transformação/Emoção Pós-Compra: ${briefing.usageDescription}
      
      CONTEXTO OPERACIONAL:
      Modelo: ${briefing.operationalModel}
      Público: ${briefing.targetGender}, idades ${briefing.targetAge?.join(', ')}
      Posicionamento: ${briefing.marketPositioning}
      Local: ${briefing.geography?.city}
      Objetivo: ${briefing.objective}
      
      SUA MISSÃO:
      Baseado no Nicho, Funil e Transformação informados, gere um 'Veredito Tático' e um JSON de saída.
      
      SAÍDA (JSON estrito, SEM MARKDOWN):
      Campos obrigatórios: "verdict" (string), "action" (string), "score" (0-100 number).
      Campos opcionais: "confidence" (0-100), "reasons" (string[] - top 3), "risks" (string[] - top 2), "limitations" (string[]).
      
      Observação: envie apenas o JSON.
    `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp', // Or keep consistent with client 'gemini-3-flash-preview' if preferred
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        const text = response?.text();
        // Simple parsing since we expect JSON
        let json = {};
        try {
            json = JSON.parse(text);
        } catch (e) {
            // Fallback or cleanup markdown marks if any
            const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
            json = JSON.parse(cleaned);
        }

        res.json(json);

    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({ error: 'Analysis failed' });
    }
});

app.listen(port, () => {
    console.log(`BIA Secure Proxy running on port ${port}`);
});
