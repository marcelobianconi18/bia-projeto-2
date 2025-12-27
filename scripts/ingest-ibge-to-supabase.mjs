#!/usr/bin/env node
/*
  Script: ingest-ibge-to-supabase.mjs
  Usage:
    DATABASE_URL=postgres://... node scripts/ingest-ibge-to-supabase.mjs path/to/ibge_sectors.geojson

  The script parses GeoJSON features and inserts them into `ibge_sectors` using
  ST_SetSRID(ST_GeomFromGeoJSON($1),4326).
*/
import fs from 'fs/promises';
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../server/.env') });

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: DATABASE_URL=postgres://... node scripts/ingest-ibge-to-supabase.mjs path/to/ibge.geojson');
    process.exit(2);
  }
  const geojsonPath = args[0];
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('Please set DATABASE_URL env pointing to your Supabase Postgres connection string.');
    process.exit(2);
  }

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const content = await fs.readFile(geojsonPath, 'utf8');
  const doc = JSON.parse(content);
  if (!doc.features || !Array.isArray(doc.features)) {
    console.error('GeoJSON missing features array');
    process.exit(2);
  }

  console.log(`Ingesting ${doc.features.length} features from ${geojsonPath}`);
  let inserted = 0;
  for (const f of doc.features) {
    const id = f.properties?.id || f.properties?.codigo || f.properties?.CD_SETOR || f.id || null;
    const population = f.properties?.population || f.properties?.pop || f.properties?.v0001 || null;
    const income = f.properties?.income || f.properties?.renda || f.properties?.v0005 || null;
    const props = JSON.stringify(f.properties || {});
    const geom = JSON.stringify(f.geometry);
    if (!id) continue;

    const sql = `
      INSERT INTO ibge_sectors (id, population, income, props, geom)
      VALUES ($1, $2, $3, $4, ST_SetSRID(ST_GeomFromGeoJSON($5),4326))
      ON CONFLICT (id) DO UPDATE
      SET population = EXCLUDED.population,
          income = EXCLUDED.income,
          props = EXCLUDED.props,
          geom = EXCLUDED.geom;
    `;
    try {
      await client.query(sql, [String(id), population, income, props, geom]);
      inserted++;
    } catch (err) {
      console.warn('Insert failed for', id, err?.message || err);
    }
  }

  console.log(`Inserted/updated ${inserted} features`);
  await client.end();
}

main().catch(err => { console.error(err); process.exit(1); });
