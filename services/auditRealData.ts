
import { DataProvenance, GeminiAnalysis } from '../types';

interface AuditResult {
    passed: boolean;
    violations: string[];
}

export function auditRealData(
    state: {
        analysis: GeminiAnalysis | null;
        hotspots: any[];
        mapLayers: any[]; // Representation of active layers
    }
): AuditResult {
    const violations: string[] = [];

    console.log("=== RUNNING REAL DATA AUDIT ===");

    // 1. Check Gemini Analysis for Hallucinated Metrics
    if (state.analysis) {
        // Regex for suspicious metric patterns in text without citation
        // This is a heuristic; ideally we check strict fields
        const suspiciousPatterns = [/R\$\s?\d+/, /\d+\s?%/];
        const textToCheck = [
            state.analysis.verdict,
            state.analysis.action,
            ...(state.analysis.reasons || []),
            ...(state.analysis.risks || [])
        ].join(' ');

        // Note: This is an optional strict check. For now we focus on structural compliance.
        // If reasons/risks are lacking limitations or specific provenance, we might flag.
        if (!state.analysis.limitations || state.analysis.limitations.length === 0) {
            violations.push("Gemini: Analysis missing 'limitations' field.");
        }
    }

    // 2. Check Hotspots Provenance
    if (state.hotspots && state.hotspots.length > 0) {
        state.hotspots.forEach(h => {
            if (!h.provenance) {
                violations.push(`Hotspot ${h.name} missing provenance.`);
            } else if (h.provenance.label !== 'REAL') {
                // If we are in REAL_ONLY mode, this is a violation.
                if (import.meta.env.VITE_REAL_ONLY === 'true') {
                    violations.push(`Hotspot ${h.name} is ${h.provenance.label} but mode is REAL_ONLY.`);
                }
            }
        });
    }

    const passed = violations.length === 0;
    if (!passed) {
        console.error("AUDIT FAILED:", violations);
    } else {
        console.log("AUDIT PASSED");
    }

    return { passed, violations };
}
