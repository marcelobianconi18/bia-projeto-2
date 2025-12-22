import { ConnectorResult } from "../../types";

export async function checkGooglePlaces(): Promise<ConnectorResult<any>> {
    return {
        status: 'NOT_CONFIGURED',
        provenance: 'UNAVAILABLE',
        data: null,
        notes: 'PLACES_API_KEY missing'
    };
}
