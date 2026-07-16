import { expect, test } from '@playwright/test';

import { createUser, expectNoAuthSession, loginThroughUi, logoutThroughUi, uniqueUser } from '../helpers/auth';

test.describe('logout', () => {
  test('clears the browser session and blocks protected pages', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('logout'));

    await loginThroughUi(page, user);
    await logoutThroughUi(page);

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expectNoAuthSession(page);

    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('Please log in to continue.')).toBeVisible();
  });
});
