import { expect, test } from '@playwright/test';

import { createUser, establishAuthenticatedSession, uniqueUser } from '../helpers/auth';
import { createRedirectClick, createUrlViaApi, loginViaApi, uniqueAlias, uniqueLongUrl } from '../helpers/urls';

const chromeDesktop =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const firefoxMobile =
  'Mozilla/5.0 (Android 14; Mobile; rv:126.0) Gecko/126.0 Firefox/126.0';

test.describe('analytics authenticated workflows', () => {
  test('loads summary, charts, audience analytics, and link table from live API data', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('analytics-live'));
    const accessToken = await loginViaApi(request, user);
    const originalUrl = uniqueLongUrl('analytics-live');
    const url = await createUrlViaApi(request, accessToken, {
      originalUrl,
      customAlias: uniqueAlias('analytics'),
    });
    const shortUrl = `http://127.0.0.1:5000/${url.shortCode}`;

    await createRedirectClick(request, shortUrl, chromeDesktop);
    await createRedirectClick(request, shortUrl, firefoxMobile);
    await establishAuthenticatedSession(page, request, user);

    await page.goto('/analytics');

    await expect(page).toHaveURL(/\/analytics$/);
    await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible();
    await expect(page.getByText('Total clicks', { exact: true }).first().locator('..')).toContainText('2');
    await expect(page.getByText('Total links created', { exact: true }).first().locator('..')).toContainText('1');
    await expect(page.getByText('Active links', { exact: true }).first().locator('..')).toContainText('1');
    await expect(page.getByLabel('Click activity line chart')).toBeVisible();
    await expect(page.getByLabel('Device analytics doughnut chart')).toBeVisible();
    await expect(page.getByText('Chrome')).toBeVisible();
    await expect(page.getByText('Firefox')).toBeVisible();
    await expect(page.getByText('Desktop')).toBeVisible();
    await expect(page.getByText('Mobile')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Location analytics', exact: true })).toBeVisible();
    await expect(page.getByText('Unknown').first()).toBeVisible();
    await expect(page.locator('main p, main td').filter({ hasText: shortUrl, visible: true }).first()).toBeVisible();
    await expect(page.locator('main p, main td').filter({ hasText: originalUrl, visible: true }).first()).toBeVisible();
    await expect(page.locator('main span, main td').filter({ hasText: /^active$/, visible: true }).first()).toBeVisible();
  });

  test('updates click count after another live redirect', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('analytics-update'));
    const accessToken = await loginViaApi(request, user);
    const url = await createUrlViaApi(request, accessToken, {
      customAlias: uniqueAlias('analytics-update'),
    });
    const shortUrl = `http://127.0.0.1:5000/${url.shortCode}`;

    await createRedirectClick(request, shortUrl, chromeDesktop);
    await establishAuthenticatedSession(page, request, user);
    await page.goto('/analytics');

    await expect(page.getByText('Total clicks', { exact: true }).first().locator('..')).toContainText('1');

    await createRedirectClick(request, shortUrl, firefoxMobile);
    await page.reload();

    await expect(page.getByText('Total clicks', { exact: true }).first().locator('..')).toContainText('2');
    await expect(page.getByText(/^2( clicks)?$/).first()).toBeVisible();
  });

  test('allows switching reporting periods while keeping charts rendered', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('analytics-period'));
    const accessToken = await loginViaApi(request, user);
    const url = await createUrlViaApi(request, accessToken);

    await createRedirectClick(request, `http://127.0.0.1:5000/${url.shortCode}`, chromeDesktop);
    await establishAuthenticatedSession(page, request, user);
    await page.goto('/analytics');

    await page.getByRole('button', { name: 'Last 30 days' }).click();

    await expect(page.getByRole('button', { name: 'Last 30 days' })).toHaveClass(/bg-primary/);
    await expect(page.getByLabel('Click activity line chart')).toBeVisible();
  });
});
