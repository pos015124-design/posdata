# Bhaby E-Shop Promo — RUNBOOK

## Prerequisites
- Node.js 22+
- npm

## Install dependencies

```bash
cd app
npm install
```

## Build

```bash
npm run build
```

## Start (production)

The server respects the `PORT` environment variable (defaults to 3000):

```bash
PORT=3000 npm run start
# or
PORT=8080 npm run start
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port to listen on |
| `DROIDBOT_DB_PATH` | `./data/app.db` | SQLite database file path |
| `NEXT_PUBLIC_APK_URL` | `/bhaby-eshop.apk` | URL of the Android APK download |
| `NEXT_PUBLIC_ESHOP_URL` | `https://e-shop.bhabygroup.co.tz` | Live e-shop URL |
| `DROIDBOT_SESSION_SECRET` | `dev-secret-change-me` | Session secret (not used in v1 — no auth) |

## Run API tests

Start the server first, then:

```bash
DROIDBOT_TEST_URL=http://localhost:3000 npx vitest run tests/api.test.ts
```

## Docker

```bash
docker build -t bhaby-eshop-promo .
docker run -p 3000:3000 -v /data:/data bhaby-eshop-promo
```
