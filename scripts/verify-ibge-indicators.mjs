
import fetch from 'node-fetch';

const CITIES = [
    { name: 'São Paulo', id: '3550308' },
    { name: 'Rio de Janeiro', id: '3304557' },
    { name: 'Teste (PR)', id: '4108304' }
];

// IBGE Registry (simplified from ibgeService.ts)
const POP_TABLE = "9514";
const POP_VAR = "93";
const INCOME_TABLE = "5917";
const INCOME_VAR = "593";

async function verifyCity(city) {
    console.log(`\n--- Verificando ${city.name} (${city.id}) ---`);

    // População (Censo 2022)
    const popUrl = `https://servicodados.ibge.gov.br/api/v3/agregados/${POP_TABLE}/periodos/2022/variaveis/${POP_VAR}?localidades=N6[${city.id}]`;
    try {
        const res = await fetch(popUrl);
        console.log(`[POP] URL: ${popUrl} | Status: ${res.status}`);
        if (res.ok) {
            const data = await res.json();
            const val = data?.[0]?.resultados?.[0]?.series?.[0]?.serie?.['2022'];
            console.log(`[POP] Valor 2022: ${val}`);
        } else {
            console.log(`[POP] Indisponível (500/404)`);
        }
    } catch (e) { console.error("[POP] Erro fetch", e.message); }

    // Renda (2010 ou fallback)
    const incUrl = `https://servicodados.ibge.gov.br/api/v3/agregados/${INCOME_TABLE}/periodos/2010/variaveis/${INCOME_VAR}?localidades=N6[${city.id}]`;
    try {
        const res = await fetch(incUrl);
        console.log(`[INC] URL: ${incUrl} | Status: ${res.status}`);
        if (res.ok) {
            const data = await res.json();
            const val = data?.[0]?.resultados?.[0]?.series?.[0]?.serie?.['2010'];
            console.log(`[INC] Valor 2010: ${val}`);
        } else {
            // Fallback attempt (latest period)
            console.log(`[INC] Falha endpoint específico. Tentando genérico...`);
            const fbUrl = `https://servicodados.ibge.gov.br/api/v3/agregados/${INCOME_TABLE}/variaveis/${INCOME_VAR}?localidades=N6[${city.id}]`;
            const fbRes = await fetch(fbUrl);
            console.log(`[INC-FB] URL: ${fbUrl} | Status: ${fbRes.status}`);
            if (fbRes.ok) {
                const data = await fbRes.json();
                // Try to grab any key from serie object
                const serie = data?.[0]?.resultados?.[0]?.series?.[0]?.serie || {};
                const keys = Object.keys(serie);
                const lastKey = keys[keys.length - 1];
                console.log(`[INC-FB] Valor (${lastKey}): ${serie[lastKey]}`);
            }
        }
    } catch (e) { console.error("[INC] Erro fetch", e.message); }
}

async function run() {
    for (const city of CITIES) {
        await verifyCity(city);
    }
}

run();
