# Shortly URL Shortener

Shortly is a React/Vite and Express/MongoDB URL shortener with email/password authentication, Google sign-in, refresh-token sessions, dashboards, analytics, and account settings.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in the required values.

3. Start the API and frontend:

```bash
npm run server
npm run dev
```

## Firebase Google Authentication

Create or select a Firebase project, then enable Google as a sign-in provider in Firebase Authentication.

Frontend configuration comes from the Firebase web app settings:

```ini
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

Backend configuration comes from a Firebase service account. In Firebase Console, create a service account private key and set:

```ini
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

Store `FIREBASE_PRIVATE_KEY` with escaped newlines, for example `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n`. The server converts escaped newlines before initializing Firebase Admin.

## Google OAuth Setup

In Firebase Authentication, add each app origin to Authorized domains. For local development this usually includes `localhost`. For production, add the deployed domain, for example `shortly.example.com`.

The frontend signs in with Firebase Google Provider, retrieves a Google ID token, and sends only that token to:

```http
POST /api/auth/google
Content-Type: application/json

{ "idToken": "firebase-google-id-token" }
```

The backend verifies the ID token with Firebase Admin SDK, rejects invalid, expired, revoked, wrong-audience, and wrong-issuer tokens, creates or links the user, and returns the same session shape used by email login.

## Required Authentication Variables

Backend:

```ini
JWT_SECRET=
JWT_REFRESH_SECRET=
HASH_SALT=
CLIENT_URL=
SHORT_URL_BASE=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

Frontend:

```ini
VITE_API_URL=
VITE_SHORT_URL_BASE=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

Missing Firebase variables produce clear startup or sign-in configuration errors.

## Production Deployment

Set all backend and frontend environment variables in the hosting provider. Use HTTPS for `CLIENT_URL` and `SHORT_URL_BASE` in production. Add the production domain to Firebase Authentication authorized domains before release.

Build and verify before deployment:

```bash
npm run lint
npm test
npm run build
```
