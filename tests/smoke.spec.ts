import { test, expect } from '@playwright/test';

test('desktop: 3D model, telemetry, faults and bilingual UI', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.stack??error.message));
  const response = await page.goto('/IVI/', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  expect(response?.status()).toBe(200);
  await expect(page.locator('.hero-heading h1')).toContainText('CONCEPT GT');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('.model-status')).toContainText('3D READY', { timeout: 90_000 });
  await page.getByRole('button', { name: /START ENGINE/ }).click();
  await expect(page.getByRole('button', { name: /STOP ENGINE/ })).toBeVisible();
  await page.getByRole('button', { name: 'Diagnostics' }).click();
  await page.locator('#scenario-select').selectOption('lowTire');
  await page.getByRole('button', { name: 'RUN SYSTEM SCAN' }).click();
  await expect(page.getByText('Low tire pressure detected')).toBeVisible();
  await page.locator('.lang-switch').click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('button', { name: /خاموش کردن موتور/ })).toBeVisible();
  await page.locator('.lang-switch').click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await page.screenshot({ path: 'test-results/ivi-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('mobile: touch interface, navigation, diagnostic interactions', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.stack??error.message));
  const response = await page.goto('/IVI/', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  expect(response?.status()).toBe(200);
  await expect(page.locator('.hero-heading h1')).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('.model-status')).toContainText('3D READY', { timeout: 90_000 });
  await page.locator('.hamburger').click();
  await expect(page.locator('.sidebar')).toHaveClass(/open/);
  await page.getByRole('button', { name: 'Diagnostics' }).click();
  await expect(page.locator('.sidebar')).not.toHaveClass(/open/);
  await page.locator('#scenario-select').selectOption('wornBrakes');
  await page.getByRole('button', { name: 'RUN SYSTEM SCAN' }).click();
  await expect(page.getByText('Brake pad replacement indicated')).toBeVisible();
  await page.screenshot({ path: 'test-results/ivi-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
  await context.close();
});
