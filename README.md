<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/18QTLRW9tryFmiwgDOudvEpezwlzv97BW

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the Gemini key in [.env.local](.env.local):
   - `VITE_GEMINI_API_KEY=...` (dev, browser)
   - or `VITE_ANALYSIS_ENDPOINT=http://localhost:3001/api/analysis` (recommended)
3. If using the proxy endpoint, configure and run the server:
   - `GEMINI_API_KEY=...` in `server/.env`
   - `npm --prefix server install && npm --prefix server run start`
4. Run the app:
   `npm run dev`

Optional: for production or to avoid exposing API keys in the browser, set an analysis proxy endpoint by adding `ANALYSIS_ENDPOINT` to your environment and configure it to accept a POST `{ briefing }` and return the same JSON shape the app expects. If provided, the app will prefer this endpoint over calling Gemini directly.
