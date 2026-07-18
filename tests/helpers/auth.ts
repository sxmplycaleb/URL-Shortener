import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const AUTH_SESSION_KEY = 'shortly.auth';
export const TEST_PASSWORD = 'TestPass123';

export interface TestUser {
  name: string;
  email: string;
  password: string;
}

interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    isVerified: boolean;
    accountSettings?: {
      notificationsEnabled: boolean;
    };
    createdAt: string;
    updatedAt: string;
  };
  accessToken: string;
}

export function uniqueUser(prefix = 'auth'): TestUser {
  const id = `${Date.now()}-${crypto.randomUUID()}`;

  return {
    name: `Playwright ${prefix}`,
    email: `playwright-${prefix}-${id}@example.com`,
    password: TEST_PASSWORD,
  };
}

export async function createUser(request: APIRequestContext, user = uniqueUser()) {
  const response = await request.post('/api/auth/register', {
    data: {
      name: user.name,
      email: user.email,
      password: user.password,
    },
  });

  expect(response.ok()).toBeTruthy();

  return user;
}

export async function loginForSession(request: APIRequestContext, user: Pick<TestUser, 'email' | 'password'>) {
  const response = await request.post('/api/auth/login', {
    data: {
      email: user.email,
      password: user.password,
    },
  });

  expect(response.ok()).toBeTruthy();
  return (await response.json()) as AuthResponse;
}

export async function establishAuthenticatedSession(
  page: Page,
  request: APIRequestContext,
  user: Pick<TestUser, 'email' | 'password'>,
) {
  const session = await loginForSession(request, user);

  await page.goto('/');
  await page.evaluate(
    ({ key, sessionValue }) => window.sessionStorage.setItem(key, JSON.stringify(sessionValue)),
    {
      key: AUTH_SESSION_KEY,
      sessionValue: session,
    },
  );

  return session;
}

export async function fillRegistrationForm(page: Page, user: TestUser) {
  await page.getByLabel('Name').fill(user.name);
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByLabel('Confirm password').fill(user.password);
}

export async function fillLoginForm(page: Page, user: Pick<TestUser, 'email' | 'password'>) {
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
}

export async function expectDashboard(page: Page) {
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate short URL' })).toBeVisible();
}

export async function expectAuthenticatedSession(page: Page, user: Pick<TestUser, 'email'>) {
  const session = await page.evaluate((key) => window.sessionStorage.getItem(key), AUTH_SESSION_KEY);

  expect(session).toBeTruthy();
  expect(JSON.parse(session as string)).toMatchObject({
    user: {
      email: user.email.toLowerCase(),
    },
  });
}

export async function expectNoAuthSession(page: Page) {
  await expect
    .poll(() => page.evaluate((key) => window.sessionStorage.getItem(key), AUTH_SESSION_KEY))
    .toBeNull();
}

export async function loginThroughUi(page: Page, user: Pick<TestUser, 'email' | 'password'>) {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await fillLoginForm(page, user);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expectDashboard(page);
}

export async function logoutThroughUi(page: Page) {
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Logout' }).click();
}
