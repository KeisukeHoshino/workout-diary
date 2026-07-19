function optionalUrl(value: string | undefined) {
  if (!value) return null;
  try { return new URL(value).toString(); } catch { throw new Error('VITE_ERROR_ENDPOINTには絶対URLを指定してください。'); }
}

// ビルド時に注入される値をここで正規化し、アプリ全体から同じ形で参照する。
export const runtimeConfig = {
  appVersion: __APP_VERSION__,
  commitSha: __COMMIT_SHA__.slice(0, 12),
  errorEndpoint: optionalUrl(import.meta.env.VITE_ERROR_ENDPOINT)
};
