import { expect, test, type Locator } from '@playwright/test';

import { createUser, establishAuthenticatedSession, uniqueUser } from '../helpers/auth';

async function expectFocused(locator: Locator) {
  await expect(locator).toBeFocused();
  const hasVisibleFocus = await locator.evaluate((element) => {
    const styles = window.getComputedStyle(element);
    return styles.outlineStyle !== 'none' || styles.boxShadow !== 'none';
  });
  expect(hasVisibleFocus).toBe(true);
}

test.describe('final validation accessibility', () => {
  test('supports keyboard-only navigation and visible focus indicators on authenticated pages', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('a11y-keyboard'));
    await establishAuthenticatedSession(page, request, user);

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await page.keyboard.press('Tab');
    await expectFocused(page.getByRole('link', { name: 'Skip to content' }));

    await page.keyboard.press('Tab');
    await expectFocused(page.getByRole('link', { name: 'Shortly' }).first());

    const links = page.getByRole('link');
    const linkCount = await links.count();
    for (let index = 0; index < linkCount; index += 1) {
      await expect(links.nth(index)).toHaveAccessibleName(/.+/);
    }

    const buttons = page.getByRole('button');
    const buttonCount = await buttons.count();
    for (let index = 0; index < buttonCount; index += 1) {
      await expect(buttons.nth(index)).toHaveAccessibleName(/.+/);
    }
  });

  test('exposes form labels and validation state to assistive technology', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('a11y-forms'));
    await establishAuthenticatedSession(page, request, user);

    await page.goto('/settings');

    await expect(page.getByLabel('Name')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Current password')).toBeVisible();
    await expect(page.getByLabel('New password')).toBeVisible();
    await expect(page.getByLabel('Confirm password')).toBeVisible();
    await expect(page.getByRole('switch', { name: 'Toggle notification preferences' })).toBeVisible();

    await page.getByLabel('Email').fill('bad-email');
    await page.getByRole('button', { name: 'Update profile' }).click();

    await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel('Email')).toHaveAttribute('aria-describedby', 'settings-email-error');
    await expect(page.locator('#settings-email-error')).toHaveText('Enter a valid email address.');
  });

  test('keeps the mobile navigation dialog keyboard accessible and closes it with Escape', async ({ page, request }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const user = await createUser(request, uniqueUser('a11y-dialog'));
    await establishAuthenticatedSession(page, request, user);

    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Open navigation menu' }).click();

    const dialog = page.getByRole('dialog', { name: 'Shortly' });
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close navigation menu' })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('link', { name: 'Dashboard' })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeFocused();
  });
});
