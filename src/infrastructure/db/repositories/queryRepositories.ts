import type { GraphQueryPort, HistoryQueryPort } from '../../../application/ports';
import { aggregateBodyWeightPoints, aggregateMaxWeightPoints } from '../../../domain/graphAggregation';
import { db } from '../database';

// 読み取り専用の集計Query。Repositoryの更新系と分け、画面用の派生データをここで組み立てる。
export const graphQuery: GraphQueryPort = {
  async maxWeight(exerciseId, range) {
    const [days, cards, sets] = await Promise.all([db.workoutDays.toArray(), db.workoutExercises.toArray(), db.workoutSets.toArray()]);
    return aggregateMaxWeightPoints(exerciseId, range, days, cards, sets);
  },
  async bodyWeight(range) {
    return aggregateBodyWeightPoints(range, await db.bodyWeightLogs.toArray());
  }
};

export const historyQuery: HistoryQueryPort = {
  async list() {
    const [days, weights, cards, sets, exercises] = await Promise.all([
      db.workoutDays.toArray(), db.bodyWeightLogs.toArray(), db.workoutExercises.toArray(), db.workoutSets.toArray(), db.exercises.toArray()
    ]);
    // 体重だけを入力した日も履歴に表示するため、workoutDaysとbodyWeightLogsの日付を統合する。
    const dates = [...new Set([...days.map((day) => day.date), ...weights.map((weight) => weight.date)])].sort((a, b) => b.localeCompare(a));
    const exerciseNames = new Map(exercises.map((exercise) => [exercise.id, exercise.name]));
    return dates.map((date) => {
      const day = days.find((item) => item.date === date);
      const dayCards = day ? cards.filter((card) => card.workoutDayId === day.id) : [];
      const cardIds = new Set(dayCards.map((card) => card.id));
      return {
        date,
        hasWorkout: Boolean(day),
        weight: weights.find((weight) => weight.date === date) ?? null,
        exerciseCount: dayCards.length,
        setCount: sets.filter((set) => cardIds.has(set.workoutExerciseId)).length,
        exerciseNames: dayCards.flatMap((card) => exerciseNames.get(card.exerciseId) ?? []).slice(0, 3)
      };
    });
  }
};
