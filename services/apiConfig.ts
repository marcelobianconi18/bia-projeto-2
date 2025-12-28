
const cleanUrl = (url?: string) => (url ? url.replace(/\/$/, '') : '');

const getEnv = () => {
    try {
        return typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
    } catch {
        return {};
    }
};

export const getApiBaseUrl = (): string => {
    const metaEnv: Record<string, string | undefined> = getEnv() as any;
    const processEnv = typeof process !== 'undefined' && process.env ? process.env : {};

    // Ordem de preferência: Variáveis VITE > Process Env > Hardcoded Fallback
    const candidate =
        metaEnv.VITE_API_BASE_URL ||
        metaEnv.VITE_BACKEND_URL ||
        metaEnv.VITE_SERVER_URL ||
        processEnv.VITE_API_BASE_URL ||
        processEnv.VITE_BACKEND_URL ||
        processEnv.API_BASE_URL ||
        processEnv.BACKEND_URL;

    if (candidate) return cleanUrl(candidate);

    // Fallback inteligente para desenvolvimento local se nenhuma ENV for definida
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        return 'http://localhost:3001';
    }

    // Fallback padrão (mesma origem) para produção se houver proxy
    if (typeof window !== 'undefined' && window.location?.origin) {
        return cleanUrl(window.location.origin);
    }

    return '';
};

export const buildApiUrl = (path: string): string => {
    const base = getApiBaseUrl();
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return base ? `${base}${normalizedPath}` : normalizedPath;
};
