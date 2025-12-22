
import { geocodeCity } from '../services/connectors/osmGeocode';

// Reusing logic from previous implementation
async function runTest() {
    console.log("---------------------------------------------------");
    console.log("🛠️  VERIFYING OSM GEOCODE CONNECTOR (NOMINATIM)");
    console.log("---------------------------------------------------");

    const citiesToTest = [
        "São Paulo, SP",
        "Rio de Janeiro, RJ",
        "Curitiba, PR",
        "Gramado, RS",
        "NonExistentCityXYZ, AC"
    ];

    for (const city of citiesToTest) {
        console.log(`\n📍 Testing City: ${city}`);
        try {
            const q = encodeURIComponent(city + ", Brazil");
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${q}&addressdetails=1&limit=1`;

            console.log(`   GET ${url}`);
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'BiaGeomarketing/1.0'
                }
            });

            if (!res.ok) {
                console.error(`   ❌ API Error: ${res.status} ${res.statusText}`);
                continue;
            }

            const data = await res.json();

            if (Array.isArray(data) && data.length > 0) {
                const place = data[0];
                console.log(`   ✅ SUCCESS`);
                console.log(`      Display Name: ${place.display_name}`);
                console.log(`      Lat/Lng: ${place.lat}, ${place.lon}`);
                console.log(`      Type: ${place.type}`);
                console.log(`      Bounding Box: [${place.boundingbox.join(', ')}]`);
            } else {
                if (city.includes("NonExistent")) {
                    console.log(`   ✅ CORRECTLY NOT FOUND`);
                } else {
                    console.log(`   ⚠️  NOT FOUND (Unexpected)`);
                }
            }

        } catch (e) {
            console.error(`   ❌ EXCEPTION: ${e.message}`);
        }
    }
}

runTest();
