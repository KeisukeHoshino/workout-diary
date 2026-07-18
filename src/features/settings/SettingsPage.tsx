import { CheckCircle2, Download, Share2, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { appServices } from '../../app/services';
import { runtimeConfig } from '../../config/runtime';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import type { GraphRange } from '../../domain/models';
import { graphRangeLabels } from '../../domain/rules';
import { usePwaInstall } from '../../pwa/PwaInstallProvider';
import { useAsyncData } from '../shared/useAsyncData';

export function SettingsPage() {
  const [message, setMessage] = useState('');
  const [installMessage, setInstallMessage] = useState('');
  const [showIosSteps, setShowIosSteps] = useState(false);
  const backupInput = useRef<HTMLInputElement>(null);
  const { status: installStatus, install } = usePwaInstall();
  const { data, reload } = useAsyncData(async () => {
    return appServices.settings.get();
  });

  return (
    <div className="settings-page app-page">
      <ScreenHeader title="設定" description="単位と端末内データを管理します。" />
      <section className="panel settings-panel">
        <div className="section-heading">
          <h3>基本設定</h3>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>単位</label>
            <input value="kg" disabled />
          </div>
          <div className="field">
            <label>グラフ初期期間</label>
            <select
              value={data?.defaultGraphRange ?? '3m'}
              onChange={async (event) => {
                await appServices.settings.updateDefaultGraphRange(event.target.value as GraphRange);
                setMessage('設定を保存しました。');
                reload();
              }}
            >
              {Object.entries(graphRangeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>
      <section className="panel install-panel">
        <div className="section-heading">
          <h3>アプリ</h3>
        </div>
        <div className="install-panel-layout">
          <img className="install-app-icon" src="/icon-192.png" alt="筋トレ日記のアプリアイコン" />
          <div className="install-copy">
            <h4>筋トレ日記をインストール</h4>
            {installStatus === 'available' ? (
              <p className="muted">ホーム画面やアプリ一覧から、すぐに筋トレ記録を開けます。</p>
            ) : null}
            {installStatus === 'installed' ? (
              <p className="install-state-message">
                <CheckCircle2 size={17} aria-hidden="true" />
                この端末にインストールされています。
              </p>
            ) : null}
            {installStatus === 'ios' ? (
              <p className="muted">Safariの共有メニューからホーム画面へ追加できます。</p>
            ) : null}
            {installStatus === 'unavailable' ? (
              <p className="muted">
                対応ブラウザでは、インストールの準備が整うとボタンが表示されます。
              </p>
            ) : null}
            {showIosSteps && installStatus === 'ios' ? (
              <ol className="install-steps">
                <li>Safariの共有ボタンを押します。</li>
                <li>「ホーム画面に追加」を選びます。</li>
                <li>右上の「追加」を押します。</li>
              </ol>
            ) : null}
            {installMessage ? (
              <p className="status-message" aria-live="polite">
                {installMessage}
              </p>
            ) : null}
            <p className="muted">バージョン {runtimeConfig.appVersion} ({runtimeConfig.commitSha})</p>
          </div>
          <div className="install-actions">
            {installStatus === 'available' ? (
              <button
                className="button"
                type="button"
                onClick={async () => {
                  setInstallMessage('');
                  try {
                    const outcome = await install();
                    if (outcome === 'dismissed') {
                      setInstallMessage('インストールをキャンセルしました。');
                    }
                  } catch {
                    setInstallMessage(
                      'インストールを開始できませんでした。ブラウザのメニューからお試しください。',
                    );
                  }
                }}
              >
                <Download size={17} aria-hidden="true" />
                インストール
              </button>
            ) : null}
            {installStatus === 'installed' ? (
              <button className="secondary-button" type="button" disabled>
                <CheckCircle2 size={17} aria-hidden="true" />
                インストール済み
              </button>
            ) : null}
            {installStatus === 'ios' ? (
              <button
                className="secondary-button"
                type="button"
                aria-expanded={showIosSteps}
                onClick={() => setShowIosSteps((current) => !current)}
              >
                <Share2 size={17} aria-hidden="true" />
                {showIosSteps ? '追加方法を閉じる' : '追加方法を見る'}
              </button>
            ) : null}
          </div>
        </div>
      </section>
      <section className="panel danger-zone">
        <div className="toolbar">
          <div>
            <h3>データ管理</h3>
            <p className="muted">記録をJSONで保存・復元、またはこの端末から削除します。</p>
            {message ? <p className="settings-message">{message}</p> : null}
          </div>
          <div className="actions">
            <button className="secondary-button" type="button" onClick={async () => {
              try {
                const backup = await appServices.settings.exportBackup();
                const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
                const anchor = document.createElement('a');
                anchor.href = url;
                anchor.download = `workout-diary-${backup.exportedAt.slice(0, 10)}.json`;
                anchor.click();
                URL.revokeObjectURL(url);
                setMessage('バックアップを書き出しました。');
              } catch { setMessage('バックアップを書き出せませんでした。'); }
            }}><Download size={16} aria-hidden="true" />バックアップ</button>
            <button className="secondary-button" type="button" onClick={() => backupInput.current?.click()}><Upload size={16} aria-hidden="true" />復元</button>
            <input ref={backupInput} type="file" accept="application/json,.json" hidden onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              try {
                const result = appServices.settings.validateBackup(JSON.parse(await file.text()));
                if (!result.valid) throw new Error(result.errors.join(' '));
                const warning = result.warnings.length ? `\n警告: ${result.warnings.join(' ')}` : '';
                if (!confirm(`現在のデータをバックアップで置き換えますか？${warning}`)) return;
                await appServices.settings.restoreBackup(result.document, 'replace');
                setMessage('バックアップから復元しました。');
                reload();
              } catch (error) { setMessage(error instanceof Error ? error.message : 'バックアップを復元できませんでした。'); }
            }} />
            <button className="danger-button" type="button" onClick={async () => {
              if (!confirm('全データを削除しますか？')) return;
              if (!confirm('本当に削除しますか？この操作は元に戻せません。')) return;
              await appServices.settings.reset();
              setMessage('初期化しました。');
              reload();
            }}><Trash2 size={16} aria-hidden="true" />全データ初期化</button>
          </div>
        </div>
      </section>
    </div>
  );
}
