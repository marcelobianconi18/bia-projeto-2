export const extractJson = (text: string): string => {
  if (!text) return '';
  // Remove ```json and ``` markers
  const cleaned = text.replace(/```json|```/gi, '').trim();
  const startIndex = Math.min(
    ...['{', '[']
      .map(ch => {
        const i = cleaned.indexOf(ch);
        return i === -1 ? Number.MAX_SAFE_INTEGER : i;
      })
  );
  if (startIndex === Number.MAX_SAFE_INTEGER) return cleaned;

  const opening = cleaned[startIndex];
  const closing = opening === '{' ? '}' : ']';
  let depth = 0;
  for (let i = startIndex; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === opening) depth++;
    if (ch === closing) depth--;
    if (depth === 0) return cleaned.substring(startIndex, i + 1);
  }
  // fallback: return cleaned
  return cleaned;
};

export const safeParseJson = <T = any>(text: string): { ok: boolean; value?: T; error?: string; raw: string } => {
  const raw = text ?? '';
  try {
    const fragment = extractJson(raw);
    if (!fragment) return { ok: false, error: 'empty', raw };
    const parsed = JSON.parse(fragment) as T;
    return { ok: true, value: parsed, raw };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e), raw };
  }
};
