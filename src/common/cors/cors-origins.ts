export function parseCorsOrigins(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin !== '');
}

export function isAllowedOrigin(
  origin: string | undefined,
  allowedOrigins: string[],
): boolean {
  if (!origin) return true;
  return allowedOrigins.includes(origin);
}
