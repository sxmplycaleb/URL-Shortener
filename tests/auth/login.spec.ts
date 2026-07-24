import { expect, test } from '@playwright/test';

import { createUser, expectAuthenticatedSession, expectDashboard, fillLoginForm, uniqueUser } from '../helpers/auth';

test.describe('login', () => {
  test('validates credentials before sending a login request', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: 'Continue with Email' }).click();
    const email = page.getByLabel('Email');

    await email.fill('not-an-email');
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByText('Enter a valid email address.')).toBeVisible();

    await email.fill('user@example.com');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Sign in with Password' }).click();
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page.getByText('Enter a valid email address.')).toBeHidden();
    await expect(page.getByText('Password is required.')).toBeVisible();

    await page.getByLabel('Password', { exact: true }).fill('anything');
    await expect(page.getByText('Password is required.')).toBeHidden();
  });

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
