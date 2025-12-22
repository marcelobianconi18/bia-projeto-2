
// Dedicated environment helper for consistent REAL_ONLY checks
// Works in both Vite (Browser) and Node (Scripts) environments

export const isRealOnly = (): boolean => {
    // 1. Vite / Browser Context
    try {
        const v = (import.meta as any)?.env?.VITE_REAL_ONLY;
        if (typeof v === "string") return v === "true";
    } catch { /* ignore validation errors in node */ }

    // 2. Node / Scripts Context
    try {
        // Check global process directly
        if (typeof process !== 'undefined' && process.env) {
            const pv = process.env.VITE_REAL_ONLY;
            if (typeof pv === "string") return pv === "true";
        }
    } catch { /* ignore validation errors in browser */ }

    // Default to false (Permissive mode) if not explicitly set
    return false;
};
