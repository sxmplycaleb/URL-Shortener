import { expect, test } from '@playwright/test';

import { createUser, establishAuthenticatedSession, uniqueUser } from '../helpers/auth';
import { createUrlViaApi, loginViaApi, uniqueAlias, uniqueLongUrl } from '../helpers/urls';

test.describe('advanced URL management', () => {
  test('searches, sorts, filters, favorites, archives, shares, generates QR, and uses bulk actions', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('advanced-management'));
    const accessToken = await loginViaApi(request, user);
    const alpha = await createUrlViaApi(request, accessToken, {
      originalUrl: uniqueLongUrl('alpha-search'),
      customAlias: uniqueAlias('alpha'),
    });
    const beta = await createUrlViaApi(request, accessToken, {
      originalUrl: uniqueLongUrl('beta-search'),
      customAlias: uniqueAlias('beta'),
    });

    await establishAuthenticatedSession(page, request, user);
    await page.goto('/dashboard');

    await page.getByLabel('Search URLs').fill('alpha-search');
    await expect(page.getByText(alpha.originalUrl).first()).toBeVisible();
    await expect(page.getByText(beta.originalUrl).first()).toBeHidden();
    await expect(page.locator('mark').filter({ hasText: 'alpha-search' }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Clear search' }).click();
    await page.getByLabel('Sort URLs').selectOption('az');
    await page.getByRole('button', { name: 'Favorite URL' }).first().click();
    await expect(page.getByRole('status')).toContainText('Added to favorites.');

    await page.getByRole('button', { name: 'Favorites' }).click();
    await expect(page.getByText('Favorite').first()).toBeVisible();
    await page.getByRole('button', { name: 'Archive URL' }).first().click();
    await page.getByRole('dialog', { name: 'Archive URLs?' }).getByRole('button', { name: 'Archive' }).click();
    await expect(page.getByRole('status')).toContainText('Archived!');

    await page.getByRole('button', { name: 'Archived' }).click();
    await expect(page.getByText('Archived').first()).toBeVisible();
    await page.getByRole('button', { name: /Preview QR|Generate QR Code/ }).first().click();
    await expect(page.getByRole('dialog', { name: 'QR Code' })).toBeVisible();
    await page.getByRole('button', { name: 'Close dialog' }).click();

    await page.getByRole('button', { name: 'Share URL' }).first().click();
    await page.getByRole('menuitem', { name: 'Copy Link' }).click();
    await expect(page.getByRole('status')).toContainText('Share copied!');

    await page.getByRole('button', { name: 'Reset' }).click();
    await page.getByRole('button', { name: 'Select All' }).click();
    await expect(page.locator('span').filter({ hasText: '2 selected' })).toBeVisible();
    await page.getByRole('button', { name: 'Clear Selection' }).click();
    await expect(page.locator('span').filter({ hasText: '0 selected' })).toBeVisible();
  });
});
