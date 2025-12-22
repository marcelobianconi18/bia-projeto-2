
const URL = "https://servicodados.ibge.gov.br/api/v3/agregados/5938/variaveis";

async function vars() {
    try {
        const res = await fetch(URL);
        const json = await res.json();
        json.forEach(v => {
            console.log(`${v.id}: ${v.nome} (${v.unidade})`);
        });
    } catch (e) { console.log(e.message); }
}

vars();
