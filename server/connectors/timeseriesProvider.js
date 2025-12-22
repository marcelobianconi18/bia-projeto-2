export interface ITimeseriesProvider {
    getTimeseries168(params: {
        regionKind: string;
        regionId?: string;
        tz: string;
        days?: number;
    }): Promise<any>; // Any here matches server-side logic which maps to shared Timeseries168 structure
}
