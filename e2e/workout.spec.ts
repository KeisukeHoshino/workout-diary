import { expect, test } from '@playwright/test';

test('記録を保存し、再読み込み・履歴・バックアップまで確認する', async ({ page }) => {
  await page.goto('/?date=2026-07-18');
  await expect(page.getByRole('heading', { name: '今日の記録' })).toBeVisible();
  await page.getByRole('button', { name: '種目追加' }).click();
  await page.locator('.picker-panel .list-item').first().click();
  const setInputs = page.locator('.set-table input');
  await setInputs.nth(0).fill('60');
  await setInputs.nth(1).fill('10');
  await setInputs.nth(1).blur();
  await expect(setInputs.nth(0)).toHaveValue('60');
  await page.reload();
  await expect(page.locator('.set-table input').nth(0)).toHaveValue('60');
  await page.goto('/history');
  await expect(page.getByText('1 種目 / 1 セット')).toBeVisible();
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: '設定', exact: true })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'バックアップ', exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/^workout-diary-\d{4}-\d{2}-\d{2}\.json$/);
});
