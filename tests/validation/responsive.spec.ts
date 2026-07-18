import { expect, test, type Page } from '@playwright/test';

import { createUser, establishAuthenticatedSession, uniqueUser } from '../helpers/auth';
import { createUrlViaApi, loginViaApi, uniqueAlias, uniqueLongUrl } from '../helpers/urls';

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    )
    .toBeLessThanOrEqual(1);
}

async function navigate(page: Page, name: 'Dashboard' | 'Analytics' | 'Settings') {
  const desktopLink = page.getByLabel('Main navigation').getByRole('link', { name });

  if (await desktopLink.isVisible()) {
    await desktopLink.click();
    return;
  }

  await page.getByRole('button', { name: 'Open navigation menu' }).click();
  await page.getByRole('dialog').getByRole('link', { name }).click();
}

test.describe('final validation responsive layouts', () => {
  for (const viewport of viewports) {
    test(`keeps navigation, forms, tables, and charts usable on ${viewport.name}`, async ({ page, request }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const user = await createUser(request, uniqueUser(`responsive-${viewport.name}`));
      const accessToken = await loginViaApi(request, user);
      const originalUrl = uniqueLongUrl(`responsive-${viewport.name}`);

      await createUrlViaApi(request, accessToken, {
        originalUrl,
        customAlias: uniqueAlias(`r-${viewport.name}`),
      });
      await establishAuthenticatedSession(page, request, user);

      await page.goto('/dashboard');
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
      await expect(page.getByLabel('Long URL')).toBeVisible();
      await expect(page.locator('main p, main td').filter({ hasText: originalUrl, visible: true }).first()).toBeVisible();
      await expectNoHorizontalOverflow(page);

      await navigate(page, 'Analytics');
      await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Last 30 days' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Link performance' })).toBeVisible();
      await expectNoHorizontalOverflow(page);

      await navigate(page, 'Settings');
      await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
      await expect(page.getByLabel('Name')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Update profile' })).toBeVisible();
      await expectNoHorizontalOverflow(page);

      await navigate(page, 'Dashboard');
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(page.getByRole('button', { name: 'Generate short URL' })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  }
});
