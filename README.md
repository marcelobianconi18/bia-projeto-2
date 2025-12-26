<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/18QTLRW9tryFmiwgDOudvEpezwlzv97BW

Para tiles locais, veja `docs/tileserver-setup.md`.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the Gemini key in [.env.local](.env.local):
   - `VITE_GEMINI_API_KEY=...` (dev, browser)
   - or `VITE_ANALYSIS_ENDPOINT=http://localhost:3001/api/analysis` (recommended)
   - Set `VITE_REAL_ONLY=false` to allow real connector calls (Meta/Google).
3. If using the proxy endpoint, configure and run the server:
   - `GEMINI_API_KEY=...` in `server/.env`
   - For real data connectors, set `GOOGLE_API_KEY`, `META_TOKEN` (or `META_ACCESS_TOKEN`), and `META_ADS_ACCOUNT_ID` in `server/.env`
   - `npm --prefix server install && npm --prefix server run start`
4. Run the app:
   `npm run dev`

## IBGE Setores (Mapa por Quadras)

Para exibir o mapa por setores censitarios (quadras), gere um GeoJSON por municipio e coloque em `server/data/ibge/sectors/`.

1. Converta o arquivo oficial de setores do IBGE para GeoJSON (FeatureCollection).
2. Gere o arquivo do municipio:
   `npm run ibge:sectors -- --source /caminho/para/setores.geojson --municipioId 3550308`
3. Reinicie o servidor (`npm run dev:server`) e a camada IBGE aparecera no mapa.

Observacao: o script detecta o municipio por campos comuns (ex.: `CD_SETOR`, `CD_GEOCODI`, `CD_MUN`).

## IBGE Admin (Estados e Municipios)

Para exibir camadas administrativas por nivel de zoom:

1. Gere o GeoJSON de Estados:
   `npm run ibge:admin -- --source /caminho/para/estados.geojson --level state`
2. Gere o GeoJSON de Municipios:
   `npm run ibge:admin -- --source /caminho/para/municipios.geojson --level municipio`
3. Reinicie o servidor (`npm run dev:server`).

Os arquivos sao salvos em `server/data/ibge/admin/` como `state.geojson` e `municipio.geojson`.

Optional: for production or to avoid exposing API keys in the browser, set an analysis proxy endpoint by adding `ANALYSIS_ENDPOINT` to your environment and configure it to accept a POST `{ briefing }` and return the same JSON shape the app expects. If provided, the app will prefer this endpoint over calling Gemini directly.
