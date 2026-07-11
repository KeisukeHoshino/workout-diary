import { ChevronLeft, ChevronRight, ListPlus, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState } from '../../components/common/EmptyState';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import type { Exercise, LocalDateString, MenuTemplateDetail, WorkoutDetail } from '../../domain/models';
import { addDays, bodyPartLabels, dateLabel, equipmentTypeLabels, formatKg, localDate } from '../../domain/rules';
import { parseNullableNumber } from '../../domain/validation';
import {
  bodyWeightRepository,
  exerciseRepository,
  menuRepository,
  workoutRepository
} from '../../infrastructure/db/repositories';
import { initializeDatabase } from '../../infrastructure/db/database';
import { useAsyncData } from '../shared/useAsyncData';

export function WorkoutPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const date = (searchParams.get('date') || localDate()) as LocalDateString;
  const [exercisePickerOpen, setExercisePickerOpen] = useState(false);
  const [menuPickerOpen, setMenuPickerOpen] = useState(false);
  const { data, isLoading, reload } = useAsyncData(async () => {
    await initializeDatabase();
    const [detail, exercises, menus] = await Promise.all([
      workoutRepository.getWorkoutByDate(date),
      exerciseRepository.listActive(),
      menuRepository.list()
    ]);
    return { detail, exercises, menus };
  }, [date]);

  const changeDate = (nextDate: LocalDateString) => {
    setSearchParams(nextDate === localDate() ? {} : { date: nextDate });
  };

  const detail = data?.detail;

  return (
    <div className="workout-page app-page">
      <ScreenHeader
        title="今日の記録"
        description={`${dateLabel(date)} のトレーニングを記録します。`}
      />

      <section className="panel date-panel">
        <div className="date-control">
          <button className="icon-button" title="前日" onClick={() => changeDate(addDays(date, -1))}>
            <ChevronLeft size={18} />
          </button>
          <input type="date" value={date} onChange={(event) => changeDate(event.target.value as LocalDateString)} />
          <button className="icon-button" title="翌日" onClick={() => changeDate(addDays(date, 1))}>
            <ChevronRight size={18} />
          </button>
        </div>
      </section>

      <BodyWeightPanel date={date} value={detail?.bodyWeightLog?.bodyWeightKg ?? null} onSaved={reload} />

      <section className="collection-section workout-log-section">
        <div className="toolbar collection-header">
          <h3>セット記録</h3>
          <span className="badge">{detail?.exercises.length ?? 0} 種目</span>
        </div>
        {isLoading ? <EmptyState title="読み込み中" /> : null}
        {!isLoading && detail?.exercises.length === 0 ? <EmptyState title="まだ種目がありません">種目またはメニューを追加してください。</EmptyState> : null}
        {detail?.exercises.map((item) => (
          <WorkoutExerciseCard key={item.workoutExercise.id} item={item} onChanged={reload} />
        ))}
        <div className="workout-add-actions">
          <button
            className="secondary-button"
            type="button"
            aria-expanded={exercisePickerOpen}
            onClick={() => {
              setExercisePickerOpen((value) => !value);
              setMenuPickerOpen(false);
            }}
          >
            <Plus size={17} aria-hidden="true" />
            種目追加
          </button>
          <button
            className="button"
            type="button"
            aria-expanded={menuPickerOpen}
            onClick={() => {
              setMenuPickerOpen((value) => !value);
              setExercisePickerOpen(false);
            }}
          >
            <ListPlus size={17} aria-hidden="true" />
            メニュー追加
          </button>
        </div>
      </section>

      {exercisePickerOpen && data ? (
        <PickerPanel
          exercises={data.exercises}
          onChoose={async (exerciseId) => {
            await workoutRepository.addExerciseToDate(date, exerciseId);
            setExercisePickerOpen(false);
            reload();
          }}
        />
      ) : null}

      {menuPickerOpen && data ? (
        <MenuPickerPanel
          menus={data.menus}
          onChoose={async (menuId) => {
            await workoutRepository.addMenuToDate(date, menuId);
            setMenuPickerOpen(false);
            reload();
          }}
        />
      ) : null}
    </div>
  );
}

function PickerPanel({ exercises, onChoose }: { exercises: Exercise[]; onChoose: (exerciseId: string) => Promise<void> }) {
  return (
    <section className="panel picker-panel">
      <div className="toolbar">
        <h3>種目を選択</h3>
      </div>
      <div className="list">
        {exercises.map((exercise) => (
          <button className="list-item" key={exercise.id} onClick={() => onChoose(exercise.id)}>
            <span className="list-item-top">
              <strong>{exercise.name}</strong>
              <span className="badge">{bodyPartLabels[exercise.bodyPart]}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function MenuPickerPanel({ menus, onChoose }: { menus: MenuTemplateDetail[]; onChoose: (menuId: string) => Promise<void> }) {
  return (
    <section className="panel picker-panel">
      <div className="toolbar">
        <h3>メニューを選択</h3>
      </div>
      {menus.length ? (
        <div className="list">
          {menus.map((item) => (
            <button className="list-item" key={item.menu.id} onClick={() => onChoose(item.menu.id)}>
              <span className="list-item-top">
                <strong>{item.menu.name}</strong>
                <span className="badge">{item.exercises.length} 種目</span>
              </span>
              <span className="muted">{item.exercises.map((row) => row.exercise.name).join(' / ')}</span>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState title="メニューがありません">メニュー画面でテンプレートを作成できます。</EmptyState>
      )}
    </section>
  );
}

function BodyWeightPanel({ date, value, onSaved }: { date: LocalDateString; value: number | null; onSaved: () => void }) {
  const [draft, setDraft] = useState(value?.toString() ?? '');

  useEffect(() => {
    setDraft(value?.toString() ?? '');
  }, [value, date]);

  return (
    <section className="panel body-weight-panel">
      <div className="grid-2">
        <div className="field">
          <label htmlFor="bodyWeight">体重 kg</label>
          <input
            id="bodyWeight"
            type="number"
            inputMode="decimal"
            step="0.1"
            value={draft}
            placeholder="例: 68.5"
            onChange={(event) => setDraft(event.target.value)}
            onBlur={async () => {
              const parsed = parseNullableNumber(draft, 0, 999.9);
              if (parsed === undefined) return;
              await bodyWeightRepository.upsert(date, parsed);
              onSaved();
            }}
          />
        </div>
        <p className="muted">フォーカスアウト時に保存します。</p>
      </div>
    </section>
  );
}

function WorkoutExerciseCard({ item, onChanged }: { item: WorkoutDetail['exercises'][number]; onChanged: () => void }) {
  return (
    <article className="card">
      <div className="card-header">
        <div>
          <h3>{item.exercise.name}</h3>
          <span className="badge">
            {bodyPartLabels[item.exercise.bodyPart]} / {item.exercise.equipmentType ? equipmentTypeLabels[item.exercise.equipmentType] : '種別なし'}
          </span>
        </div>
        <button
          className="danger-button"
          onClick={async () => {
            if (!confirm('この種目カードを削除しますか？')) return;
            await workoutRepository.deleteWorkoutExercise(item.workoutExercise.id);
            onChanged();
          }}
        >
          <Trash2 size={16} aria-hidden="true" /> 削除
        </button>
      </div>
      <table className="set-table">
        <thead>
          <tr>
            <th>#</th>
            <th>重量 kg</th>
            <th>回数</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {item.sets.map((set) => (
            <SetRow key={set.id} set={set} onChanged={onChanged} />
          ))}
        </tbody>
      </table>
      <div className="card-footer">
        <button
          className="secondary-button"
          onClick={async () => {
            await workoutRepository.addSet(item.workoutExercise.id);
            onChanged();
          }}
        >
          <Plus size={16} aria-hidden="true" /> セット追加
        </button>
      </div>
    </article>
  );
}

function SetRow({ set, onChanged }: { set: WorkoutDetail['exercises'][number]['sets'][number]; onChanged: () => void }) {
  const [weight, setWeight] = useState(set.weightKg?.toString() ?? '');
  const [reps, setReps] = useState(set.reps?.toString() ?? '');

  useEffect(() => {
    setWeight(set.weightKg?.toString() ?? '');
    setReps(set.reps?.toString() ?? '');
  }, [set.id, set.weightKg, set.reps]);

  const save = async (nextWeight = weight, nextReps = reps) => {
    const weightKg = parseNullableNumber(nextWeight, 0, 999.9);
    const parsedReps = parseNullableNumber(nextReps, 1, 999);
    if (weightKg === undefined || parsedReps === undefined) return;
    await workoutRepository.updateSet(set.id, { weightKg, reps: parsedReps });
    onChanged();
  };

  const adjustWeight = async (delta: number) => {
    const currentWeight = parseNullableNumber(weight, 0, 999.9);
    if (currentWeight === undefined) return;
    const baseWeight = currentWeight ?? 0;
    const nextWeight = Math.min(999.9, Math.max(0, baseWeight + delta));
    const nextWeightText = nextWeight.toString();
    setWeight(nextWeightText);
    await save(nextWeightText);
  };

  return (
    <tr>
      <td>{set.setNumber}</td>
      <td>
        <div className="weight-input-group">
          <button
            className="weight-step-button"
            type="button"
            aria-label={`${set.setNumber}セット目の重量を2.5kg下げる`}
            onClick={() => adjustWeight(-2.5)}
          >
            -2.5
          </button>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={weight}
            placeholder={formatKg(null)}
            onChange={(event) => setWeight(event.target.value)}
            onBlur={() => save()}
          />
          <button
            className="weight-step-button"
            type="button"
            aria-label={`${set.setNumber}セット目の重量を2.5kg上げる`}
            onClick={() => adjustWeight(2.5)}
          >
            +2.5
          </button>
        </div>
      </td>
      <td>
        <input
          type="number"
          inputMode="numeric"
          value={reps}
          onChange={(event) => setReps(event.target.value)}
          onBlur={() => save()}
        />
      </td>
      <td>
        <button
          className="icon-button"
          title="セット削除"
          onClick={async () => {
            if (!confirm('このセットを削除しますか？')) return;
            await workoutRepository.deleteSet(set.id);
            onChanged();
          }}
        >
          <Trash2 size={16} />
        </button>
      </td>
    </tr>
  );
}
