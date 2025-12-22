
const URL = "https://servicodados.ibge.gov.br/api/v3/agregados/5938/metadados";

async function meta() {
    try {
        const res = await fetch(URL);
        if (!res.ok) { console.log(`Error: ${res.status}`); return; }
        const json = await res.json();
        console.log("Variables for Table 5938:");
        if (json.variaveis) {
            json.variaveis.forEach(v => {
                console.log(` - ID: ${v.id} | Name: ${v.nome} | Unit: ${v.unidade}`);
            });
        }
    } catch (e) { console.log(e.message); }
}

meta();
