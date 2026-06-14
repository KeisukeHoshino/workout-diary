export function parseNullableNumber(value: string, min: number, max: number): number | null | undefined {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return undefined;
  return parsed;
}

export function validateName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 40) return null;
  return trimmed;
}
