import { expect, test } from '@playwright/test';

import { createUser, loginForSession, loginThroughUi, uniqueUser } from '../helpers/auth';

test.describe('security center', () => {
  test('lists security activity and revokes another session', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('security'));
    await loginForSession(request, user);
    await loginThroughUi(page, user);

    await page.goto('/security');

    await expect(page.getByRole('heading', { name: 'Security Center' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Active Sessions' })).toBeVisible();
    await expect(page.getByText('Current Session')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Login History' })).toBeVisible();
    await expect(page.getByText('Email/Password').first()).toBeVisible();
    await expect(page.getByRole('switch', { name: 'Toggle Email OTP' })).toBeVisible();
    await expect(page.getByText('Google account')).toBeVisible();

    await page.getByRole('button', { name: 'Revoke other sessions' }).click();
    await expect(page.getByText(/other session[s]? revoked/)).toBeVisible();
  });
});
