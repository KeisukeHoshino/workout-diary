function optionalUrl(value: string | undefined) {
  if (!value) return null;
  try { return new URL(value).toString(); } catch { throw new Error('VITE_ERROR_ENDPOINTには絶対URLを指定してください。'); }
}

export const runtimeConfig = {
  appVersion: __APP_VERSION__,
  commitSha: __COMMIT_SHA__.slice(0, 12),
  errorEndpoint: optionalUrl(import.meta.env.VITE_ERROR_ENDPOINT)
};
