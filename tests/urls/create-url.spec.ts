import { expect, test } from '@playwright/test';

import { createUser, expectDashboard, loginThroughUi, uniqueUser } from '../helpers/auth';
import { createUrlThroughUi, expectVisibleText, uniqueAlias, uniqueLongUrl } from '../helpers/urls';

test.describe('URL creation', () => {
  test('creates a shortened URL and displays it on the dashboard', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('url-create'));
    const originalUrl = uniqueLongUrl('create');
    const alias = uniqueAlias('create');

    await loginThroughUi(page, user);
    await expectDashboard(page);

    const createdUrl = await createUrlThroughUi(page, { originalUrl, customAlias: alias });

    await expect(page.getByRole('status')).toContainText('Created');
    await expectVisibleText(page, createdUrl.shortUrl);
    await expectVisibleText(page, originalUrl);
    await expectVisibleText(page, alias);
    expect(createdUrl.shortCode).toBe(alias);
    expect(createdUrl.shortUrl).toMatch(/^https?:\/\/[^/\s]+\/[A-Za-z0-9_-]+$/);
  });
});
