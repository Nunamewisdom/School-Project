# MediBuddy Backend

Node.js + Express REST API powering the MediBuddy healthcare PWA.  
Handles medication reminders, symptom logging, consultation summaries, push notifications, and caregiver alerts.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js ≥ 20 (ESM) |
| Framework | Express 4 |
| Database | MongoDB (Mongoose 8) |
| Cache / Queues | Redis + Bull |
| Auth | JWT (access + refresh), OTP via SMS |
| Push | web-push (VAPID) |
| Storage | Backblaze B2 (S3-compatible) |
| Telemetry | PostHog (optional) |
| Logging | Winston |
| Validation | Zod |

## Quick Start

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Create .env (see Environment Variables below)
cp .env.example .env   # then fill in values

# 3. Start development server (auto-restart on changes)
npm run dev

# 4. Start Bull queue worker (separate terminal)
npm run worker
```

The API runs on **http://localhost:5000** by default.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with `--watch` (auto-reload) |
| `npm start` | Production start |
| `npm run worker` | Bull queue worker process |
| `npm test` | Run Jest test suite |
| `npm run test:coverage` | Tests + coverage report |
| `npm run lint` | ESLint check |
| `npm run lint:fix` | ESLint auto-fix |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default `5000`) |
| `NODE_ENV` | No | `development` / `production` / `test` |
| `MONGODB_URI` | **Yes** | MongoDB connection string |
| `JWT_SECRET` | **Yes** | Secret for signing JWTs |
| `JWT_ACCESS_EXPIRES` | No | Access token TTL (default `15m`) |
| `JWT_REFRESH_EXPIRES` | No | Refresh token TTL (default `30d`) |
| `REDIS_URL` | No | Redis URL for Bull queues (default `redis://localhost:6379`) |
| `CORS_ORIGIN` | No | Allowed origin (default `*`) |
| `VAPID_PUBLIC_KEY` | **Yes** | VAPID public key for web-push |
| `VAPID_PRIVATE_KEY` | **Yes** | VAPID private key |
| `VAPID_SUBJECT` | No | VAPID subject (default `mailto:support@medibuddy.com`) |
| `SMS_PROVIDER` | No | `twilio` or `africastalking` (default `twilio`) |
| `TWILIO_ACCOUNT_SID` | Cond. | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Cond. | Twilio Auth Token |
| `TWILIO_FROM_NUMBER` | Cond. | Twilio sender number |
| `AT_API_KEY` | Cond. | Africa's Talking API key |
| `AT_USERNAME` | Cond. | Africa's Talking username |
| `AT_SENDER_ID` | Cond. | Africa's Talking sender ID |
| `B2_KEY_ID` | **Yes** | Backblaze B2 key ID |
| `B2_APP_KEY` | **Yes** | Backblaze B2 application key |
| `B2_BUCKET_NAME` | **Yes** | B2 bucket name |
| `B2_ENDPOINT` | **Yes** | B2 S3-compatible endpoint |
| `B2_REGION` | No | B2 bucket region |
| `OTP_LENGTH` | No | OTP digit count (default `6`) |
| `OTP_EXPIRY_MINUTES` | No | OTP validity minutes (default `10`) |
| `TELEMETRY_ENABLED` | No | Enable PostHog telemetry (`true`/`false`) |
| `POSTHOG_API_KEY` | No | PostHog project API key |
| `POSTHOG_HOST` | No | PostHog host URL |

## API Overview

All endpoints are prefixed with `/api`.

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/otp` | No | Request OTP |
| POST | `/api/auth/verify` | No | Verify OTP → tokens |
| POST | `/api/auth/refresh` | No | Refresh access token |
| POST | `/api/auth/logout` | No | Revoke refresh token |
| PATCH | `/api/auth/consent` | Yes | Record consent |
| DELETE | `/api/auth/account` | Yes | Soft-delete account (30-day grace) |

### Profiles, Medications, Symptoms, Reminders, Summaries, Caregivers
Nested under `/api/profiles/:profileId/...`

### Push Notifications
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/push/public-key` | No | VAPID public key |
| POST | `/api/push/subscribe` | Yes | Save push subscription |
| POST | `/api/push/unsubscribe` | Yes | Remove push subscription |
| POST | `/api/push/test` | Yes | Send test notification |

### Other
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Health check |
| GET | `/api/admin/metrics` | Yes | System & domain metrics |
| POST | `/api/sync` | Yes | Offline sync merge |
| * | `/api/appointments` | Yes | Appointment CRUD |
| * | `/api/health-metrics` | Yes | Health metrics CRUD |
| * | `/api/messages` | Yes | Messages CRUD |

### Response Envelope

All responses follow a consistent envelope:

```json
{
  "success": true,
  "data": { ... },
  "serverTime": "2025-01-01T00:00:00.000Z"
}
```

Error responses:

```json
{
  "success": false,
  "error": "Human-readable message",
  "code": "MACHINE_CODE",
  "serverTime": "2025-01-01T00:00:00.000Z"
}
```

## Docker

```bash
# From project root
docker compose up --build
```

Services: MongoDB, Redis, Backend (port 5000), Frontend (port 3000).

## Testing

```bash
npm test                 # run all tests
npm run test:coverage    # with coverage report
```

Tests use `mongodb-memory-server` for an in-memory MongoDB instance — no external DB needed.

## Project Structure

```
backend/
├── src/
│   ├── app.js              # Express app + middleware
│   ├── server.js           # Entry point (connect + listen)
│   ├── adapters/           # External service adapters
│   │   ├── push/           # web-push (VAPID)
│   │   └── sms/            # Twilio, Africa's Talking
│   ├── controllers/        # (reserved)
│   ├── jobs/               # Bull queue jobs (reminders, SMS, PDF)
│   ├── middleware/          # auth, validation, rate limiting, etc.
│   ├── models/             # Mongoose schemas
│   ├── routes/             # Express route handlers
│   ├── services/           # telemetry, PDF, storage
│   ├── utils/              # logger, response helpers, errors
│   └── validators/         # Zod schemas
├── tests/                  # Jest test suite
├── Dockerfile
├── jest.config.js
└── package.json
```

## License

UNLICENSED – Private project.
