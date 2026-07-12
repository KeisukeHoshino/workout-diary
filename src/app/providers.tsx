import type { PropsWithChildren } from 'react';
import { PwaInstallProvider } from '../pwa/PwaInstallProvider';
import { PwaUpdateNotice, PwaUpdateProvider } from '../pwa/PwaUpdateProvider';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <PwaInstallProvider>
      <PwaUpdateProvider>
        {children}
        <PwaUpdateNotice />
      </PwaUpdateProvider>
    </PwaInstallProvider>
  );
}
