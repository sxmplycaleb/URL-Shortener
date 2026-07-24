import { expect, test } from '@playwright/test';

import {
  createUser,
  establishAuthenticatedSession,
  expectDashboard,
  loginThroughUi,
  uniqueUser,
} from '../helpers/auth';
import { createRedirectClick, createUrlViaApi, loginViaApi, uniqueAlias, uniqueLongUrl } from '../helpers/urls';

test.describe('dashboard authenticated workflows', () => {
  test('authenticated user reaches dashboard after login and sees backend URL data', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('dashboard-login'));
    const accessToken = await loginViaApi(request, user);
    const originalUrl = uniqueLongUrl('dashboard-data');
    const url = await createUrlViaApi(request, accessToken, {
      originalUrl,
      customAlias: uniqueAlias('dash'),
    });
    const shortUrl = `http://127.0.0.1:5000/${url.shortCode}`;

    await createRedirectClick(request, shortUrl);
    await loginThroughUi(page, user);

    await expectDashboard(page);
    await expect(page.locator('main p').filter({ hasText: originalUrl, visible: true }).first()).toBeVisible();
    await expect(page.locator('main p').filter({ hasText: shortUrl, visible: true }).first()).toBeVisible();
    await expect(page.getByText('Total URLs', { exact: true }).first().locator('..')).toContainText('1');
    await expect(page.getByText('Active URLs', { exact: true }).first().locator('..')).toContainText('1');
    await expect(page.getByText('Total clicks', { exact: true }).first().locator('..')).toContainText('1');
  });

  test('shows the loading state while URLs are loading', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('dashboard-loading'));
    await establishAuthenticatedSession(page, request, user);

    await page.route('**/api/urls', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      await route.continue();
    });

    await page.goto('/dashboard');

    await expect(page.getByRole('status')).toContainText('Loading dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('shows an empty state when the user has no URLs', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('dashboard-empty'));

    await loginThroughUi(page, user);

    await expect(page.getByText('No URLs yet')).toBeVisible();
    await expect(page.getByText('0 total')).toBeVisible();
    await expect(page.getByText('Total URLs', { exact: true }).first().locator('..')).toContainText('0');
  });

  test('shows an error state when the URL API fails', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('dashboard-error'));
    await establishAuthenticatedSession(page, request, user);

    await page.route('**/api/urls', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        status: 500,
        body: JSON.stringify({ error: { message: 'Dashboard API unavailable.' } }),
      });
    });

    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Dashboard API unavailable.')).toBeVisible();
  });

  test('refreshing the browser preserves the authenticated dashboard session', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('dashboard-refresh'));

    await loginThroughUi(page, user);
    await page.reload();

    await expectDashboard(page);
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('customizes dashboard widgets and layout presets', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('dashboard-preferences'));
    await establishAuthenticatedSession(page, request, user);

    await page.goto('/settings/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard Settings' })).toBeVisible();

    await page.getByRole('switch', { name: 'Hide Create short URL' }).click();
    await page.goto('/dashboard');
    await expect(page.getByRole('button', { name: 'Generate short URL' })).toBeHidden();

    await page.goto('/settings/dashboard');
    await expect(page.getByRole('button', { name: 'Custom' })).toBeVisible();
    await page.getByRole('button', { name: 'Analytics Focus' }).click();
    await page.goto('/dashboard');

    await expect(page.getByRole('button', { name: 'Generate short URL' })).toBeVisible();
    await expect(page.getByLabel('Statistics')).toBeVisible();
    await expect(page.getByLabel('Your URLs')).toBeVisible();
  });
});
