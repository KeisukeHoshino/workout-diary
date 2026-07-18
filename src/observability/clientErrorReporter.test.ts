import { describe, expect, it } from 'vitest';
import { buildSafeClientErrorEvent } from './clientErrorReporter';

describe('client error reporter', () => {
  it('エラーやURLからトレーニング情報を送信データへ含めない', () => {
    const event = buildSafeClientErrorEvent('error', new Error('体重70kg ベンチ100kg メモ秘密'), '/?date=2026-07-18&memo=秘密');
    const serialized = JSON.stringify(event);
    expect(serialized).not.toContain('70kg');
    expect(serialized).not.toContain('100kg');
    expect(serialized).not.toContain('秘密');
    expect(event.path).toBe('/');
  });
});
