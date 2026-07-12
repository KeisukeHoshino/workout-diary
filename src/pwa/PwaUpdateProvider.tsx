import { createContext, type PropsWithChildren, useContext } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { reportError } from '../observability/errorReporter';

interface PwaUpdateContextValue {
  updateAvailable: boolean;
  applyUpdate(): Promise<void>;
  dismiss(): void;
}

const PwaUpdateContext = createContext<PwaUpdateContextValue | null>(null);

export function PwaUpdateProvider({ children }: PropsWithChildren) {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
    onRegisterError(error) { reportError('pwa-update', error); }
  });

  return (
    <PwaUpdateContext.Provider value={{
      updateAvailable: needRefresh,
      async applyUpdate() { await updateServiceWorker(true); },
      dismiss() { setNeedRefresh(false); }
    }}>
      {children}
    </PwaUpdateContext.Provider>
  );
}

export function PwaUpdateNotice() {
  const context = useContext(PwaUpdateContext);
  if (!context?.updateAvailable) return null;
  return (
    <aside className="pwa-update-notice" role="status">
      <span>新しいバージョンがあります。入力を終えてから更新してください。</span>
      <div className="actions">
        <button className="secondary-button" type="button" onClick={context.dismiss}>あとで</button>
        <button className="button" type="button" onClick={() => void context.applyUpdate()}>更新</button>
      </div>
    </aside>
  );
}
