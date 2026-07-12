import { runtimeConfig } from '../config/runtime';

interface SafeErrorEvent {
  kind: 'error' | 'unhandledrejection' | 'pwa-update';
  name: string;
  message: string;
  appVersion: string;
  commitSha: string;
  path: string;
  occurredAt: string;
}

function sanitize(value: unknown): Pick<SafeErrorEvent, 'name' | 'message'> {
  const error = value instanceof Error ? value : new Error('Unknown client error');
  return { name: error.name.slice(0, 80), message: error.message.slice(0, 300) };
}

export function reportError(kind: SafeErrorEvent['kind'], value: unknown) {
  const event: SafeErrorEvent = {
    kind,
    ...sanitize(value),
    appVersion: runtimeConfig.appVersion,
    commitSha: runtimeConfig.commitSha,
    path: window.location.pathname,
    occurredAt: new Date().toISOString()
  };
  console.error('[workout-diary]', event);
  if (runtimeConfig.errorEndpoint) {
    void fetch(runtimeConfig.errorEndpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(event),
      keepalive: true,
      credentials: 'omit'
    }).catch(() => undefined);
  }
}

export function installGlobalErrorReporting() {
  window.addEventListener('error', (event) => reportError('error', event.error));
  window.addEventListener('unhandledrejection', (event) => reportError('unhandledrejection', event.reason));
}
