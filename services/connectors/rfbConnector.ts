import { RfbConfig, ConnectorResult } from '../../types';

export const verifyRfb = async (config: RfbConfig): Promise<ConnectorResult<any>> => {
    if (!config.connected) {
        return { status: 'NOT_CONFIGURED', provenance: 'UNAVAILABLE', data: null };
    }

    try {
        const res = await fetch('http://localhost:3001/api/connectors/rfb/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cnpj: config.cnpj })
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
