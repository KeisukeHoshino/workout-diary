import { runtimeConfig } from '../config/runtime';

export type ClientErrorKind = 'error' | 'unhandledrejection' | 'pwa-update';

export interface SafeClientErrorEvent {
  kind: ClientErrorKind;
  name: string;
  message: string;
  appVersion: string;
  commitSha: string;
  path: string;
  occurredAt: string;
}

const messages: Record<ClientErrorKind, string> = {
  error: 'クライアントエラーが発生しました。',
  unhandledrejection: '非同期処理でエラーが発生しました。',
  'pwa-update': 'PWA更新処理でエラーが発生しました。'
};

export function buildSafeClientErrorEvent(kind: ClientErrorKind, value: unknown, path = window.location.pathname): SafeClientErrorEvent {
  const name = value instanceof Error ? value.name : 'UnknownError';
  return {
    kind,
    name: name.slice(0, 80),
    message: messages[kind],
    appVersion: runtimeConfig.appVersion,
    commitSha: runtimeConfig.commitSha,
    path: path.split('?')[0],
    occurredAt: new Date().toISOString()
  };
}

export function reportClientError(kind: ClientErrorKind, value: unknown) {
  const event = buildSafeClientErrorEvent(kind, value);
  console.error('[workout-diary]', event);
  if (runtimeConfig.errorEndpoint) {
    void fetch(runtimeConfig.errorEndpoint, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(event),
      keepalive: true, credentials: 'omit'
    }).catch(() => undefined);
  }
}

export function installGlobalErrorReporting() {
  window.addEventListener('error', (event) => reportClientError('error', event.error));
  window.addEventListener('unhandledrejection', (event) => reportClientError('unhandledrejection', event.reason));
}
