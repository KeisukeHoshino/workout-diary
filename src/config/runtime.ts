export interface RuntimeConfig {
  appVersion: string;
  commitSha: string;
  errorEndpoint: string | null;
}

function optionalUrl(value: string | undefined): string | null {
  if (!value) return null;
  try { return new URL(value).toString(); } catch { throw new Error('VITE_ERROR_ENDPOINT must be an absolute URL.'); }
}

export const runtimeConfig: RuntimeConfig = {
  appVersion: __APP_VERSION__,
  commitSha: __COMMIT_SHA__.slice(0, 12),
  errorEndpoint: optionalUrl(import.meta.env.VITE_ERROR_ENDPOINT)
};
