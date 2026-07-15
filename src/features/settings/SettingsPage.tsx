import { CheckCircle2, Download, Share2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import type { GraphRange } from '../../domain/models';
import { graphRangeLabels } from '../../domain/rules';
import { db, initializeDatabase } from '../../infrastructure/db/database';
import { settingsRepository } from '../../infrastructure/db/repositories';
import { usePwaInstall } from '../../pwa/PwaInstallProvider';
import { useAsyncData } from '../shared/useAsyncData';

export function SettingsPage() {
  const [message, setMessage] = useState('');
  const [installMessage, setInstallMessage] = useState('');
  const [showIosSteps, setShowIosSteps] = useState(false);
  const { status: installStatus, install } = usePwaInstall();
  const { data, reload } = useAsyncData(async () => {
    await initializeDatabase();
    return settingsRepository.get();
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
                await settingsRepository.updateDefaultGraphRange(event.target.value as GraphRange);
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
            <p className="muted">IndexedDB のデータをこの端末から削除します。</p>
            {message ? <p className="settings-message">{message}</p> : null}
          </div>
          <button
            className="danger-button"
            onClick={async () => {
              if (!confirm('全データを削除しますか？')) return;
              if (!confirm('本当に削除しますか？この操作は元に戻せません。')) return;
              await db.delete();
              await db.open();
              await initializeDatabase();
              setMessage('初期化しました。');
              reload();
            }}
          >
            <Trash2 size={16} aria-hidden="true" />
            全データ初期化
          </button>
        </div>
      </section>
    </div>
  );
}
