# Supabase Migration Plan (Postgres + PostGIS + Edge Functions)

This repository includes progressive integration to Supabase. `services/hotspotsEngine.ts` prefers calling a Supabase Edge Function when `SUPABASE_EDGE_HOTSPOTS_URL` (or `VITE_SUPABASE_EDGE_HOTSPOTS_URL`) is configured.

Quick steps:

1. Create a Supabase project at https://app.supabase.com and enable the `postgis` extension.
2. Ingest IBGE sectors into a table `ibge_sectors` with a `geom` column (geometry/MultiPolygon, SRID=4326) and create a GIST index.

Example DDL:

```sql
CREATE TABLE ibge_sectors (
  id text PRIMARY KEY,
  population integer,
  income numeric,
  geom geometry(MultiPolygon,4326)
);
CREATE INDEX idx_ibge_sectors_geom ON ibge_sectors USING GIST(geom);
```

3. Implement an Edge Function `hotspots-search` that accepts POST `{ briefing, center, isRealOnly }` and executes spatial SQL (ST_DWithin) to return hotspots.

Edge Function skeleton (Node):

```js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { briefing, center } = req.body;
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

  const radiusMeters = 2000; // configurable
  const sql = `SELECT id, ST_AsGeoJSON(ST_Centroid(geom)) as centroid, population FROM ibge_sectors WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint(${center[1]}, ${center[0]}),4326)::geography, ${radiusMeters}) ORDER BY population DESC LIMIT 20`;
  const { data, error } = await supabase.rpc('sql', { q: sql });
  if (error) return res.status(500).json({ error: error.message });

  const hotspots = (data || []).map((r, idx) => ({
    id: idx + 1,
    lat: JSON.parse(r.centroid).coordinates[1],
    lng: JSON.parse(r.centroid).coordinates[0],
    rank: idx + 1,
    name: `Setor ${r.id}`,
    type: 'Demográfico',
    score: Math.min(100, Math.round((r.population || 0) / 1000)),
    provenance: { label: 'REAL', source: 'IBGE_POSTGIS', method: 'ST_DWithin' }
  }));

  return res.json(hotspots);
}
```

4. Configure the Edge Function URL in your environment as `SUPABASE_EDGE_HOTSPOTS_URL` (or `VITE_SUPABASE_EDGE_HOTSPOTS_URL` for dev).

5. The app will call the Edge Function first; if it fails, local fallbacks will be used so the UI never shows an empty state.

Next automation I can do for you:
- Generate the Edge Function stub at `functions/hotspots-search/` (ready to deploy).
- Create SQL migration files for `ibge_sectors`.
- Add example `scripts/` steps to push IBGE data into Supabase.
