
import { ConnectorResult } from "../../types";
import { fetchRealIbgeData, fetchIbgeGeocode } from "../ibgeService";

export interface IbgeScanData {
    population: number;
    income: number | null;
    populationYear: number;
    incomeSource?: string;
}

export async function runIbgeScan(cityName: string, uf: string): Promise<ConnectorResult<IbgeScanData>> {
    try {
        // 1. Resolve ID Logic (Geocode IBGE)
        const geocode = await fetchIbgeGeocode(cityName, uf);

        if (!geocode) {
            return {
                status: 'ERROR',
                provenance: 'UNAVAILABLE',
                data: null,
                notes: 'Cidade não encontrada na base do IBGE'
            };
        }

        // 2. Fetch Data using existing service (which uses IncomeResolver)
        const data = await fetchRealIbgeData(geocode);

        if (!data) {
            return { status: 'ERROR', provenance: 'UNAVAILABLE', data: null, notes: 'Falha ao buscar indicadores IBGE' };
        }

        // PARTIAL_REAL removed from canonical contract.
        // Assuming we check for STRICT REAL:
        const isPopReal = data.provenance.label === 'REAL';
        // fetchRealIbgeData returns averageIncome: 0 if unavailable, and sets notes.
        // We want explicitly null here for ConnectorResult if unavailable.
        const incomeValue = data.averageIncome && data.averageIncome > 0 ? data.averageIncome : null;

        // Determine overall status
        let status: 'SUCCESS' | 'PARTIAL' | 'ERROR' = 'SUCCESS';
        if (!incomeValue) status = 'PARTIAL';

        return {
            status,
            provenance: incomeValue ? 'REAL' : 'REAL', // Partial Real is still Real data
            data: {
                population: data.population,
                income: incomeValue,
                populationYear: 2022, // as per service fixed year
            },
            sourceUrl: data.provenance.source,
            notes: data.provenance.notes
        };

    } catch (e: any) {
        return { status: 'ERROR', provenance: 'UNAVAILABLE', data: null, notes: e.message };
    }
}
