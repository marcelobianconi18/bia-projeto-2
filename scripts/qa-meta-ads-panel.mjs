import { execSync } from 'child_process';
import { buildMetaAdsPanel } from '../services/metaAdsPanelServiceImpl.js';

const failures = [];

const run = (label, cmd) => {
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (err) {
    failures.push(`${label} failed`);
  }
};

const fetchJson = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const json = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, json };
  } catch (err) {
    return { ok: false, status: 0, json: null, error: String(err) };
  } finally {
    clearTimeout(timeout);
  }
};

const requireShape = (payload) => {
  const required = ['status', 'provenance', 'baseTargeting', 'tier', 'refinements', 'estimates', 'territory'];
  required.forEach((key) => {
    if (!(key in payload)) failures.push(`schema missing: ${key}`);
  });
};

const main = async () => {
  run('tsc', 'npx tsc --noEmit');
  run('build', 'npm run build');

  process.env.VITE_REAL_ONLY = 'true';

  const briefing = {
    productDescription: 'Produto teste',
    contactMethod: 'WhatsApp',
    usageDescription: 'Uso diario',
    operationalModel: 'Digital',
    dataSources: {
      ibge: { connected: true },
      osm: { connected: true },
      googleAds: { connected: false },
      metaAds: { connected: false },
      rfb: { connected: false }
    },
    marketPositioning: 'Premium',
    targetGender: 'Mixed',
    targetAge: ['25-34'],
    geography: {
      city: 'Sao Paulo',
      state: ['SP'],
      country: 'BR',
      level: 'City',
      selectedItems: []
    },
    objective: 'SellMore'
  };

  const panel = await buildMetaAdsPanel(briefing);
  if (panel.status !== 'UNAVAILABLE') failures.push('REAL_ONLY status mismatch');
  if (panel.refinements.length !== 0) failures.push('REAL_ONLY refinements not empty');
  if (panel.estimates?.provenance?.label !== 'UNAVAILABLE') failures.push('REAL_ONLY estimates provenance mismatch');
  requireShape(panel);

  const verify = await fetchJson('http://localhost:3001/api/connectors/meta-ads/verify');
  if (verify.status !== 501 && verify.status !== 200) failures.push('verify endpoint unexpected status');

  try {
    const out = execSync('rg -n "SIMULATED" dist || true', { encoding: 'utf8' });
    if (out.trim().length > 0) failures.push('SIMULATED string found in dist');
  } catch {
    failures.push('SIMULATED grep failed');
  }

  if (failures.length > 0) {
    console.error('FAIL');
    failures.forEach((f) => console.error(`- ${f}`));
    process.exit(1);
  }

  console.log('PASS');
};

main();
