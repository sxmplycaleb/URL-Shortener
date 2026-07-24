import { expect, test } from '@playwright/test';

import { AUTH_SESSION_KEY } from '../helpers/auth';

test.describe('Sprint 5 footer, UX, and accessibility', () => {
  test('renders the redesigned footer with social, contact, and legal links', async ({ page }) => {
    await page.goto('/');

    const footer = page.getByRole('contentinfo');
    await expect(footer.getByRole('heading', { name: 'Product' })).toBeVisible();
    await expect(footer.getByRole('heading', { name: 'Resources' })).toBeVisible();
    await expect(footer.getByRole('heading', { name: 'Contact' })).toBeVisible();
    await expect(footer.getByRole('heading', { name: 'Follow Us' })).toBeVisible();
    await expect(footer.getByText('+254790321533')).toBeVisible();
    await expect(footer.getByRole('link', { name: 'WhatsApp', exact: true })).toHaveAttribute('target', '_blank');
    await expect(footer.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
    await expect(footer.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms');
    await expect(footer.getByRole('link', { name: 'Cookie Policy' })).toHaveAttribute('href', '/cookies');

    for (const social of ['GitHub', 'LinkedIn', 'TikTok', 'X', 'Facebook', 'Instagram', 'WhatsApp']) {
      await expect(footer.getByRole('link', { name: `Follow Shortly on ${social}` })).toHaveAttribute('target', '_blank');
    }
  });

  test('serves responsive legal pages with table of contents and last updated dates', async ({ page }) => {
    for (const [path, heading] of [
      ['/privacy', 'Privacy Policy'],
      ['/terms', 'Terms of Service'],
      ['/cookies', 'Cookie Policy'],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
      await expect(page.getByText('Last Updated: July 24, 2026')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Table of Contents' })).toBeVisible();
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });

  test('opens command palette, supports fuzzy search, keyboard navigation, shortcuts help, and Escape close', async ({ page }) => {
    await establishClientOnlySession(page);
    await page.goto('/settings/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard Settings' })).toBeVisible();
    await page.keyboard.press('Control+K');
    await expect(page.getByRole('dialog', { name: 'Command Palette' })).toBeVisible();

    await page.getByRole('combobox', { name: 'Search commands' }).fill('prof');
    await expect(page.locator('#command-settings')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();

    await page.keyboard.press('Shift+/');
    await expect(page.getByRole('dialog', { name: 'Keyboard Shortcuts' })).toBeVisible();
    await expect(page.getByText('Ctrl+K')).toBeVisible();
    await expect(page.getByText('Ctrl+A')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Keyboard Shortcuts' })).toBeHidden();
  });

  test('shows dashboard settings milestone sections', async ({ page }) => {
    await establishClientOnlySession(page);
    await page.goto('/settings/dashboard');

    await expect(page.getByRole('heading', { name: 'Keyboard Shortcuts' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Accessibility Preferences' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Legal Links' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'About Application' })).toBeVisible();
    await expect(page.getByText('Version: v0.1.0')).toBeVisible();
    await expect(page.locator('#main-content').getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
  });

  test('reveals Back to Top after scrolling and returns to the top', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 640 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Shortly' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Back to top' })).toHaveCount(0);

    await page.mouse.wheel(0, 1000);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(120);
    await expect(page.getByRole('button', { name: 'Back to top' })).toBeVisible();
    await page.getByRole('button', { name: 'Back to top' }).click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(20);
  });
});

async function establishClientOnlySession(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate((key) => {
    window.sessionStorage.setItem(
      key,
      JSON.stringify({
        accessToken: 'client-only-token',
        user: {
          id: 'client-only-user',
          name: 'Playwright Settings',
          email: 'playwright-settings@example.com',
          role: 'user',
          isVerified: true,
          accountSettings: { notificationsEnabled: true },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    );
  }, AUTH_SESSION_KEY);
}
