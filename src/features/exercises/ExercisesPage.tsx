import { Archive, RotateCcw } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { EmptyState } from '../../components/common/EmptyState';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import type { BodyPart, EquipmentType } from '../../domain/models';
import { bodyPartLabels, equipmentTypeLabels } from '../../domain/rules';
import { validateName } from '../../domain/validation';
import { initializeDatabase } from '../../infrastructure/db/database';
import { exerciseRepository } from '../../infrastructure/db/repositories';
import { useAsyncData } from '../shared/useAsyncData';

export function ExercisesPage() {
  const [selectedPresetIds, setSelectedPresetIds] = useState<string[]>([]);
  const { data, isLoading, reload } = useAsyncData(async () => {
    await initializeDatabase();
    const [exercises, presets] = await Promise.all([exerciseRepository.listAll(), exerciseRepository.listPresets()]);
    return { exercises, presets };
  });

  const addedPresetIds = new Set(data?.exercises.map((exercise) => exercise.sourcePresetId).filter(Boolean));

  async function createExercise(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = validateName(String(form.get('name') ?? ''));
    if (!name) return;
    await exerciseRepository.create({
      name,
      bodyPart: form.get('bodyPart') as BodyPart,
      equipmentType: (form.get('equipmentType') || null) as EquipmentType | null
    });
    event.currentTarget.reset();
    reload();
  }

  return (
    <>
      <ScreenHeader title="マイ種目" description="よく使う種目を管理します。" />
      <section className="panel">
        <form onSubmit={createExercise}>
          <div className="grid-3">
            <div className="field">
              <label>種目名</label>
              <input name="name" maxLength={40} required placeholder="例: ベンチプレス" />
            </div>
            <div className="field">
              <label>部位</label>
              <select name="bodyPart">{bodyPartOptions()}</select>
            </div>
            <div className="field">
              <label>種別</label>
              <select name="equipmentType">
                <option value="">なし</option>
                {equipmentOptions()}
              </select>
            </div>
          </div>
          <div className="actions" style={{ marginTop: 12 }}>
            <button className="button">種目を作成</button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="toolbar">
          <h3>一覧</h3>
          <span className="badge">{data?.exercises.length ?? 0} 件</span>
        </div>
        {isLoading ? <EmptyState title="読み込み中" /> : null}
        <div className="list">
          {data?.exercises.map((exercise) => (
            <article className="list-item" key={exercise.id}>
              <div className="list-item-top">
                <div>
                  <h3>{exercise.name}</h3>
                  <p className="muted">
                    {bodyPartLabels[exercise.bodyPart]} / {exercise.equipmentType ? equipmentTypeLabels[exercise.equipmentType] : '種別なし'}
                    {exercise.isActive ? '' : ' / 非表示'}
                  </p>
                </div>
                <button
                  className={exercise.isActive ? 'danger-button' : 'secondary-button'}
                  onClick={async () => {
                    await exerciseRepository.setActive(exercise.id, !exercise.isActive);
                    reload();
                  }}
                >
                  {exercise.isActive ? <Archive size={16} /> : <RotateCcw size={16} />}
                  {exercise.isActive ? '非表示' : '復元'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="toolbar">
          <h3>プリセット追加</h3>
          <button
            className="button"
            disabled={!selectedPresetIds.length}
            onClick={async () => {
              await exerciseRepository.addFromPresets(selectedPresetIds);
              setSelectedPresetIds([]);
              reload();
            }}
          >
            選択した種目を追加
          </button>
        </div>
        <div className="list">
          {data?.presets.map((preset) => {
            const disabled = addedPresetIds.has(preset.id);
            const checked = selectedPresetIds.includes(preset.id);
            return (
              <label className="list-item" key={preset.id}>
                <span className="list-item-top">
                  <span>
                    <strong>{preset.name}</strong>
                    <span className="muted"> {bodyPartLabels[preset.bodyPart]}</span>
                  </span>
                  <span className="badge">{disabled ? '追加済み' : '未追加'}</span>
                </span>
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={checked}
                  onChange={(event) => {
                    setSelectedPresetIds((current) => event.target.checked
                      ? [...current, preset.id]
                      : current.filter((id) => id !== preset.id));
                  }}
                />
              </label>
            );
          })}
        </div>
      </section>
    </>
  );
}

function bodyPartOptions() {
  return Object.entries(bodyPartLabels).map(([value, label]) => (
    <option key={value} value={value}>{label}</option>
  ));
}

function equipmentOptions() {
  return Object.entries(equipmentTypeLabels).map(([value, label]) => (
    <option key={value} value={value}>{label}</option>
  ));
}
