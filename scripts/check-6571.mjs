
const URL = "https://servicodados.ibge.gov.br/api/v3/agregados/6571/variaveis";

async function check() {
    try {
        const res = await fetch(URL);
        if (res.ok) {
            console.log("6571 Metadata OK");
            const json = await res.json();
            console.log(JSON.stringify(json).substring(0, 200));
        } else {
            console.log("6571 Metadata Fail: " + res.status);
        }
    } catch (e) { console.log(e.message); }
}

check();
