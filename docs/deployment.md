# Deployment Guide

This guide covers production deployment for the URL Shortener application without changing business behavior.

## Local Production Build

Install dependencies from a clean checkout:

```bash
npm ci
```

Build the frontend:

```bash
npm run build
```

Start the production server:

```bash
NODE_ENV=production npm run server
```

On Windows PowerShell:

```powershell
$env:NODE_ENV="production"; npm run server
```

The production server expects the built frontend at `dist/index.html` by default and serves API routes, static assets, known SPA routes, and short-link redirects from the same Express process.

## Environment Variables

Copy `.env.example` to `.env` for local setup and provide deployment platform environment variables in production.

Required in production:

- `NODE_ENV=production`
- `PORT`
- `MONGODB_URI`
- `JWT_SECRET` with at least 32 characters
- `JWT_REFRESH_SECRET` with at least 32 characters
- `HASH_SALT` with at least 16 characters
- `CLIENT_URL`, for example `https://shortly.example.com`

Recommended in production:

- `SHORT_URL_BASE`, when public short links should use a different origin than `CLIENT_URL`
- `TRUST_PROXY=1`, when Express runs behind one trusted reverse proxy or platform proxy
- `STATIC_DIR=dist`, unless the frontend build output is moved
- `MONGODB_MAX_RETRIES` and `MONGODB_RETRY_DELAY_MS`, if the platform needs custom startup retry behavior
- `RATE_LIMIT_*` values tuned for expected traffic
- `BCRYPT_SALT_ROUNDS=12` or higher, based on platform capacity

Frontend build-time variables:

- `VITE_API_URL` can be empty when frontend and API share the same origin.
- `VITE_SHORT_URL_BASE` should match the public short-link origin if it differs from the frontend origin.

Never log or commit real secrets.

## Deployment Steps

1. Provision MongoDB and copy its connection string into `MONGODB_URI`.
2. Generate strong values for `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `HASH_SALT`.
3. Set `CLIENT_URL` to the public frontend origin.
4. Set `SHORT_URL_BASE` if short links use a separate domain.
5. Set `TRUST_PROXY` only to match the deployment topology.
6. Run `npm ci`.
7. Run `npm run lint`, `npm test`, and `npm run build`.
8. Start the app with `NODE_ENV=production npm run server`.
9. Configure platform health checks against `/health` and readiness checks against `/ready`.

## Health Checks

- `GET /health` returns `200` when the HTTP process is alive.
- `GET /ready` returns `200` only when MongoDB is connected.
- API-prefixed equivalents are also available at `/api/health` and `/api/ready`.

Use `/ready` for deployment readiness gates because it validates database connectivity.

## Common Troubleshooting

- Startup fails with a missing environment variable: set the named variable before starting the server.
- Startup fails with missing static assets: run `npm run build` or set `STATIC_DIR` to the directory containing `index.html`.
- `/ready` returns `503`: verify `MONGODB_URI`, network access rules, credentials, and MongoDB availability.
- Cookies do not persist in production: verify HTTPS, `CLIENT_URL`, CORS origin, and reverse proxy forwarding.
- All users appear rate-limited as one IP: set `TRUST_PROXY` to the correct trusted proxy hop count for the platform.
- Short links show the wrong origin: set `SHORT_URL_BASE` and rebuild with `VITE_SHORT_URL_BASE` if the frontend displays links.
