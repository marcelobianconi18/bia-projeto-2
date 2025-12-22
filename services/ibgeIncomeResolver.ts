
export type IncomeResolveResult =
    | { status: 'REAL'; income: number; meta: { sourceUrl: string; table: string; variable: string; period?: string; fetchedAt: string; evidenceUrls?: string[] } }
    | { status: 'UNAVAILABLE'; income: null; reason: string; attempts: Array<{ url: string; status?: number; error?: string }> };

const VALID_DOMAINS = ['servicodados.ibge.gov.br', 'sidra.ibge.gov.br', 'biblioteca.ibge.gov.br'];

/**
 * Validates if a URL belongs to an allowed official domain.
 */
function isOfficialDomain(url: string): boolean {
    try {
        const parsed = new URL(url);
        return VALID_DOMAINS.some(d => parsed.hostname.endsWith(d));
    } catch {
        return false;
    }
}

/**
 * Attempts to fetch income data from a specific endpoint.
 */
async function tryFetchEndpoint(url: string, tableId: string, variableId: string): Promise<number | null> {
    if (!isOfficialDomain(url)) {
        console.warn(`[IncomeResolver] Blocked non-official domain: ${url}`);
        return null;
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!res.ok) return null;

        const data = await res.json();

        // Validate schema: expected array
        if (!Array.isArray(data) || data.length === 0) return null;

        // Structure usually: [{ "resultados": [{ "series": [{ "serie": { "2010": "1234.56" } }] }] }]
        // Adjusted for typical SIDRA/API structure
        // Example: /agregados/5917/periodos/2010/variaveis/593?localidades=N6[ID]
        // Returns: [{..., "resultados": [{"series": [{"serie": {"2010": "1234"}}]}]}]

        // Deep access safety
        const serie = data[0]?.resultados?.[0]?.series?.[0]?.serie;
        if (!serie) return null;

        // Get the first value (usually only one period requested)
        const valStr = Object.values(serie)[0] as string;

        // Parse
        const val = parseFloat(valStr);
        if (!Number.isFinite(val) || val <= 0) return null;

        return val;
    } catch (error) {
        return null;
    }
}

/**
 * Main resolver function.
 */
export async function resolveIbgeIncomeMunicipio(municipioId: string): Promise<IncomeResolveResult> {
    const attempts: Array<{ url: string; status?: number; error?: string }> = [];
    const fetchedAt = new Date().toISOString();

    // 1. Hardcoded Official Candidates (Priority)
    // Table 5917: Rendimento mensal... (Censo 2010) - Variable 593 (Rendimento médio)
    // Table 3261: Domicílios... (Censo 2010) - might have income classes, but let's stick to simple aggregates first.

    // NOTE: User reported 5917/593 is returning 500. We keep it as first candidate just in case it works.
    const candidates = [
        {
            table: '5917',
            variable: '593',
            period: '2010',
            url: `https://servicodados.ibge.gov.br/api/v3/agregados/5917/periodos/2010/variaveis/593?localidades=N6[${municipioId}]`
        },
        // Fallback? Try generic latest period if supported (rare for Censo data which is specific)
        {
            table: 'Generic',
            variable: 'Income',
            period: 'latest',
            // Placeholder for a different hypothetical table if discovered. 
            // For now, we only have one strong candidate.
            url: `https://servicodados.ibge.gov.br/api/v3/agregados/5917/periodos/-1/variaveis/593?localidades=N6[${municipioId}]`
        }
    ];

    for (const cand of candidates) {
        attempts.push({ url: cand.url });
        const val = await tryFetchEndpoint(cand.url, cand.table, cand.variable);

        if (val !== null) {
            return {
                status: 'REAL',
                income: val,
                meta: {
                    sourceUrl: cand.url,
                    table: cand.table,
                    variable: cand.variable,
                    period: cand.period,
                    fetchedAt
                }
            };
        }
    }

    // 2. Server Proxy Discovery (Optional/Future)
    // If we had a server running at /api/ibge/income/resolve-endpoint, we would call it here.
    // For now, we strictly fail if standard endpoints fail.

    return {
        status: 'UNAVAILABLE',
        income: null,
        reason: 'All official endpoints returned error or invalid data',
        attempts
    };
}
