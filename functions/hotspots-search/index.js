// Edge function stub for Supabase / PostGIS hotspots search
// Usage: deploy this to Supabase Edge Functions and set DATABASE_URL or SUPABASE vars

import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    const body = await req.json?.() || req.body;
    const { center = null, briefing = null, isRealOnly = false } = body || {};

    if (!center || !Array.isArray(center) || center.length < 2) {
      return new Response(JSON.stringify({ error: 'center required: [lng, lat]' }), { status: 400 });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;
    const DATABASE_URL = process.env.DATABASE_URL;

    // Prefer calling a stored procedure via Supabase RPC if SUPABASE credentials are available
    if (SUPABASE_URL && SUPABASE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false }
      });

      // If you created a Postgres function `search_hotspots(center_lng, center_lat, radius_meters)`
      // you can call it via RPC. Example below assumes such function exists.
      try {
        const radiusMeters = 2000;
        const { data, error } = await supabase.rpc('search_hotspots', {
          center_lng: center[0],
          center_lat: center[1],
          radius_meters: radiusMeters
        });
        if (error) throw error;
        return new Response(JSON.stringify({ hotspots: data || [] }), { status: 200 });
      } catch (err) {
        // fallback to raw SQL approach below if RPC not available
        console.warn('RPC search_hotspots failed:', err?.message || err);
      }
    }

    // If DATABASE_URL is available, attempt a direct Postgres query (Node "pg" may be required).
    if (DATABASE_URL) {
      try {
        // Use server-side DB access: dynamic import of 'pg' to avoid bundling issues.
        const { Client } = await import('pg');
        const client = new Client({ connectionString: DATABASE_URL });
        await client.connect();

        const radiusMeters = 2000;
        const sql = `
          SELECT id, ST_AsGeoJSON(ST_Centroid(geom)) AS centroid, population
          FROM ibge_sectors
          WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint($1, $2),4326)::geography, $3)
          ORDER BY population DESC
          LIMIT 20
        `;
        const vals = [center[0], center[1], radiusMeters];
        const result = await client.query(sql, vals);
        await client.end();

        const hotspots = (result.rows || []).map((r, idx) => ({
          id: r.id || `ibge-${idx}`,
          lat: JSON.parse(r.centroid).coordinates[1],
          lng: JSON.parse(r.centroid).coordinates[0],
          rank: idx + 1,
          name: `Setor ${r.id}`,
          type: 'Demográfico',
          score: Math.min(100, Math.round((r.population || 0) / 1000)),
          provenance: { label: 'REAL', source: 'IBGE_POSTGIS', method: 'ST_DWithin' }
        }));

        return new Response(JSON.stringify({ hotspots }), { status: 200 });
      } catch (err) {
        console.warn('Direct DATABASE_URL query failed:', err?.message || err);
      }
    }

    // Final fallback: return 501 with guidance
    return new Response(JSON.stringify({
      error: 'No backend configured for spatial queries. Set SUPABASE_URL+SUPABASE_KEY or DATABASE_URL.',
      hint: 'Create the table/migration and optionally the `search_hotspots` stored procedure. See /docs/supabase-migration.md'
    }), { status: 501 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message || String(err) }), { status: 500 });
  }
}
