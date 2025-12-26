export async function fetchIbgeAdmin(level: 'state' | 'municipio'): Promise<any | null> {
  try {
    const response = await fetch(`http://localhost:3001/api/ibge/admin?level=${level}`);

    if (!response.ok) {
      console.warn(`[IBGE Admin] Unavailable for ${level}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!data || data.type !== 'FeatureCollection') {
      throw new Error("Invalid GeoJSON format");
    }

    return data;
  } catch (e) {
    console.error("[IBGE Admin] Fetch failed:", e);
    return null;
  }
}
