import { expect, test } from '@playwright/test';

import { createUser, expectAuthenticatedSession, expectDashboard, fillLoginForm, uniqueUser } from '../helpers/auth';

test.describe('login', () => {
  test('authenticates an existing account and allows protected route access', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('login'));

    await page.goto('/login');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

    await fillLoginForm(page, user);
    await page.getByRole('button', { name: 'Log in' }).click();

    await expectDashboard(page);
    await expectAuthenticatedSession(page, user);

    await page.goto('/settings');

    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Update profile' })).toBeVisible();
  });
});
