import { createContext, type PropsWithChildren, useContext } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useUnsavedChanges } from '../app/UnsavedChangesProvider';
import { reportOperationalError } from '../observability/reportOperationalError';

interface PwaUpdateValue {
  updateAvailable: boolean;
  canApplyUpdate: boolean;
  applyUpdate(): Promise<void>;
  dismissUpdate(): void;
}

const PwaUpdateContext = createContext<PwaUpdateValue | null>(null);

export function PwaUpdateProvider({ children }: PropsWithChildren) {
  const { isDirty } = useUnsavedChanges();
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
    onRegisterError: (error) => reportOperationalError('pwa-update', error)
  });
  return (
    <PwaUpdateContext.Provider value={{
      updateAvailable: needRefresh,
      canApplyUpdate: needRefresh && !isDirty,
      async applyUpdate() {
        if (isDirty) return;
        await updateServiceWorker(true);
      },
      dismissUpdate: () => setNeedRefresh(false)
    }}>
      {children}
    </PwaUpdateContext.Provider>
  );
}

export function PwaUpdateNotice() {
  const state = useContext(PwaUpdateContext);
  if (!state?.updateAvailable) return null;
  return (
    <aside className="pwa-update-notice" role="status">
      <p>{state.canApplyUpdate ? '新しいバージョンがあります。' : '入力を保存またはキャンセルすると更新できます。'}</p>
      <div className="actions">
        <button className="secondary-button" type="button" onClick={state.dismissUpdate}>あとで</button>
        <button className="button" type="button" disabled={!state.canApplyUpdate} onClick={() => void state.applyUpdate()}>更新</button>
      </div>
    </aside>
  );
}
