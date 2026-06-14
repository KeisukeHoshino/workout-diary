import type { BodyPart, EquipmentType, GraphRange, LocalDateString } from './models';

export const bodyPartLabels: Record<BodyPart, string> = {
  chest: '胸',
  back: '背中',
  legs: '脚',
  shoulders: '肩',
  arms: '腕',
  abs: '腹',
  cardio: '有酸素',
  other: 'その他'
};

export const equipmentTypeLabels: Record<EquipmentType, string> = {
  barbell: 'バーベル',
  dumbbell: 'ダンベル',
  machine: 'マシン',
  cable: 'ケーブル',
  bodyweight: '自重',
  other: 'その他'
};

export const graphRangeLabels: Record<GraphRange, string> = {
  '1m': '1か月',
  '3m': '3か月',
  '6m': '6か月',
  all: '全期間'
};

export function localDate(date = new Date()): LocalDateString {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10) as LocalDateString;
}

export function addDays(dateString: LocalDateString, delta: number): LocalDateString {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + delta);
  return localDate(date);
}

export function dateLabel(dateString: LocalDateString): string {
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  }).format(new Date(`${dateString}T00:00:00`));
}

export function formatKg(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return `${value.toLocaleString('ja-JP', { maximumFractionDigits: 1 })}kg`;
}

export function uuid(): string {
  return crypto.randomUUID();
}

export function rangeStart(range: GraphRange): LocalDateString | null {
  if (range === 'all') return null;
  const months = range === '1m' ? 1 : range === '3m' ? 3 : 6;
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return localDate(date);
}
