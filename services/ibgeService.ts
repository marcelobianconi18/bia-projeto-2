
import { IbgeSocioData, TacticalGeoJson, TacticalFeature, DataProvenance } from "../types";
import { resolveIbgeIncomeMunicipio } from './ibgeIncomeResolver';

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
  if (IS_REAL_ONLY) {
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
        // Fallback only if NOT RealOnly, otherwise Unavailable
        label: IS_REAL_ONLY ? 'UNAVAILABLE' : 'DERIVED',
        source: 'IBGE_ESTIMATE',
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

// Helper de Fetch Seguro (movido para fora para ser reutilizado)
const fetchMetric = async (url: string, metricName: string): Promise<{ val: number | null; ok: boolean }> => {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Failed to fetch ${metricName} from ${url}. Status: ${res.status}`);
      return { val: null, ok: false };
    }

    const data = await res.json();
    const serieObj = data?.[0]?.resultados?.[0]?.series?.[0]?.serie || {};
    const periods = Object.keys(serieObj);
    if (periods.length === 0) {
      console.warn(`No data periods found for ${metricName} from ${url}.`);
      return { val: null, ok: false };
    }

    const lastPeriod = periods[periods.length - 1];
    const valStr = serieObj[lastPeriod];
    const val = parseFloat(valStr === "..." || valStr === "-" ? "0" : valStr);

    return { val: val > 0 ? val : null, ok: true };
  } catch (e) {
    console.error(`Error fetching ${metricName} from ${url}:`, e);
    return { val: null, ok: false };
  }
};
import { isRealOnly } from "./env";

// Robust IS_REAL_ONLY check done via centralized service
export const IS_REAL_ONLY = isRealOnly();

export async function fetchRealIbgeData(geocode: string): Promise<IbgeSocioData | null> {
  // The IS_REAL_ONLY constant is now globally available.
  // The local 'isRealOnly' variable was not used after its declaration in this function,
  // so it has been removed as part of the refactor to use the global constant.

  // Paralelizar chamadas para performance
  // 1. População (Endpoint confiável: Agregado 9514 / Var 93 / Censo 2022)
  const popUrl = `https://servicodados.ibge.gov.br/api/v3/agregados/9514/periodos/2022/variaveis/93?localidades=N6[${geocode}]`;

  const popPromise = fetchMetric(popUrl, "População 2022").then(res => ({
    val: res.val,
    url: popUrl,
    provenance: res.val !== null ? 'REAL' : 'UNAVAILABLE'
  }));

  // 2. Renda (Resolver complexo com fallback REAL_ONLY seguro)
  const incomePromise = resolveIbgeIncomeMunicipio(geocode);

  const [popRes, incomeRes] = await Promise.all([popPromise, incomePromise]);

  return {
    population: popRes.val !== null ? popRes.val : 0,
    pib: 0, // Não estamos focando em PIB agora
    averageIncome: incomeRes.status === 'REAL' ? incomeRes.income! : 0,
    lastUpdate: new Date().toISOString(),
    geocode,
    provenance: {
      label: (popRes.provenance === 'REAL' && incomeRes.status === 'REAL') ? 'REAL' : 'PARTIAL_REAL',
      source: `IBGE (Pop: ${popRes.url}, Inc: ${incomeRes.status === 'REAL' ? incomeRes.meta.sourceUrl : 'UNAVAILABLE'})`,
      notes: incomeRes.status === 'UNAVAILABLE' ? 'Renda indisponível no IBGE.' : undefined
    },
    // Adding extended metadata for UI to consume if needed
    populationYear: 2022,
    income: incomeRes.status === 'REAL' ? incomeRes.income : null // Explicito null para UI
  };
}

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
