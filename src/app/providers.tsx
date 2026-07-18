import type { PropsWithChildren } from 'react';
import { PwaInstallProvider } from '../pwa/PwaInstallProvider';
import { PwaUpdateNotice, PwaUpdateProvider } from '../pwa/PwaUpdateProvider';
import { UnsavedChangesProvider } from './UnsavedChangesProvider';
import { DatabaseGate } from './DatabaseGate';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <PwaInstallProvider>
      <UnsavedChangesProvider>
        <PwaUpdateProvider>
          <DatabaseGate>{children}</DatabaseGate>
          <PwaUpdateNotice />
        </PwaUpdateProvider>
      </UnsavedChangesProvider>
    </PwaInstallProvider>
  );
}
