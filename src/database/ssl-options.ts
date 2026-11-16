import type { TlsOptions } from 'node:tls';

export function buildSslOptions(
  enabled: boolean,
  caCert: string | undefined,
): TlsOptions | false {
  if (!enabled) return false;
  return {
    rejectUnauthorized: true,
    ...(caCert ? { ca: caCert.replace(/\\n/g, '\n') } : {}),
  };
}
