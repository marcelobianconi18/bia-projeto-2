
import fetch from 'node-fetch';

const ENDPOINT = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios";

async function run() {
    console.log("=== Verificando IBGE Localidades ===");
    try {
        const res = await fetch(ENDPOINT);
        console.log(`URL: ${ENDPOINT}`);
        console.log(`Status: ${res.status}`);

        if (!res.ok) {
            console.error("FAIL: API retornou erro.");
            process.exit(1);
        }

        const data = await res.json();
        if (!Array.isArray(data)) {
            console.error("FAIL: Resposta não é array.");
            process.exit(1);
        }

        console.log(`Contagem de municípios: ${data.length}`);
        const sp = data.find(c => c.nome === "São Paulo");
        const rj = data.find(c => c.nome === "Rio de Janeiro");

        if (sp && rj) {
            console.log("Exemplos encontrados: São Paulo, Rio de Janeiro");
            console.log("PASS: Localidades OK");
        } else {
            console.log("FAIL: Cidades principais não encontradas");
        }

    } catch (error) {
        console.error("FAIL: Erro de execução", error);
    }
}

run();
