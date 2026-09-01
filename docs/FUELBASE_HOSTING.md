# FuelBase personal web/PWA hosting

FuelBase can run as one HTTPS Node service without Docker. The Express server serves both the built Svelte PWA and the API, so the browser/iPhone and API stay same-origin.

## Recommended simple deployment: Railway + Railpack

Use the repository root as the service root and select the `feature/intervals-endurance` branch while testing.

### Build and start

- Builder: Railpack / native Node builder (not Docker)
- Build command: `npm run host:build`
- Start command: `npm run host:start`
- Healthcheck: `/api/health`

`host:build` deliberately runs the i18n check, all Node tests and the Svelte production build before it prepares `server/dist`. A failed test/build therefore blocks deployment.

### Persistent data

Attach one persistent volume at `/data` and set:

```text
DB_PATH=/data/fuelbase.db
UPLOADS_PATH=/data/uploads
```

Do not run the personal production instance on an ephemeral filesystem: the SQLite database contains the diary, foods, settings and login account.

### Required production secrets

Set these in the hosting provider's secret/environment-variable UI, never in Git:

```text
NODE_ENV=production
JWT_SECRET=<random long secret>
TOKEN_ENC_KEY=<random long secret>
FUELBASE_USERNAME=<your login name>
FUELBASE_PASSWORD=<your private password, at least 12 chars>
FUELBASE_FULL_NAME=<optional display name>
```

`FUELBASE_USERNAME` + `FUELBASE_PASSWORD` enable the personal-account bootstrap. On a fresh persistent database the account is created before the web server accepts requests. Later starts keep the same one-user account; changing the secret password changes that account's password.

The Intervals.icu API key is entered in the FuelBase UI and stored encrypted in the SQLite database. Do not put the Intervals key in source control.

## iPhone installation

Once the deployment has an HTTPS domain:

1. Open FuelBase in Safari on the iPhone.
2. Share → Add to Home Screen.
3. Enable/open it as a web app.
4. Sign in with the FuelBase personal account.

The manifest and Apple web-app metadata are configured for standalone display, safe-area support and a FuelBase Home Screen title.

For the FuelBase use case (food logging, barcode/camera web access, Intervals sync and daily fueling planning), PWA-first is the intended iOS delivery model. Native-only integrations such as direct HealthKit access would require a later native wrapper and are intentionally outside this personal web MVP.

## Preview-only alternative: Render Free

Render Free is useful for throwaway preview deployments and visual testing, but its free filesystem is ephemeral. Do not store the personal production SQLite database there unless persistence is moved to an external database/storage service.

## Fully serverless/free alternative

Cloudflare Pages/Workers + D1 is a viable future architecture for a one-user FuelBase, but it is not a drop-in host for the current Express + `better-sqlite3` backend. Moving there requires a backend/database adapter migration. Keep this as a later optimization rather than blocking the first usable PWA.
