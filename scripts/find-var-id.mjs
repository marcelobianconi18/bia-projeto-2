
const URL = "https://servicodados.ibge.gov.br/api/v3/agregados/5938/metadados";

async function find() {
    try {
        const res = await fetch(URL);
        const json = await res.json();
        console.log("Searching for 'per capita' in Table 5938 variables...");
        const matches = json.variaveis.filter(v =>
            v.nome.toLowerCase().includes("per capita") ||
            v.nome.toLowerCase().includes("capita")
        );
        matches.forEach(v => {
            console.log(`FOUND Candidate: ID=${v.id} | Name=${v.nome} | Unit=${v.unidade}`);
        });
    } catch (e) { console.log(e.message); }
}

find();
