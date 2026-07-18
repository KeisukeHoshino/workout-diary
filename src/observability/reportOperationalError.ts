export function reportOperationalError(kind: 'pwa-update', value: unknown) {
  const error = value instanceof Error ? value : new Error('Unknown operational error');
  console.error('[workout-diary]', { kind, name: error.name, message: error.message.slice(0, 300) });
}
