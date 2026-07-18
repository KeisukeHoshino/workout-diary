import { type PropsWithChildren, useCallback, useEffect, useState } from 'react';
import { appServices } from './services';

export function DatabaseGate({ children }: PropsWithChildren) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const initialize = useCallback(() => {
    setState('loading');
    void appServices.settings.get().then(() => setState('ready')).catch((error) => {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'データベースを開けませんでした。');
    });
  }, []);
  useEffect(initialize, [initialize]);

  if (state === 'loading') return <main className="app-page"><p className="muted">データを読み込んでいます...</p></main>;
  if (state === 'error') {
    return (
      <main className="app-page">
        <section className="panel">
          <h2>保存データを開けませんでした</h2>
          <p className="muted">データは自動削除されていません。再試行するか、可能であればバックアップを保存してください。</p>
          {message ? <p className="status-message is-error">{message}</p> : null}
          <div className="actions">
            <button className="button" type="button" onClick={initialize}>再試行</button>
            <button className="secondary-button" type="button" onClick={async () => {
              try {
                const backup = await appServices.settings.exportBackup();
                const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
                const anchor = document.createElement('a');
                anchor.href = url;
                anchor.download = `workout-diary-recovery-${backup.exportedAt.slice(0, 10)}.json`;
                anchor.click();
                URL.revokeObjectURL(url);
              } catch { setMessage('現在の状態ではバックアップを書き出せませんでした。データを初期化せず、アプリの更新をお待ちください。'); }
            }}>バックアップを試す</button>
          </div>
        </section>
      </main>
    );
  }
  return children;
}
