import { Archive, Pencil, RotateCcw, Save, X } from 'lucide-react';
import type { FormEvent } from 'react';
import type { BodyPart, EquipmentType, Exercise } from '../../../domain/models';
import { bodyPartLabels, equipmentTypeLabels } from '../../../domain/rules';

export interface ExerciseDraft {
  id: string;
  name: string;
  bodyPart: BodyPart;
  equipmentType: EquipmentType | null;
}

export function ExerciseCard({ draft, exercise, isRecent, isUpdating, onCancelEditing, onDraftChange, onSave, onStartEditing, onVisibilityChange }: {
  draft: ExerciseDraft | null;
  exercise: Exercise;
  isRecent: boolean;
  isUpdating: boolean;
  onCancelEditing: () => void;
  onDraftChange: (draft: ExerciseDraft) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onStartEditing: (exercise: Exercise) => void;
  onVisibilityChange: (exercise: Exercise) => Promise<void>;
}) {
  if (draft) {
    return (
      <article className={`list-item exercise-list-item is-editing ${exercise.isActive ? '' : 'is-inactive'}`} data-exercise-id={exercise.id}>
        <form className="exercise-edit-form" onSubmit={onSave}>
          <div className="exercise-edit-heading">
            <div><h3>種目を編集</h3><p className="muted">種目名、部位、種別を変更できます。</p></div>
            {!exercise.isActive ? <span className="badge">非表示</span> : null}
          </div>
          <div className="grid-3">
            <div className="field">
              <label htmlFor={`exercise-name-${exercise.id}`}>種目名</label>
              <input id={`exercise-name-${exercise.id}`} maxLength={40} required value={draft.name} onChange={(event) => onDraftChange({ ...draft, name: event.target.value })} />
            </div>
            <div className="field">
              <label htmlFor={`exercise-body-part-${exercise.id}`}>部位</label>
              <select id={`exercise-body-part-${exercise.id}`} value={draft.bodyPart} onChange={(event) => onDraftChange({ ...draft, bodyPart: event.target.value as BodyPart })}>
                {Object.entries(bodyPartLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor={`exercise-equipment-${exercise.id}`}>種別</label>
              <select id={`exercise-equipment-${exercise.id}`} value={draft.equipmentType ?? ''} onChange={(event) => onDraftChange({ ...draft, equipmentType: (event.target.value || null) as EquipmentType | null })}>
                <option value="">なし</option>
                {Object.entries(equipmentTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
          </div>
          <div className="actions exercise-edit-actions">
            <button className="secondary-button" type="button" disabled={isUpdating} onClick={onCancelEditing}><X size={16} aria-hidden="true" />キャンセル</button>
            <button className="button" type="submit" disabled={isUpdating}><Save size={16} aria-hidden="true" />{isUpdating ? '保存中...' : '変更を保存'}</button>
          </div>
        </form>
      </article>
    );
  }

  return (
    <article className={`list-item exercise-list-item ${exercise.isActive ? '' : 'is-inactive'} ${isRecent ? 'is-new' : ''}`} data-exercise-id={exercise.id}>
      <div className="list-item-top">
        <div><h3>{exercise.name}</h3><p className="muted">{bodyPartLabels[exercise.bodyPart]} / {exercise.equipmentType ? equipmentTypeLabels[exercise.equipmentType] : '種別なし'}{exercise.isActive ? '' : ' / 非表示'}</p></div>
        <div className="exercise-card-actions">
          <button className="secondary-button" type="button" disabled={isUpdating} onClick={() => onStartEditing(exercise)}><Pencil size={16} aria-hidden="true" />編集</button>
          <button className={exercise.isActive ? 'danger-button' : 'secondary-button'} type="button" disabled={isUpdating} onClick={() => onVisibilityChange(exercise)}>
            {exercise.isActive ? <Archive size={16} aria-hidden="true" /> : <RotateCcw size={16} aria-hidden="true" />}{exercise.isActive ? '非表示' : '復元'}
          </button>
        </div>
      </div>
    </article>
  );
}
