# hotspots-search Edge Function

This folder contains an example stub `index.js` that can run under Node for local testing and demonstrates approaches for Supabase Edge (RPC or direct DB).

Deployment notes:

- Supabase Edge Functions typically run on Deno; adapt the code to Deno-compatible imports (use native `fetch`, do not rely on Node's `pg` without bundling). The provided `index.js` is Node-friendly for quick local tests.

Testing locally (Node):

```bash
# from project root
node functions/hotspots-search/index.js
# or run a tiny HTTP wrapper for local testing (not provided) like using 'serve' or express
```

Deploying to Supabase Edge:

1. Install `supabase` CLI and login: `npm i -g supabase && supabase login`
2. Inside this folder, create a `supabase` function according to their docs, or adapt the code to Deno.
3. Set `SUPABASE_URL` and `SUPABASE_KEY` (or use `DATABASE_URL`) in the function's environment.

RPC approach (recommended):
- Create the `search_hotspots` SQL function in your database (see `migrations/001_create_ibge_sectors.sql`).
- Call it via `supabase.rpc('search_hotspots', { center_lng, center_lat, radius_meters })` from the Edge function.

Direct DB approach:
- Use `DATABASE_URL` and a Postgres client. For Deno, use a Deno Postgres client library.

See `../docs/supabase-migration.md` for full migration instructions.
