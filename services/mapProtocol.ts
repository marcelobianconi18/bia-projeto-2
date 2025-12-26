export type ChoroplethBreak = {
  min: number;
  max: number;
  color: string;
};

const DEFAULT_PALETTE = ['#f7fcf0', '#ccebc5', '#7bccc4', '#2b8cbe', '#084081'];

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const num = Number(String(value).replace(',', '.'));
  return Number.isFinite(num) ? num : null;
};

export const buildQuantileBreaks = (
  values: number[],
  palette: string[] = DEFAULT_PALETTE
): ChoroplethBreak[] => {
  if (!values.length) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const steps = palette.length;
  const breaks: ChoroplethBreak[] = [];

  for (let i = 0; i < steps; i++) {
    const startIdx = Math.floor((i / steps) * (sorted.length - 1));
    const endIdx = Math.floor(((i + 1) / steps) * (sorted.length - 1));
    const min = sorted[startIdx];
    const max = sorted[endIdx];
    breaks.push({ min, max, color: palette[i] });
  }

  return breaks;
};

export const getColorForValue = (
  value: number | null,
  breaks: ChoroplethBreak[],
  fallback: string
): string => {
  if (value === null || !breaks.length) return fallback;
  const match = breaks.find((b) => value >= b.min && value <= b.max);
  return match ? match.color : breaks[breaks.length - 1].color;
};

export const extractChoroplethValue = (props: Record<string, any>): number | null => {
  return (
    toNumber(props.valor_classe) ??
    toNumber(props.valor) ??
    toNumber(props.population) ??
    toNumber(props.targetAudienceEstimate) ??
    null
  );
};

export const formatNumberBr = (val: number): string =>
  val.toLocaleString('pt-BR');
