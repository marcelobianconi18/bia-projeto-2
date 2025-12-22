import { GoogleAdsConfig, ConnectorResult } from '../../types';

export const verifyGoogleAds = async (config: GoogleAdsConfig): Promise<ConnectorResult<any>> => {
    // 1. If not connected, it's just disconnected
    if (!config.connected) {
        return {
            status: 'NOT_CONFIGURED',
            provenance: 'UNAVAILABLE',
            data: null,
            notes: 'User did not select Google Ads.'
        };
    }

    // 2. Client calls Server Stub. server stub says 501.
    try {
        const res = await fetch('http://localhost:3001/api/connectors/google-ads/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customerId: config.customerId,
                // No secrets sent
            })
        });

        if (res.status === 501) {
            const data = await res.json();
            return {
                status: 'NOT_CONFIGURED',
                provenance: 'UNAVAILABLE',
                data: null,
                notes: `Stub: ${data.message} (Required Env: ${data.required_env?.join(', ') || data.missing?.join(', ')})`
            };
        }

        return {
            status: 'ERROR',
            provenance: 'UNAVAILABLE',
            data: null,
            notes: `Unexpected status ${res.status}`
        };

    } catch (err) {
        return {
            status: 'ERROR',
            provenance: 'UNAVAILABLE',
            data: null,
            notes: 'Failed to reach server stub.'
        };
    }
};
