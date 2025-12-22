
import { SectorStat, Provenance } from "../../types";

export async function fetchIbgeSectorStats(municipioId: string, sectorGeocodes: string[]): Promise<Record<string, SectorStat>> {
    // Currently returns empty stats as we don't have granular sector data installed.
    // In a real scenario, this would fetch CSV/JSON stats mapped by geocode.

    // Returning empty object implies "No stats available" -> UI handles cleanly.
    return {};
}
