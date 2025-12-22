
// Standalone verification script for IBGE Income Endpoints
// Does NOT import TS files to avoid runtime issues. Replicates priority logic.

const CITIES = [
    { name: "São Paulo", id: "3550308" },
    { name: "Rio de Janeiro", id: "3304557" },
    { name: "Curitiba", id: "4106902" }
];

const CANDIDATES = [
    {
        desc: "Primary: Censo 2010 (Table 5917/Var 593)",
        urlTemplate: (id) => `https://servicodados.ibge.gov.br/api/v3/agregados/5917/periodos/2010/variaveis/593?localidades=N6[${id}]`
    },
    {
        desc: "Fallback: Generic Latest (Table 5917/Var 593/-1)",
        urlTemplate: (id) => `https://servicodados.ibge.gov.br/api/v3/agregados/5917/periodos/-1/variaveis/593?localidades=N6[${id}]`
    }
];

async function verify() {
    console.log("=== IBGE Income Endpoint Verification ===");
    console.log(`Time: ${new Date().toISOString()}\n`);

    for (const city of CITIES) {
        console.log(`Checking city: ${city.name} (${city.id})`);

        for (const cand of CANDIDATES) {
            const url = cand.urlTemplate(city.id);
            try {
                const start = performance.now();
                const res = await fetch(url);
                const ms = (performance.now() - start).toFixed(0);

                console.log(`  [${cand.desc}]`);
                console.log(`    URL: ${url}`);
                console.log(`    Status: ${res.status} (${res.statusText}) | Time: ${ms}ms`);

                if (res.ok) {
                    const text = await res.text();
                    console.log(`    Body Preview: ${text.substring(0, 100)}...`);
                    try {
                        const json = JSON.parse(text);
                        if (Array.isArray(json) && json.length > 0) {
                            const val = json[0]?.resultados?.[0]?.series?.[0]?.serie;
                            // Check if value exists (it might be empty object or have keys)
                            if (val && Object.keys(val).length > 0) {
                                console.log(`    ✅ Extraction Success: Found data for keys [${Object.keys(val).join(', ')}]`);
                            } else {
                                console.log(`    ⚠️ Extraction Warning: JSON structure ok, but 'serie' is empty?`);
                            }
                        } else {
                            console.log(`    ❌ Extraction Fail: Not an array or empty.`);
                        }
                    } catch (e) {
                        console.log(`    JSON Parse Error: ${e.message}`);
                    }
                } else {
                    console.log(`    ❌ FAIL: Endpoint returned error.`);
                }
            } catch (e) {
                console.log(`    FATAL: Fetch error - ${e.message}`);
            }
            console.log("");
        }
    }
}

verify();
