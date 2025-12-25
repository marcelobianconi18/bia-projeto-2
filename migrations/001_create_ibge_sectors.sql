-- Migration: create ibge_sectors table and a helper stored procedure for hotspots

CREATE TABLE IF NOT EXISTS ibge_sectors (
  id TEXT PRIMARY KEY,
  population INTEGER,
  income NUMERIC,
  props JSONB,
  geom geometry(MultiPolygon,4326)
);

CREATE INDEX IF NOT EXISTS idx_ibge_sectors_geom ON ibge_sectors USING GIST(geom);

-- Optional: a convenience function to search hotspots by proximity (returns setof records)
CREATE OR REPLACE FUNCTION public.search_hotspots(
  center_lng double precision,
  center_lat double precision,
  radius_meters integer DEFAULT 2000,
  limit_rows integer DEFAULT 20
) RETURNS TABLE(id text, centroid_geojson text, population integer) AS $$
  SELECT id, ST_AsGeoJSON(ST_Centroid(geom)) AS centroid_geojson, population
  FROM ibge_sectors
  WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint(center_lng, center_lat),4326)::geography, radius_meters)
  ORDER BY population DESC
  LIMIT limit_rows;
$$ LANGUAGE SQL STABLE;

-- Grant execute to anon or to a restricted role as appropriate
-- GRANT EXECUTE ON FUNCTION public.search_hotspots(double precision, double precision, integer, integer) TO anon;
