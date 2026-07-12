import { expect, test } from '@playwright/test';

test('main routes start successfully', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/');
  await expect(page.getByRole('heading', { name: '今日の記録' })).toBeVisible();
  await page.goto('http://127.0.0.1:5173/settings');
  await expect(page.getByRole('heading', { name: '設定', exact: true })).toBeVisible();
});
