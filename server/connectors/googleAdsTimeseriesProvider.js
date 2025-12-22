
// Stub for Google Ads Timeseries - Canonical Format
export class GoogleAdsTimeseriesProvider {
    async getTimeseries168(params) {
        const hasCreds = process.env.GOOGLE_ADS_CLIENT_ID && process.env.GOOGLE_ADS_CLIENT_SECRET;

        if (!hasCreds) {
            return {
                metric: "AD_ACTIVITY",
                values: [], // Empty flat array
                unit: "UNKNOWN",
                timezone: params.tz || "UTC",
                weekStartLocalISO: new Date().toISOString(),
                geoScope: { kind: params.regionKind, ibge_municipio_id: params.regionId },
                provenance: {
                    label: "NOT_CONFIGURED",
                    source: "GOOGLE_ADS",
                    notes: "Server missing GOOGLE_ADS_CLIENT_ID",
                    fetchedAt: new Date().toISOString()
                }
            };
        }

        return {
            metric: "AD_ACTIVITY",
            values: [],
            unit: "UNKNOWN",
            timezone: params.tz || "UTC",
            weekStartLocalISO: new Date().toISOString(),
            geoScope: { kind: params.regionKind, ibge_municipio_id: params.regionId },
            provenance: {
                label: "UNAVAILABLE",
                source: "GOOGLE_ADS",
                notes: "Connector implemented as Stub (Phase 3)",
                fetchedAt: new Date().toISOString()
            }
        };
    }
}
