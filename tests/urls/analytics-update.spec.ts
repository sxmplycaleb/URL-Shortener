import { expect, test } from '@playwright/test';

import { createUser, expectDashboard, loginThroughUi, uniqueUser } from '../helpers/auth';
import {
  createUrlThroughUi,
  expectVisibleText,
  listUrlsViaApi,
  loginViaApi,
  uniqueAlias,
  uniqueLongUrl,
} from '../helpers/urls';

test.describe('URL analytics updates', () => {
  test('increments click counts after visiting a short URL', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('url-analytics'));
    const accessToken = await loginViaApi(request, user);
    const originalUrl = uniqueLongUrl('analytics');
    const alias = uniqueAlias('clicks');

    await loginThroughUi(page, user);
    await expectDashboard(page);

    const createdUrl = await createUrlThroughUi(page, { originalUrl, customAlias: alias });

    await expectVisibleText(page, originalUrl);
    expect((await listUrlsViaApi(request, accessToken)).find((url) => url.shortCode === alias)?.clickCount).toBe(0);

    const redirectResponse = await request.get(createdUrl.shortUrl, {
      maxRedirects: 0,
    });
    expect(redirectResponse.status()).toBe(302);

    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Refresh' }).click();

    await expect
      .poll(async () => (await listUrlsViaApi(request, accessToken)).find((url) => url.shortCode === alias)?.clickCount)
      .toBe(1);

    await expectVisibleText(page, originalUrl);
    await expect(page.getByText(/^1( clicks)?$/).first()).toBeVisible();
  });
});
