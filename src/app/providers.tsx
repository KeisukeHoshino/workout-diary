import type { PropsWithChildren } from 'react';
import { PwaInstallProvider } from '../pwa/PwaInstallProvider';

export function AppProviders({ children }: PropsWithChildren) {
  return <PwaInstallProvider>{children}</PwaInstallProvider>;
}
