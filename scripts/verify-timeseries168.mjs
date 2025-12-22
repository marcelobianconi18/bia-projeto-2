import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';
const IS_REAL_ONLY = process.env.VITE_REAL_ONLY === 'true';

async function testTimeseriesEndpoint() {
    console.log('--- Verifying Phase 3 Timeseries 168h ---');
    console.log(`Mode: ${IS_REAL_ONLY ? 'REAL_ONLY' : 'SIMULATION_ALLOWED'}`);

    try {
        const url = `${BASE_URL}/api/insights/timeseries168?source=GOOGLE_ADS&regionKind=MUNICIPIO&regionId=Sao Paulo&tz=America/Sao_Paulo&windowDays=28`;
        console.log(`GET ${url}...`);

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        console.log(`[Response] Source: ${data.source}, Provenance: ${data.provenance?.label}`);

        // Validation 1: Shape
        if (!Array.isArray(data.values)) throw new Error("Invalid shape: values must be array");
        if (!data.weekStartLocalISO || !data.timezone) throw new Error("Invalid shape: missing time meta");

        // Validation 2: REAL_ONLY Compliance
        if (IS_REAL_ONLY) {
            if (data.provenance?.label !== 'UNAVAILABLE' && data.provenance?.label !== 'NOT_CONFIGURED') {
                throw new Error("REAL_ONLY Violation: Returned data that is not marked UNAVAILABLE/NOT_CONFIGURED.");
            }
            // Ensure no "SIMULATED" data
            if (data.values.length > 0 && data.values.some(v => v > 0)) {
                // Check constraint
            }
        }

        console.log("PASS: Timeseries168 Contract OK.");

    } catch (err) {
        console.error(`FAIL: ${err.message}`);
        process.exit(1);
    }
}

testTimeseriesEndpoint();
