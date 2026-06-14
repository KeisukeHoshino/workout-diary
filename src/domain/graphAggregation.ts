import type { BodyWeightLog, GraphRange, MaxWeightPoint, WorkoutDay, WorkoutExercise, WorkoutSet } from './models';
import { rangeStart } from './rules';

export function aggregateMaxWeightPoints(
  exerciseId: string,
  range: GraphRange,
  days: WorkoutDay[],
  workoutExercises: WorkoutExercise[],
  sets: WorkoutSet[]
): MaxWeightPoint[] {
  const from = rangeStart(range);

  return days
    .filter((day) => !from || day.date >= from)
    .map((day) => {
      const cards = workoutExercises.filter((item) => item.workoutDayId === day.id && item.exerciseId === exerciseId);
      const targetSets = sets.filter(
        (set) => cards.some((card) => card.id === set.workoutExerciseId) && set.weightKg !== null
      );
      if (!targetSets.length) return null;
      const best = targetSets.reduce((max, set) => Number(set.weightKg) > Number(max.weightKg) ? set : max);
      return {
        date: day.date,
        value: Number(best.weightKg),
        reps: best.reps
      };
    })
    .filter((point): point is MaxWeightPoint => point !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function aggregateBodyWeightPoints(range: GraphRange, logs: BodyWeightLog[]) {
  const from = rangeStart(range);
  return logs
    .filter((log) => !from || log.date >= from)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((log) => ({ date: log.date, value: log.bodyWeightKg }));
}
