import { expect, test } from '@playwright/test';

import { expectAuthenticatedSession, expectDashboard, fillRegistrationForm, uniqueUser } from '../helpers/auth';

test.describe('registration', () => {
  test('validates fields before creating an account', async ({ page }) => {
    await page.goto('/register');

    const name = page.getByLabel('Name');
    const email = page.getByLabel('Email');
    const password = page.getByLabel('Password', { exact: true });
    const confirmPassword = page.getByLabel('Confirm password');

    await name.fill('A');
    await email.fill('person@mailinator.com');
    await password.fill('password');
    await confirmPassword.fill('different');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('Name must be at least 2 characters.')).toBeVisible();
    await expect(page.getByText('Use a permanent email address.')).toBeVisible();
    await expect(page.getByText('Password must include at least one uppercase letter.')).toBeVisible();
    await expect(page.getByText('Passwords do not match.')).toBeVisible();

    await name.fill('Caleb Ongau');
    await email.fill('caleb@example.com');
    await password.fill('ValidPass123!');
    await confirmPassword.fill('ValidPass123!');

    await expect(page.getByText('Name must be at least 2 characters.')).toBeHidden();
    await expect(page.getByText('Use a permanent email address.')).toBeHidden();
    await expect(page.getByText('Password must include at least one uppercase letter.')).toBeHidden();
    await expect(page.getByText('Passwords do not match.')).toBeHidden();
  });

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
