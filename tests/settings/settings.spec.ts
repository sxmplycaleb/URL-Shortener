import { expect, test } from '@playwright/test';

import {
  createUser,
  establishAuthenticatedSession,
  expectNoAuthSession,
  fillLoginForm,
  loginThroughUi,
  uniqueUser,
} from '../helpers/auth';

test.describe('settings authenticated workflows', () => {
  test('updates profile details and shows validation errors', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('settings-profile'));
    await loginThroughUi(page, user);
    await page.goto('/settings');

    await page.getByLabel('Name').fill('');
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByRole('button', { name: 'Update profile' }).click();

    await expect(page.getByText('Name is required.')).toBeVisible();
    await expect(page.getByText('Enter a valid email address.')).toBeVisible();
    await expect(page.getByText('Fix the highlighted profile fields.')).toBeVisible();

    const nextName = `${user.name} Updated`;
    const nextEmail = `updated-${user.email}`;
    await page.getByLabel('Name').fill(nextName);
    await page.getByLabel('Email').fill(nextEmail);
    await page.getByRole('button', { name: 'Update profile' }).click();

    await expect(page.getByText('Profile settings saved.')).toBeVisible();
    await expect(page.getByText(nextName).first()).toBeVisible();
    await expect(page.getByText(nextEmail).first()).toBeVisible();
  });

  test('changes password and rejects incorrect current password', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('settings-password'));
    await establishAuthenticatedSession(page, request, user);
    await page.goto('/settings');

    await page.getByLabel('Current password').fill('WrongPass123');
    await page.getByLabel('New password').fill('NextPass123');
    await page.getByLabel('Confirm password').fill('NextPass123');
    await page.getByRole('button', { name: 'Update password' }).click();

    await expect(page.getByText('Current password is incorrect.')).toBeVisible();

    await page.getByLabel('Current password').fill(user.password);
    await page.getByLabel('New password').fill('NextPass123');
    await page.getByLabel('Confirm password').fill('Mismatch123');
    await page.getByRole('button', { name: 'Update password' }).click();

    await expect(page.getByText('Passwords do not match.')).toBeVisible();
    await expect(page.getByText('Fix the highlighted password fields.')).toBeVisible();

    await page.getByLabel('Current password').fill(user.password);
    await page.getByLabel('New password').fill('NextPass123');
    await page.getByLabel('Confirm password').fill('NextPass123');
    await page.getByRole('button', { name: 'Update password' }).click();

    await expect(page.getByText('Password updated.')).toBeVisible();

    await page.getByRole('button', { name: 'Logout' }).click();
    await page.goto('/login');
    await fillLoginForm(page, { email: user.email, password: 'NextPass123' });
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('toggles notification preference and persists it after refresh', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('settings-notifications'));
    await establishAuthenticatedSession(page, request, user);
    await page.goto('/settings');

    const notificationToggle = page.getByRole('switch', { name: 'Toggle notification preferences' });
    await expect(notificationToggle).toHaveAttribute('aria-checked', 'true');

    await notificationToggle.click();
    await expect(page.getByText('Notification preferences saved.')).toBeVisible();
    await expect(notificationToggle).toHaveAttribute('aria-checked', 'false');

    await page.reload();

    await expect(page.getByRole('switch', { name: 'Toggle notification preferences' })).toHaveAttribute('aria-checked', 'false');
  });

  test('logs out and blocks protected pages', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('settings-logout'));

    await loginThroughUi(page, user);
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Logout' }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expectNoAuthSession(page);

    await page.goto('/analytics');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('Please log in to continue.')).toBeVisible();
  });
});
