import fs from 'fs/promises';
import path from 'path';

const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return null;
  return args[idx + 1] || null;
};

const source = getArg('source');
const municipioId = getArg('municipioId');
const outdir =
  getArg('outdir') ||
  path.join(process.cwd(), 'server', 'data', 'ibge', 'sectors');

if (!source || !municipioId) {
  console.error('Usage: node scripts/ibge-build-sectors.mjs --source <geojson> --municipioId <IBGE_ID> [--outdir <dir>]');
  process.exit(1);
}

const normalizeDigits = (value) => String(value ?? '').replace(/\D/g, '');

const municipioFromProps = (props) => {
  if (!props || typeof props !== 'object') return null;
  const candidates = [
    props.CD_MUN,
    props.CD_MUNICIP,
    props.CD_MUN_6,
    props.CD_MUN_7,
    props.CD_GEOCODI,
    props.CD_SETOR,
    props.CD_SETOR_C,
    props.CD_SETOR_7
  ];

  for (const value of candidates) {
    if (value === undefined || value === null) continue;
    const digits = normalizeDigits(value);
    if (digits.length >= 7) return digits.slice(0, 7);
  }
  return null;
};

const run = async () => {
  const raw = await fs.readFile(source, 'utf8');
  const data = JSON.parse(raw);

  if (!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
    throw new Error('Invalid GeoJSON: expected FeatureCollection with features array.');
  }

  const filtered = data.features.filter((feature) => {
    const props = feature?.properties || {};
    const munId = municipioFromProps(props);
    return munId === municipioId;
  });

  if (filtered.length === 0) {
    console.warn(`No features matched municipioId ${municipioId}.`);
  }

  const out = {
    type: 'FeatureCollection',
    features: filtered
  };

  await fs.mkdir(outdir, { recursive: true });
  const outfile = path.join(outdir, `${municipioId}.geojson`);
  await fs.writeFile(outfile, JSON.stringify(out));

  console.log(`IBGE sectors written to ${outfile} (${filtered.length} features).`);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
