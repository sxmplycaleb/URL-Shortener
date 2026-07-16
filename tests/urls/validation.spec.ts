import { expect, test } from '@playwright/test';

import { createUser, expectDashboard, loginThroughUi, uniqueUser } from '../helpers/auth';
import { createUrlViaApi, loginViaApi, uniqueAlias, uniqueLongUrl } from '../helpers/urls';

test.describe('URL validation', () => {
  test('requires a long URL before submitting', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('url-validation-empty'));

    await loginThroughUi(page, user);
    await expectDashboard(page);
    await page.getByRole('button', { name: 'Generate short URL' }).click();

    await expect(page.getByText('Long URL is required.')).toBeVisible();
  });

  test('rejects invalid URL formats', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('url-validation-invalid'));

    await loginThroughUi(page, user);
    await page.getByLabel('Long URL').fill('not-a-url');
    await page.getByRole('button', { name: 'Generate short URL' }).click();

    await expect(page.getByText('Enter a valid http or https URL.')).toBeVisible();
  });

  test('rejects duplicate custom aliases', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('url-validation-duplicate'));
    const accessToken = await loginViaApi(request, user);
    const alias = uniqueAlias('dupe');

    await createUrlViaApi(request, accessToken, {
      originalUrl: uniqueLongUrl('duplicate-existing'),
      customAlias: alias,
    });

    await loginThroughUi(page, user);
    await page.getByLabel('Long URL').fill(uniqueLongUrl('duplicate-new'));
    await page.getByLabel('Custom alias').fill(alias);
    await page.getByRole('button', { name: 'Generate short URL' }).click();

    await expect(page.getByText('That custom alias is already in use.')).toBeVisible();
  });

  test('rejects aliases that are too short', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('url-validation-short'));

    await loginThroughUi(page, user);
    await page.getByLabel('Long URL').fill(uniqueLongUrl('alias-short'));
    await page.getByLabel('Custom alias').fill('ab');
    await page.getByRole('button', { name: 'Generate short URL' }).click();

    await expect(page.getByText(/Use 3-64 letters, numbers, underscores, or hyphens/)).toBeVisible();
  });

  test('rejects aliases that are too long for generated short codes', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('url-validation-long'));

    await loginThroughUi(page, user);
    await page.getByLabel('Long URL').fill(uniqueLongUrl('alias-long'));
    await page.getByLabel('Custom alias').fill('a'.repeat(33));
    await page.getByRole('button', { name: 'Generate short URL' }).click();

    await expect(page.getByText('Validation failed. Short code cannot exceed 32 characters.')).toBeVisible();
  });

  test('rejects reserved aliases', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('url-validation-reserved'));

    await loginThroughUi(page, user);
    await page.getByLabel('Long URL').fill(uniqueLongUrl('reserved-alias'));
    await page.getByLabel('Custom alias').fill('admin');
    await page.getByRole('button', { name: 'Generate short URL' }).click();

    await expect(page.getByText(/avoid reserved aliases/)).toBeVisible();
  });

  test('surfaces backend validation errors', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('url-validation-backend'));
    const oversizedUrl = `https://example.com/${'a'.repeat(2050)}`;

    await loginThroughUi(page, user);
    await page.getByLabel('Long URL').fill(oversizedUrl);
    await page.getByRole('button', { name: 'Generate short URL' }).click();

    await expect(page.getByText('originalUrl must be a valid http or https URL.')).toBeVisible();
  });
});
