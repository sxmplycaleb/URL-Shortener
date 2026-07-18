import { expect, test, type Page, type Route } from '@playwright/test';

import {
  AUTH_SESSION_KEY,
  createUser,
  establishAuthenticatedSession,
  expectNoAuthSession,
  fillLoginForm,
  uniqueUser,
} from '../helpers/auth';
import { uniqueAlias, uniqueLongUrl } from '../helpers/urls';

async function routeJson(route: Route, status: number, message: string) {
  await route.fulfill({
    contentType: 'application/json',
    status,
    body: JSON.stringify({ error: { message } }),
  });
}

async function expectDashboardError(page: Page, message: string | RegExp, options: { timeout?: number } = {}) {
  await page.goto('/dashboard');
  await expect(page.getByText(message)).toBeVisible({ timeout: options.timeout });
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}

test.describe('final validation error handling', () => {
  test('redirects to login and clears storage when an expired session cannot refresh', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('expired-session'));
    await establishAuthenticatedSession(page, request, user);

    await page.evaluate((key) => {
      const session = JSON.parse(window.sessionStorage.getItem(key) ?? '{}');
      window.sessionStorage.setItem(key, JSON.stringify({ ...session, accessToken: 'expired.jwt.token' }));
    }, AUTH_SESSION_KEY);
    await page.route('**/api/auth/refresh', (route) => routeJson(route, 401, 'Refresh token expired.'));

    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('Your session expired. Please log in again.')).toBeVisible();
    await expectNoAuthSession(page);
  });

  test('handles 403 forbidden responses by ending the authenticated session', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('forbidden'));
    await establishAuthenticatedSession(page, request, user);
    await page.route('**/api/urls', (route) => routeJson(route, 403, 'Forbidden.'));

    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('Your session expired. Please log in again.')).toBeVisible();
    await expectNoAuthSession(page);
  });

  test('surfaces 404 and 500 API failures without leaving the page', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('not-found'));
    await establishAuthenticatedSession(page, request, user);
    await page.route('**/api/urls', (route) => routeJson(route, 404, 'URLs endpoint was not found.'));

    await expectDashboardError(page, 'URLs endpoint was not found.');

    await page.unroute('**/api/urls');
    await page.route('**/api/urls', (route) => routeJson(route, 500, 'Dashboard API unavailable.'));
    await expectDashboardError(page, 'Dashboard API unavailable.');
  });

  test('surfaces 409 conflict and 429 rate-limit errors while creating a URL', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('conflict-rate-limit'));
    await establishAuthenticatedSession(page, request, user);
    await page.route('**/api/urls', async (route) => {
      if (route.request().method() === 'GET') {
        await route.continue();
        return;
      }

      await routeJson(route, 409, 'That custom alias is already in use.');
    });

    await page.goto('/dashboard');
    await page.getByLabel('Long URL').fill(uniqueLongUrl('conflict'));
    await page.getByLabel('Custom alias').fill(uniqueAlias('conflict'));
    await page.getByRole('button', { name: 'Generate short URL' }).click();
    await expect(page.getByText('That custom alias is already in use.')).toBeVisible();

    await page.unroute('**/api/urls');
    await page.route('**/api/urls', async (route) => {
      if (route.request().method() === 'GET') {
        await route.continue();
        return;
      }

      await routeJson(route, 429, 'Too many requests. Please try again later.');
    });

    await page.getByLabel('Long URL').fill(uniqueLongUrl('rate-limit'));
    await page.getByLabel('Custom alias').fill(uniqueAlias('rate'));
    await page.getByRole('button', { name: 'Generate short URL' }).click();
    await expect(page.getByText('Too many requests. Please try again later.')).toBeVisible();
  });

  test('handles offline/network failure and invalid API responses', async ({ page, request }) => {
    const user = await createUser(request, uniqueUser('network-invalid'));
    await establishAuthenticatedSession(page, request, user);
    await page.route('**/api/urls', (route) => route.abort('internetdisconnected'));

    await expectDashboardError(page, 'Unable to reach the URL service. Please try again.');

    await page.unroute('**/api/urls');
    await page.route('**/api/urls', (route) =>
      route.fulfill({
        contentType: 'text/plain',
        status: 200,
        body: 'not json',
      }),
    );

    await expectDashboardError(page, 'Invalid response from server.');
  });

  test('shows API timeout feedback when the URL service does not answer', async ({ page, request }) => {
    test.setTimeout(25_000);
    const user = await createUser(request, uniqueUser('timeout'));
    await establishAuthenticatedSession(page, request, user);
    await page.route('**/api/urls', () => undefined);

    await expectDashboardError(page, 'The request timed out. Please try again.', { timeout: 15_000 });
  });

  test('surfaces unauthenticated login failures', async ({ page }) => {
    await page.route('**/api/auth/login', (route) => routeJson(route, 401, 'Invalid email or password.'));

    await page.goto('/login');
    await fillLoginForm(page, { email: 'nobody@example.com', password: 'WrongPass123' });
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('Invalid email or password.')).toBeVisible();
  });
});
