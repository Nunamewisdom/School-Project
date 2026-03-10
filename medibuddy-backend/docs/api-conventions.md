# API Conventions

## Response Envelope

Every response from the MediBuddy API follows a consistent envelope:

### Success

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable message",
  "serverTime": "2026-02-10T12:00:00.000Z"
}
```

### Error

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "MACHINE_CODE",
  "details": [
    { "path": "fieldName", "message": "Why it failed" }
  ],
  "serverTime": "2026-02-10T12:00:00.000Z"
}
```

## Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `VALIDATION_ERROR` | 400 | Request body / params failed Zod schema |
| `INVALID_OTP` | 400 | OTP doesn't match |
| `OTP_EXPIRED` | 400 | OTP has expired |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Token valid but user lacks permissions |
| `NOT_FOUND` | 404 | Resource doesn't exist or not owned by user |
| `CONFLICT` | 409 | Idempotency key conflict (different payload) |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Validation Errors

Powered by **Zod**. The `details` array maps to Zod issues:

```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    { "path": "phone", "message": "Invalid phone number format" },
    { "path": "otp", "message": "Required" }
  ]
}
```

Frontend should iterate `details` and show field-level error messages.

## Pagination

Endpoints that return lists use **offset pagination**:

| Query Param | Default | Description |
|-------------|---------|-------------|
| `page` | 1 | Page number (1-based) |
| `limit` | 20 | Items per page (max 100) |

Response includes metadata when paginated:

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 87,
    "pages": 5
  }
}
```

### Endpoints with pagination support

- `GET /profiles/:profileId/symptoms`
- `GET /profiles/:profileId/medications`
- `GET /health-metrics/:profileId`
- `GET /messages/conversation/:conversationId`

## Rate Limiting

Five presets protect the API:

| Preset | Apply To | Window | Max Requests |
|--------|----------|--------|--------------|
| **General** | All endpoints | 15 min | 100 |
| **Auth** | `/auth/*` | 15 min | 20 |
| **OTP** | `/auth/otp` | 15 min | 5 |
| **Sync** | `/sync/*` | 1 min | 30 |
| **Write** | Mutating endpoints | 1 min | 60 |

### Response Headers

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Max requests for window |
| `X-RateLimit-Remaining` | Remaining requests |
| `Retry-After` | Seconds until window resets (only on 429) |

### Handling 429

```javascript
async function fetchWithRetry(url, options, retries = 3) {
  const res = await fetch(url, options);
  if (res.status === 429 && retries > 0) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '5', 10);
    await new Promise(r => setTimeout(r, retryAfter * 1000));
    return fetchWithRetry(url, options, retries - 1);
  }
  return res;
}
```

## Idempotency

Mutating endpoints (POST, PUT, PATCH, DELETE) accept an `Idempotency-Key`
header (UUID v4). When provided:

1. First request: processed normally, response cached 24 h
2. Replay with same key + same body: cached response returned (200)
3. Replay with same key + different body: **409 Conflict**

### Usage

```javascript
import { generateUUID } from '../utils/uuid.js';

const idempotencyKey = generateUUID();

const res = await fetch('/api/profiles/abc/medications', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'Idempotency-Key': idempotencyKey
  },
  body: JSON.stringify({ name: 'Amlodipine', dosage: '5mg', times: ['08:00'] })
});
```

> Use idempotency for: medication create, symptom log, reminder ack, sync batch.

## Timestamps

- All timestamps are **ISO 8601** in **UTC**: `2026-02-10T12:00:00.000Z`
- The server returns `serverTime` in every response for clock-drift detection
- Clients should send `clientTs` for offline-first operations

## Content Type

- Request: `application/json` (all endpoints)
- Response: `application/json` (except PDF download: `application/pdf`)
