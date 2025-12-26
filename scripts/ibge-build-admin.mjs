import fs from 'fs/promises';
import path from 'path';

const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return null;
  return args[idx + 1] || null;
};

const source = getArg('source');
const level = getArg('level');
const outdir =
  getArg('outdir') ||
  path.join(process.cwd(), 'server', 'data', 'ibge', 'admin');

if (!source || !level) {
  console.error('Usage: node scripts/ibge-build-admin.mjs --source <geojson> --level state|municipio [--outdir <dir>]');
  process.exit(1);
}

const levelKey = level === 'state' ? 'state' : level === 'municipio' ? 'municipio' : null;
if (!levelKey) {
  console.error('Invalid level. Use "state" or "municipio".');
  process.exit(1);
}

const run = async () => {
  const raw = await fs.readFile(source, 'utf8');
  const data = JSON.parse(raw);

  if (!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
    throw new Error('Invalid GeoJSON: expected FeatureCollection with features array.');
  }

  await fs.mkdir(outdir, { recursive: true });
  const outfile = path.join(outdir, `${levelKey}.geojson`);
  await fs.writeFile(outfile, JSON.stringify(data));

  console.log(`IBGE admin (${levelKey}) written to ${outfile} (${data.features.length} features).`);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
