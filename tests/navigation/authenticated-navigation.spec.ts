import { expect, test, type Page } from '@playwright/test';

import { createUser, establishAuthenticatedSession, uniqueUser } from '../helpers/auth';

async function clickDashboardNav(page: Page, name: 'Dashboard' | 'Analytics' | 'Settings') {
  const desktopLink = page.getByLabel('Main navigation').getByRole('link', { name });

  if (await desktopLink.isVisible()) {
    await desktopLink.click();
    return;
  }

  await page.getByRole('button', { name: 'Open navigation menu' }).click();
  await page.getByRole('dialog').getByRole('link', { name }).click();
}

test.describe('authenticated navigation', () => {
  test('moves between dashboard, analytics, settings, and respects browser history', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('navigation'));
    await establishAuthenticatedSession(page, request, user);

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    await clickDashboardNav(page, 'Analytics');
    await expect(page).toHaveURL(/\/analytics$/);
    await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible();

    await clickDashboardNav(page, 'Settings');
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();

    await clickDashboardNav(page, 'Dashboard');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/analytics$/);
    await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible();

    await page.goForward();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();

    await page.goForward();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });
});
