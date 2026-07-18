# Operations Runbook

This runbook covers production operation and maintenance for the URL Shortener application.

## Startup

1. Confirm environment variables are configured in the hosting platform or process manager.
2. Run `npm ci` from a clean checkout.
3. Run `npm run lint`, `npm test`, and `npm run build`.
4. Start the server with `NODE_ENV=production npm run server`.
5. Verify `GET /health` returns `200`.
6. Verify `GET /ready` returns `200` after MongoDB is connected.

Required production variables:

- `NODE_ENV=production`
- `PORT`
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `HASH_SALT`
- `CLIENT_URL`

Recommended operational variables:

- `SHORT_URL_BASE`
- `TRUST_PROXY`
- `STATIC_DIR`
- `LOG_LEVEL`
- `MONGODB_MAX_RETRIES`
- `MONGODB_RETRY_DELAY_MS`
- Rate limit variables from `.env.example`

Never store real secrets in Git. Keep a separate encrypted backup of production environment variables.

## Shutdown

The backend listens for `SIGINT` and `SIGTERM`, closes the MongoDB connection, logs the shutdown event, and exits. Prefer graceful platform shutdown or process-manager stop commands so in-flight requests have a chance to complete.

If the process is unhealthy and graceful shutdown fails, restart the process through the hosting platform or process manager and review the final `application.fatal`, `server.error`, or `database.shutdown_error` log entries.

## Health And Readiness

- `GET /health` and `GET /api/health`: process liveness only.
- `GET /ready` and `GET /api/ready`: readiness plus MongoDB connectivity.

Use `/health` for uptime checks and `/ready` for deployment readiness gates. The readiness response intentionally exposes only coarse dependency state.

## Logging

Production logs are structured JSON written to stdout and stderr for platform collection. Development logs are human-readable while preserving the same event names and metadata.

Important events:

- `application.starting`
- `application.started`
- `application.start_failed`
- `http.request`
- `http.unhandled_error`
- `server.error`
- `database.connected`
- `database.reconnected`
- `database.disconnected`
- `database.connection_attempt_failed`
- `process.unhandled_rejection`
- `process.uncaught_exception`

Request logs include request id, method, path, route family, status code, duration, and authenticated user id when available. They do not include request bodies, cookies, authorization headers, passwords, tokens, database URIs, or destination URLs.

Set `LOG_LEVEL` to `debug`, `info`, `warn`, `error`, or `fatal`. Defaults are `debug` in development, `info` in production, and `warn` in test.

## Error Monitoring Readiness

The backend centralizes unexpected error logging through `backend/utils/logger.js`.

Future monitoring integrations such as Sentry can be connected by calling `setErrorReporter((error, context) => { ... })` during server startup. Keep reporter setup optional so local development and CI do not require external accounts.

Recommended error-monitoring behavior:

- Capture `http.unhandled_error`, `process.unhandled_rejection`, and `process.uncaught_exception`.
- Redact secrets before sending metadata.
- Alert on repeated 5xx responses, startup failures, and database connection failures.
- Treat uncaught exceptions as process-fatal and restart through the platform.

## Common Issues

- Missing environment variable: set the named variable and restart.
- `/ready` returns `503`: check `MONGODB_URI`, MongoDB allowlist rules, credentials, and cluster health.
- Mongo connection retries exhausted: inspect `database.connection_attempt_failed` logs and MongoDB provider status.
- Static assets missing in production: run `npm run build` or set `STATIC_DIR` to the directory containing `index.html`.
- Users see cookie or CORS issues: verify HTTPS, `CLIENT_URL`, proxy forwarding, and `TRUST_PROXY`.
- Unexpected 429 responses: review rate limit settings and proxy trust configuration.

## Maintenance

- Rotate `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `HASH_SALT` using a planned maintenance window because active sessions and hashed values can be affected.
- Keep Node.js and npm dependencies patched.
- Review rate limit thresholds after traffic changes.
- Review application logs after deploys for startup, readiness, and 5xx errors.
- Run the validation suite before production release: `npm test`, `npm run lint`, `npm run build`, and representative Playwright regression tests.

## Backup And Recovery

MongoDB backup recommendations:

- Use managed provider snapshots where available.
- Schedule automated snapshots at least daily for production.
- Keep point-in-time recovery enabled for critical environments when supported.
- Periodically export logical backups with `mongodump` for an additional recovery path.

Example logical backup:

```bash
mongodump --uri "$MONGODB_URI" --archive="./backups/url-shortener-$(date +%Y%m%d%H%M%S).archive" --gzip
```

Example restore into a target database:

```bash
mongorestore --uri "$MONGODB_URI" --archive="./backups/url-shortener.archive" --gzip
```

Restore procedure:

1. Identify the incident window and choose the snapshot or dump.
2. Restore into a staging database first.
3. Verify user accounts, URLs, click counts, and analytics queries.
4. Schedule production restore or cutover.
5. Confirm `/ready`, login, URL creation, redirect, and analytics flows.

Environment variable backup:

- Export production environment configuration from the hosting provider after every change.
- Store the export in an encrypted secrets manager or secure vault.
- Keep recovery access documented for on-call maintainers.

Disaster recovery considerations:

- Keep database backups in a separate failure domain from the primary database.
- Document DNS, domain, TLS certificate, and hosting platform ownership.
- Maintain a tested path to recreate the application from Git, environment variables, and a database backup.

## Monitoring Guidance

Recommended monitors:

- Uptime: `GET /health` from at least two regions.
- Readiness: `GET /ready` during deploys and from internal monitoring.
- Database connectivity: alert on readiness failures and `database.disconnected`.
- Error rate: alert on sustained 5xx responses and `http.unhandled_error`.
- Response time: track p50, p95, and p99 request latency from `http.request`.
- Resource usage: monitor CPU, memory, restarts, event-loop delay if available, and disk usage for log storage.
- Rate limiting: monitor 429 volume by route family.

Suggested alert thresholds should be tuned after baseline traffic is known. Start with alerts for any production startup failure, any sustained readiness failure over five minutes, and a 5xx rate above 1% for ten minutes.

## Production Readiness Checklist

- [ ] Environment variables configured.
- [ ] Secrets generated and stored in a secure vault.
- [ ] HTTPS enabled.
- [ ] Domain configured.
- [ ] MongoDB configured and reachable.
- [ ] `/health` returns `200`.
- [ ] `/ready` returns `200`.
- [ ] Rate limiting enabled and tuned.
- [ ] Security headers verified.
- [ ] Monitoring configured.
- [ ] Error monitoring integration point reviewed.
- [ ] Backups configured.
- [ ] Restore procedure tested.
- [ ] Deployment rollback path documented.
