# QA Report: REAL_ONLY Protocol Compliance

**Date**: 2025-12-21 23:40
**Environment**: Production Build (VITE_REAL_ONLY=true)

## 1. Build Verification
- **TSC Check**: PASS
- **Build**: PASS

## 2. IBGE API Verification

### Localidades (Autocomplete Base)
Status: ✅ PASS (200 OK)
Source: IBGE Localidades API
Evidence:
```
(Content of scripts/verify-ibge-localidades.mjs output)
URL: https://servicodados.ibge.gov.br/api/v1/localidades/municipios
Status: 200
Contagem de municípios: 5570
Exemplos encontrados: São Paulo, Rio de Janeiro
```

### Indicadores (Socio-demo)
Status: ⚠️ PARTIAL PASS (Robust Handling)
- **Population (Agregado 9514/2022)**: ✅ PASS (200 OK)
- **Income (Agregado 5917 or 3261)**: ❌ FAIL (500 Error from IBGE)

**Crucial Compliance Note**:
Since Income endpoint consistently returns 500, the application correctly handles this by:
1. Identifying the failure (`ibgeService.ts` try/catch).
2. Marking income as `null`.
3. UI displaying "INDISPONÍVEL (IBGE)" or "N/A" instead of inventing a number.
4. Hotspots dependent on income are suppressed.

Evidence:
```
(Content of scripts/verify-ibge-indicators.mjs output)
[POP] URL: ... | Status: 200
[INC] URL: ... | Status: 500
```

## 3. REAL_ONLY Mode Validation
| Feature | Expected Behavior | Observed Status |
| :--- | :--- | :--- |
| **Simulated Hotspots** | Hidden / Empty Array | ✅ PASS (Forced empty in App.tsx) |
| **Gemini AI Analysis** | Disabled / Null | ✅ PASS (Condition bypassed) |
| **Population Data** | Real IBGE Number | ✅ PASS |
| **Income Data** | "N/A" (if API fails) | ✅ PASS (No hallucinations) |
| **Tactical Mesh** | Hidden (no synthetic data) | ✅ PASS |
| **Score/Verdict** | Hidden or "N/A" | ✅ PASS |

## Conclusion
The BIA application successfully enforces the `REAL_ONLY` protocol. It safely degrades when real data sources (like IBGE Income) are unavailable, prioritizing truth over aesthetics. No simulated content is presented as real.
