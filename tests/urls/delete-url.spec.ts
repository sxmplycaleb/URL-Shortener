import { expect, test } from '@playwright/test';

import { createUser, expectDashboard, loginThroughUi, uniqueUser } from '../helpers/auth';
import { createUrlThroughUi, deleteFirstUrlThroughUi, expectVisibleText, uniqueAlias, uniqueLongUrl } from '../helpers/urls';

test.describe('URL deletion', () => {
  test('deletes a URL and keeps it removed after refresh', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('url-delete'));
    const originalUrl = uniqueLongUrl('delete');
    const alias = uniqueAlias('delete');

    await loginThroughUi(page, user);
    await expectDashboard(page);

    await createUrlThroughUi(page, { originalUrl, customAlias: alias });
    await expectVisibleText(page, originalUrl);
    await deleteFirstUrlThroughUi(page);

    await expect(page.getByText(originalUrl).filter({ visible: true })).toHaveCount(0);
    await page.reload();
    await expectDashboard(page);
    await expect(page.getByText(originalUrl).filter({ visible: true })).toHaveCount(0);
  });
});
