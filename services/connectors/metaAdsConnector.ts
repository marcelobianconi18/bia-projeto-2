import { MetaAdsConfig, ConnectorResult } from '../../types';

export const verifyMetaAds = async (config: MetaAdsConfig): Promise<ConnectorResult<any>> => {
    if (!config.connected) {
        return { status: 'NOT_CONFIGURED', provenance: 'UNAVAILABLE', data: null };
    }

    try {
        const res = await fetch('http://localhost:3001/api/connectors/meta-ads/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adAccountId: config.adAccountId })
        });

        if (res.status === 501) {
            const data = await res.json();
            return {
                status: 'NOT_CONFIGURED',
                provenance: 'UNAVAILABLE',
                data: null,
                notes: `Stub: ${data.message}`
            };
        }

        return { status: 'ERROR', provenance: 'UNAVAILABLE', data: null };
    } catch (err) {
        return { status: 'ERROR', provenance: 'UNAVAILABLE', data: null, notes: 'Server unavailable' };
    }
};
