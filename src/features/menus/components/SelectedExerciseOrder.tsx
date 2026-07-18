import { ArrowDown, ArrowUp } from 'lucide-react';
import type { Exercise } from '../../../domain/models';

export function SelectedExerciseOrder({ exerciseIds, exercises, onMove }: {
  exerciseIds: string[];
  exercises: Exercise[];
  onMove: (index: number, direction: -1 | 1) => void;
}) {
  const selected = exerciseIds.map((id) => exercises.find((exercise) => exercise.id === id)).filter((exercise): exercise is Exercise => Boolean(exercise));
  if (!selected.length) return null;
  return (
    <div className="menu-selected-order" aria-label="メニュー内種目の並び順">
      <div className="toolbar"><div className="label">並び順</div><span className="badge">上から記録に追加</span></div>
      <ol className="menu-order-list">
        {selected.map((exercise, index) => (
          <li className="menu-order-item" key={exercise.id}>
            <span className="menu-order-number">{index + 1}</span><span className="menu-order-name">{exercise.name}</span>
            <div className="menu-order-actions" aria-label={`${exercise.name}の並び順操作`}>
              <button className="icon-button" type="button" disabled={index === 0} onClick={() => onMove(index, -1)} aria-label={`${exercise.name}を上へ移動`} title="上へ移動"><ArrowUp size={16} aria-hidden="true" /></button>
              <button className="icon-button" type="button" disabled={index === selected.length - 1} onClick={() => onMove(index, 1)} aria-label={`${exercise.name}を下へ移動`} title="下へ移動"><ArrowDown size={16} aria-hidden="true" /></button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
