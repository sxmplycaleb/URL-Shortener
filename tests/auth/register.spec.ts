import { expect, test } from '@playwright/test';

import { expectAuthenticatedSession, expectDashboard, fillRegistrationForm, uniqueUser } from '../helpers/auth';

test.describe('registration', () => {
  test('creates a new account and redirects to the dashboard', async ({ page }) => {
    const user = uniqueUser('register');

    await page.goto('/register');

    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole('heading', { name: 'Create your workspace' })).toBeVisible();

    await fillRegistrationForm(page, user);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expectDashboard(page);
    await expectAuthenticatedSession(page, user);
  });
});
