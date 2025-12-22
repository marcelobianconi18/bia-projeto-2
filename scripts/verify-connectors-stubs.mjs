
import fs from 'fs';
import path from 'path';

console.log("--- Verifying Phase 2 Connector Stubs ---");

// Helper to assert response
async function assertStub(name, url, payload) {
    console.log(`[${name}] POST ${url}...`);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log(`[${name}] Status: ${res.status}`);

        // Check 1: Status Code 501
        if (res.status !== 501) {
            console.error(`FAIL: Expected 501 Not Configured, got ${res.status}`);
            return false;
        }

        const json = await res.json();
        console.log(`[${name}] Response:`, JSON.stringify(json));

        console.log(`PASS: ${name} Contract OK.`);
        return true;

    } catch (e) {
        console.error(`FAIL: Network Error - ${e.message}`);
        return false;
    }
}

// Ensure server is running (assumed running by user or concurrent script, but strict QA usually starts it. 
// For now we assume local dev server is accessible as per instruction "Server responde 501 estável". 
// Since this is a QA script, we might need to wrap it with start-server-and-test or similar? 
// For this environment, we'll try fetch. If failed, we warn user.)

const BASE = 'http://localhost:3001';

// 1. Google Ads
const gAds = await assertStub("GoogleAds", `${BASE}/api/connectors/google-ads/verify`, { customerId: '123' });

// 2. Meta Ads
const mAds = await assertStub("MetaAds", `${BASE}/api/connectors/meta-ads/verify`, { adAccountId: 'act_123' });

// 3. RFB
const rfb = await assertStub("RFB", `${BASE}/api/connectors/rfb/verify`, { cnpj: '000' });

if (gAds && mAds && rfb) {
    console.log("\n✅ ALL STUBS PASSED.");
    const reportDir = path.join(process.cwd(), 'reports', 'qa');
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(path.join(reportDir, 'connectors_stubs.json'), JSON.stringify({ status: 'PASS', date: new Date().toISOString() }));
    process.exit(0);
} else {
    console.error("\n❌ STUB VERIFICATION FAILED.");
    process.exit(1);
}
