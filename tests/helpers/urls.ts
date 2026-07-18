import { expect, type APIRequestContext, type Page } from '@playwright/test';

import type { TestUser } from './auth';

interface AuthResponse {
  accessToken: string;
}

interface ShortenedUrl {
  id: string;
  originalUrl: string;
  shortCode: string;
  clickCount: number;
}

interface UrlResponse {
  url: ShortenedUrl;
}

interface UrlListResponse {
  urls: ShortenedUrl[];
}

export function uniqueAlias(prefix = 'pw') {
  const id = crypto.randomUUID().replaceAll('-', '').slice(0, 10);
  return `${prefix}-${Date.now().toString(36)}-${id}`.toLowerCase().slice(0, 32);
}

export function uniqueLongUrl(prefix = 'url') {
  return `https://example.com/${prefix}/${Date.now()}-${crypto.randomUUID()}?source=playwright`;
}

export async function loginViaApi(request: APIRequestContext, user: Pick<TestUser, 'email' | 'password'>) {
  const response = await request.post('/api/auth/login', {
    data: {
      email: user.email,
      password: user.password,
    },
  });

  expect(response.ok()).toBeTruthy();
  return ((await response.json()) as AuthResponse).accessToken;
}

export async function createUrlViaApi(
  request: APIRequestContext,
  accessToken: string,
  options: { originalUrl?: string; customAlias?: string } = {},
) {
  const originalUrl = options.originalUrl ?? uniqueLongUrl('api');
  const response = await request.post('/api/urls', {
    data: {
      originalUrl,
      ...(options.customAlias ? { customAlias: options.customAlias } : {}),
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  expect(response.ok()).toBeTruthy();
  return ((await response.json()) as UrlResponse).url;
}

export async function createRedirectClick(request: APIRequestContext, shortUrl: string, userAgent?: string) {
  const response = await request.get(shortUrl, {
    headers: userAgent ? { 'User-Agent': userAgent } : undefined,
    maxRedirects: 0,
  });

  expect(response.status()).toBe(302);
}

export async function listUrlsViaApi(request: APIRequestContext, accessToken: string) {
  const response = await request.get('/api/urls', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  expect(response.ok()).toBeTruthy();
  return ((await response.json()) as UrlListResponse).urls;
}

export async function createUrlThroughUi(
  page: Page,
  options: { originalUrl?: string; customAlias?: string } = {},
) {
  const originalUrl = options.originalUrl ?? uniqueLongUrl('ui');

  await page.getByLabel('Long URL').fill(originalUrl);

  if (options.customAlias) {
    await page.getByLabel('Custom alias').fill(options.customAlias);
  }

  await page.getByRole('button', { name: 'Generate short URL' }).click();
  await expectCreatedToast(page);
  await expectVisibleText(page, originalUrl);

  const message = (await page.getByRole('status').textContent()) ?? '';
  const shortUrl = message.replace(/^Created\s+/, '').trim();

  expect(shortUrl).toMatch(/^https?:\/\/[^/\s]+\/[A-Za-z0-9_-]+$/);
  await expectVisibleText(page, shortUrl);

  return {
    originalUrl,
    shortUrl,
    shortCode: new URL(shortUrl).pathname.slice(1),
  };
}

export async function deleteFirstUrlThroughUi(page: Page) {
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Delete');
    await dialog.accept();
  });

  await page.getByRole('button', { name: 'Delete URL' }).first().click();
  await expectToast(page, 'Short URL deleted.');
}

export async function expectCreatedToast(page: Page) {
  await expect(page.getByRole('status')).toContainText(/^Created https?:\/\//);
}

export async function expectToast(page: Page, message: string | RegExp) {
  await expect(page.getByRole('status')).toContainText(message);
}

export async function expectVisibleText(page: Page, text: string | RegExp) {
  await expect(page.locator('p').filter({ hasText: text, visible: true }).first()).toBeVisible();
}
