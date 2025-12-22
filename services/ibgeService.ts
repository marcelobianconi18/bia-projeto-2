
import { IbgeSocioData, TacticalGeoJson, TacticalFeature, DataProvenance } from "../types";

const LOCALIDADES_API = "https://servicodados.ibge.gov.br/api/v1/localidades";
const SIDRA_API = "https://servicodados.ibge.gov.br/api/v3/agregados";

// Bounding Box aproximada do Território Brasileiro
const BR_BBOX = {
  minLat: -33.75,
  maxLat: 5.27,
  minLon: -73.98,
  maxLon: -28.84
};

export const isInsideBrazil = (lat: number, lng: number): boolean => {
  return lat >= BR_BBOX.minLat && lat <= BR_BBOX.maxLat &&
    lng >= BR_BBOX.minLon && lng <= BR_BBOX.maxLon;
};

export interface IbgeMetadata {
  tableId: string;
  variableId: string;
  sourceUrl: string;
  label: string;
}

export const IBGE_REGISTRY: Record<string, IbgeMetadata> = {
  // Tabela 9514: População Residente (Censo 2022)
  POPULACAO: { tableId: "9514", variableId: "93", label: "População Residente", sourceUrl: "https://sidra.ibge.gov.br/tabela/9514" },
  // Tabela 5917: Rendimento Médio (Referência baseada em PNAD ou Censo anterior se 2022 incompleto no SIDRA V3 API)
  RENDIMENTO: { tableId: "5917", variableId: "593", label: "Rendimento Médio Mensal", sourceUrl: "https://sidra.ibge.gov.br/tabela/5917" }
};

/**
 * Gera malha tática baseada na localização real.
 * Usa ibgeAnchor para calibrar a geração de dados "randômicos" para que reflitam a realidade da cidade.
 */
export const fetchTacticalMesh = async (
  center: [number, number],
  cityName: string = "Região",
  anchorData: IbgeSocioData | null = null
): Promise<TacticalGeoJson> => {
  const [lat, lng] = center;

  if (!isInsideBrazil(lat, lng)) {
    return { type: 'FeatureCollection', features: [] };
  }

  // REAL_ONLY GUARDRAIL
  const isRealOnly = import.meta.env.VITE_REAL_ONLY === 'true';
  if (isRealOnly) {
    console.warn("REAL_ONLY mode active: Skipping simulated tactical mesh generation.");
    return { type: 'FeatureCollection', features: [] };
  }

  const features: TacticalFeature[] = [];
  const gridSize = 10;
  const step = 0.0035;

  // Calibração baseada em dados reais
  const baseIncome = anchorData?.averageIncome || 2500;
  const basePopDensity = (anchorData?.population || 50000) / 1000; // Estimativa por grid

  const jitter = (val: number) => val + (Math.random() - 0.5) * step * 0.45;

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const x = lng + (i - gridSize / 2) * step;
      const y = lat + (j - gridSize / 2) * step;

      if (!isInsideBrazil(y, x)) continue;

      const p1 = [jitter(x), jitter(y)];
      const p2 = [jitter(x + step), jitter(y)];
      const p3 = [jitter(x + step), jitter(y + step)];
      const p4 = [jitter(x), jitter(y + step)];

      const polygon = [p1, p2, p3, p4, p1];

      // Volume/Score tático de 0 a 100
      const volume = Math.floor(Math.random() * 100);

      // Renda oscilando +/- 40% em torno da média real da cidade
      const income = baseIncome * (0.6 + Math.random() * 0.8);

      // População do setor oscilando em torno da densidade média
      const population = Math.floor(basePopDensity * (0.5 + Math.random()));

      const geocode = `355${Math.floor(Math.random() * 900000) + 100000}`;

      const provenance: DataProvenance = {
        label: 'SIMULATED',
        source: 'Modelagem local',
        method: 'grid/jitter',
        notes: 'Camada gerada localmente para análise tática; não representa dado oficial por setor.'
      };

      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [polygon]
        },
        properties: {
          id: i * gridSize + j,
          geocode: geocode,
          income: income,
          population: population,
          volume: volume,
          density: volume / 100,
          name: `${cityName} - Setor ${geocode.substring(4)}`
          , provenance
        }
      });
    }
  }

  return { type: 'FeatureCollection', features };
};

export const fetchRealIbgeData = async (geocode: string): Promise<IbgeSocioData | null> => {
  // 1. Definição de URLs e Metadados
  const popMeta = IBGE_REGISTRY.POPULACAO;
  const incMeta = IBGE_REGISTRY.RENDIMENTO;

  const popUrl = `${SIDRA_API}/${popMeta.tableId}/periodos/2022/variaveis/${popMeta.variableId}?localidades=N6[${geocode}]`;
  // Tenta 2010 primeiro, depois genérico para renda
  const incUrlPrimary = `${SIDRA_API}/${incMeta.tableId}/periodos/2010/variaveis/${incMeta.variableId}?localidades=N6[${geocode}]`;
  const incUrlFallback = `${SIDRA_API}/${incMeta.tableId}/variaveis/${incMeta.variableId}?localidades=N6[${geocode}]`;

  // 2. Helper de Fetch Seguro
  const fetchMetric = async (url: string, fallbackUrl?: string): Promise<{ val: number; period: string; ok: boolean }> => {
    try {
      let res = await fetch(url);
      if (!res.ok && fallbackUrl) {
        // Tenta fallback se primário falhar (ex: 500 ou 404)
        res = await fetch(fallbackUrl);
      }
      if (!res.ok) return { val: 0, period: "N/A", ok: false };

      const data = await res.json();
      // SIDRA array structure: [ { resultados: [ { series: [ { serie: { "2010": "123" } } ] } ] } ]
      const serieObj = data?.[0]?.resultados?.[0]?.series?.[0]?.serie || {};
      const periods = Object.keys(serieObj);
      if (periods.length === 0) return { val: 0, period: "N/A", ok: false };

      const lastPeriod = periods[periods.length - 1]; // Pega o último disponível se houver múltiplos
      const valStr = serieObj[lastPeriod];
      const val = parseFloat(valStr === "..." || valStr === "-" ? "0" : valStr);

      return { val, period: lastPeriod, ok: true };
    } catch (e) {
      return { val: 0, period: "Error", ok: false };
    }
  };

  // 3. Execução Paralela Robusta
  const [popResult, incResult] = await Promise.all([
    fetchMetric(popUrl),
    fetchMetric(incUrlPrimary, incUrlFallback)
  ]);

  // 4. Montagem do Resultado com Proveniência Granular
  // Se ambos falharam, retornamos null para sinalizar falha total de conexão com IBGE? 
  // Não, retornamos objeto parcial para que a UI mostre o que funcionou.
  // O null só deve ser retornado se o geocode for inválido ou erro catastrófico.

  const isPopOk = popResult.ok && popResult.val > 0;
  const isIncOk = incResult.ok && incResult.val > 0;

  const provenance: DataProvenance = {
    label: (isPopOk || isIncOk) ? 'REAL' : 'REAL', // Mantém label REAL pois a tentativa foi real
    source: 'IBGE/SIDRA',
    updatedAt: new Date().toISOString(),
    notes: [] as any
  };

  const notes = [];
  if (!isPopOk) notes.push(`População indisponível (SIDRA ${popMeta.tableId})`);
  if (!isIncOk) notes.push(`Renda indisponível (SIDRA ${incMeta.tableId})`);

  if (notes.length > 0) {
    provenance.notes = notes.join('; ');
  }

  return {
    population: popResult.val,
    averageIncome: incResult.val,
    pib: 0, // Não estamos buscando PIB ainda
    lastUpdate: `Censo ${popResult.period} / Renda ${incResult.period}`,
    geocode,
    provenance
  };
};

export const fetchIbgeGeocode = async (municipalityName: string, stateUF: string): Promise<string | null> => {
  try {
    const url = `${LOCALIDADES_API}/municipios`;
    const response = await fetch(url);
    const cities = await response.json();
    const clean = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Normalização rigorosa para evitar erros de acentuação (ex: Foz do Iguaçu vs Foz do Iguacu)
    const target = cities.find((c: any) =>
      clean(c.nome) === clean(municipalityName) &&
      (clean(c.microrregiao.mesorregiao.UF.sigla) === clean(stateUF) || clean(c.microrregiao.mesorregiao.UF.nome) === clean(stateUF))
    );
    return target ? target.id : null;
  } catch (error) { return null; }
};
