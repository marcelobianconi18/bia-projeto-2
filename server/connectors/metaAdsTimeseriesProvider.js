
// Stub for Meta Ads Timeseries - Canonical Format
export class MetaAdsTimeseriesProvider {
    async getTimeseries168(params) {
        const hasCreds = process.env.META_APP_ID && process.env.META_APP_SECRET;

        if (!hasCreds) {
            return {
                metric: "DIGITAL_INTENT",
                values: [],
                unit: "UNKNOWN",
                timezone: params.tz || "UTC",
                weekStartLocalISO: new Date().toISOString(),
                geoScope: { kind: params.regionKind, ibge_municipio_id: params.regionId },
                provenance: {
                    label: "NOT_CONFIGURED",
                    source: "META_ADS",
                    notes: "Server missing META_APP_ID",
                    fetchedAt: new Date().toISOString()
                }
            };
        }

        return {
            metric: "DIGITAL_INTENT",
            values: [],
            unit: "UNKNOWN",
            timezone: params.tz || "UTC",
            weekStartLocalISO: new Date().toISOString(),
            geoScope: { kind: params.regionKind, ibge_municipio_id: params.regionId },
            provenance: {
                label: "UNAVAILABLE",
                source: "META_ADS",
                notes: "Connector implemented as Stub (Phase 3)",
                fetchedAt: new Date().toISOString()
            }
        };
    }
}
