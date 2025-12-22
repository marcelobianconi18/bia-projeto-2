
import { GoogleGenAI } from "@google/genai";
import { BriefingData, GeminiAnalysis } from "../types";
import { safeParseJson } from "./geminiParsing";

export const analyzeBriefing = async (data: BriefingData): Promise<GeminiAnalysis> => {
  try {
    // Fix: Moved GoogleGenAI initialization inside the function to use the current API key from process.env.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
      Você é a BIA (Bianconi Intelligence for Ads), especialista em Geomarketing e Copywriting Tático.

      ANALISE O BRIEFING ESTRATÉGICO:
      1. Nicho + Diferencial: ${data.productDescription}
      2. Funil de Contato: ${data.contactMethod}
      3. Transformação/Emoção Pós-Compra: ${data.usageDescription}

      CONTEXTO OPERACIONAL:
      Modelo: ${data.operationalModel}
      Público: ${data.targetGender}, idades ${data.targetAge.join(', ')}
      Posicionamento: ${data.marketPositioning}
      Local: ${data.geography.city}
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

    // Usando gemini-3-flash-preview para análise tática rápida e eficiente.
    // If an analysis endpoint is provided (optional proxy), prefer it to avoid exposing keys client-side
    const endpoint = (process.env.ANALYSIS_ENDPOINT as string) || (process.env.VITE_ANALYSIS_ENDPOINT as string) || undefined;
    if (endpoint) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ briefing: data })
        });
        const json = await res.json().catch(() => null);
        if (json && typeof json === 'object') {
          return json as GeminiAnalysis;
        }
      } catch (e) {
        console.warn('Analysis endpoint failed, falling back to local GenAI client', e);
      }
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = (response && (response as any).text) || '{}';
    const parsed = safeParseJson<GeminiAnalysis>(text);
    if (parsed.ok && parsed.value) return parsed.value as GeminiAnalysis;

    console.warn('Gemini returned non-JSON or malformed response, raw:', parsed.raw, parsed.error);
    return {
      verdict: "Erro na análise automatizada. Revisão humana recomendada.",
      action: "Revise o briefing e valide manualmente as zonas sugeridas.",
      score: 50
    };

  } catch (error) {
    console.error("Gemini analysis failed", error);
    return {
      verdict: "Erro na sincronização tática. Analise manual recomendada.",
      action: "Verifique o mapa para identificar zonas de calor demográfico.",
      score: 50
    };
  }
};
