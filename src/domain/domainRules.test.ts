import { describe, expect, it } from 'vitest';
import { aggregateMaxWeightPoints } from './graphAggregation';
import type { WorkoutDay, WorkoutExercise, WorkoutSet } from './models';
import { parseNullableNumber, validateName } from './validation';

const timestamp = '2026-01-01T00:00:00.000Z';

describe('domain rules', () => {
  it('同一日の最大重量だけを集計する', () => {
    const days = [{ id: 'day', date: '2026-01-01', memo: '', createdAt: timestamp, updatedAt: timestamp }] as WorkoutDay[];
    const cards = [{ id: 'card', workoutDayId: 'day', exerciseId: 'bench', sortOrder: 10, memo: '', createdAt: timestamp, updatedAt: timestamp }] as WorkoutExercise[];
    const sets = [40, 60, 50].map((weightKg, index) => ({ id: `set-${index}`, workoutExerciseId: 'card', setNumber: index + 1, weightKg, reps: 10, createdAt: timestamp, updatedAt: timestamp })) as WorkoutSet[];
    expect(aggregateMaxWeightPoints('bench', 'all', days, cards, sets)).toEqual([{ date: '2026-01-01', value: 60, reps: 10 }]);
  });

  it('数値範囲と名前を検証する', () => {
    expect(parseNullableNumber('', 0, 500)).toBeNull();
    expect(parseNullableNumber('501', 0, 500)).toBeUndefined();
    expect(parseNullableNumber('42.5', 0, 500)).toBe(42.5);
    expect(validateName('  ベンチプレス  ')).toBe('ベンチプレス');
    expect(validateName('')).toBeNull();
  });
});
