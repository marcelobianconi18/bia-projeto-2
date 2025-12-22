const CITY_ID = "3550308"; // Sao Paulo

const ENDPOINTS = [
    {
        name: "PIB per capita (Table 5938, Var 597)",
        url: `https://servicodados.ibge.gov.br/api/v3/agregados/5938/periodos/-1/variaveis/597?localidades=N6[${CITY_ID}]`
    },
    {
        name: "Rendimento Médio (Table 5917, Var 593)",
        url: `https://servicodados.ibge.gov.br/api/v3/agregados/5917/periodos/-1/variaveis/593?localidades=N6[${CITY_ID}]`
    }
];

async function discover() {
    console.log("Testing endpoints...");
    for (const ep of ENDPOINTS) {
        try {
            const res = await fetch(ep.url);
            console.log(`[${ep.name}] Status: ${res.status}`);
            if (res.ok) {
                const txt = await res.text();
                console.log(`   Body: ${txt.substring(0, 200)}...`);
                try {
                    const data = JSON.parse(txt);
                    if (Array.isArray(data) && data[0]?.resultados) {
                        console.log("   ✅ Valid Structural JSON found!");
                    }
                } catch (e) { }
            }
        } catch (e) {
            console.log(`[${ep.name}] Error: ${e.message}`);
        }
    }
}

discover();
