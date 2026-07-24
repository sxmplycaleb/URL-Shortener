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

  test('persists the collapsible desktop sidebar preference', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('sidebar-collapse'));
    await establishAuthenticatedSession(page, request, user);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard');

    await page.getByRole('button', { name: 'Collapse sidebar' }).click();
    await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
    await expect(page.getByLabel('Dashboard sidebar').getByRole('link', { name: 'Analytics' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
  });

  test('closes the mobile sidebar from backdrop and after navigation', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('mobile-sidebar'));
    await establishAuthenticatedSession(page, request, user);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard');

    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await expect(page.getByRole('dialog', { name: 'Shortly' })).toBeVisible();
    await page.mouse.click(370, 420);
    await expect(page.getByRole('dialog', { name: 'Shortly' })).toBeHidden();

    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await page.getByRole('dialog', { name: 'Shortly' }).getByRole('link', { name: 'Analytics' }).click();
    await expect(page).toHaveURL(/\/analytics$/);
    await expect(page.getByRole('dialog', { name: 'Shortly' })).toBeHidden();
  });

  test('opens the profile dropdown and switches account with a preserved destination', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('profile-menu'));
    await establishAuthenticatedSession(page, request, user);

    await page.goto('/analytics');
    await page.getByRole('button', { name: 'Open profile menu' }).click();
    await expect(page.getByRole('menu', { name: 'Profile menu' })).toContainText(user.email.toLowerCase());

    await page.getByRole('menuitem', { name: 'Switch Account' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('Choose another account to continue.')).toBeVisible();
  });
});
