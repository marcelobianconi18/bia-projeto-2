
async function runTest() {
    console.log("---------------------------------------------------");
    console.log("🛠️  VERIFYING IBGE SECTORS (LOCAL SERVER)");
    console.log("---------------------------------------------------");

    const municipioId = '3550308'; // São Paulo
    const url = `http://localhost:3001/api/ibge/sectors?municipioId=${municipioId}`;

    try {
        console.log(`   GET ${url}`);
        const res = await fetch(url);

        console.log(`   STATUS: ${res.status}`);

        if (res.status === 200) {
            const data = await res.json();
            console.log(`   ✅ SUCCESS: GeoJSON Found`);
            console.log(`      Type: ${data.type}`);
            console.log(`      Features: ${data.features?.length ?? 0}`);
        } else if (res.status === 501) {
            const err = await res.json();
            console.log(`   ✅ EXPECTED 501 (UNAVAILABLE)`);
            console.log(`      Message: ${err.message}`);
            console.log(`      Provenance: ${err.provenance}`);
        } else {
            console.log(`   ❓ UNEXPECTED STATUS`);
        }

    } catch (e) {
        console.error(`   ❌ EXCEPTION: Is server running? ${e.message}`);
    }
}

runTest();
