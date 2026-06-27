import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import type { GraphRange } from '../../domain/models';
import { graphRangeLabels } from '../../domain/rules';
import { db, initializeDatabase } from '../../infrastructure/db/database';
import { settingsRepository } from '../../infrastructure/db/repositories';
import { useAsyncData } from '../shared/useAsyncData';

export function SettingsPage() {
  const [message, setMessage] = useState('');
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
