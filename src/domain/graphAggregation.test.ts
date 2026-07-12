import { describe, expect, it } from 'vitest';
import { aggregateMaxWeightPoints } from './graphAggregation';
import type { WorkoutDay, WorkoutExercise, WorkoutSet } from './models';

const timestamp = '2026-01-01T00:00:00.000Z';

describe('aggregateMaxWeightPoints', () => {
  it('uses the maximum completed weight for each day', () => {
    const days = [{ id: 'day', date: '2026-01-01', memo: '', createdAt: timestamp, updatedAt: timestamp }] as WorkoutDay[];
    const exercises = [{ id: 'card', workoutDayId: 'day', exerciseId: 'bench', sortOrder: 10, memo: '', createdAt: timestamp, updatedAt: timestamp }] as WorkoutExercise[];
    const sets = [40, 50, null].map((weightKg, index) => ({
      id: `set-${index}`, workoutExerciseId: 'card', setNumber: index + 1, weightKg, reps: weightKg === null ? null : 10,
      createdAt: timestamp, updatedAt: timestamp
    })) as WorkoutSet[];
    expect(aggregateMaxWeightPoints('bench', 'all', days, exercises, sets)).toEqual([{ date: '2026-01-01', value: 50, reps: 10 }]);
  });
});
