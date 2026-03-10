# Security & CORS

## CORS Configuration

```javascript
// backend/src/app.js
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key']
}));
```

### Environment Setup

| Environment | `CORS_ORIGIN` | Note |
|-------------|---------------|------|
| Local dev | `*` (default) | Frontend at localhost:3000, backend at localhost:5000 |
| Production | `https://medibuddy.vercel.app` | Set explicitly |

### Common CORS Issues

1. **Preflight fails**: Ensure OPTIONS requests reach Express (helmet must not block)
2. **Missing header**: `Idempotency-Key` must be listed in `allowedHeaders`
3. **Credentials**: If you add `credentials: 'include'` on fetch, set `origin` to exact URL (not `*`)

## Security Headers (Helmet)

`helmet()` is applied as the first middleware. It sets:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` (in production)
- `X-XSS-Protection: 0` (modern browsers use CSP instead)
- CSP defaults

## Authentication

| Mechanism | Details |
|-----------|---------|
| **Method** | Bearer JWT (HMAC SHA-256) |
| **Access token** | 15 min lifetime, in `Authorization` header |
| **Refresh token** | 7 days, sent via JSON body to `/auth/refresh` |
| **OTP** | 6-digit numeric code, 10 min window, max 5 attempts per 15 min |

### Token Payload

```json
{
  "userId": "6613a1c8e4b0f12abc000002",
  "phone": "+2348012345678",
  "role": "user",
  "iat": 1707567600,
  "exp": 1707568500
}
```

### Authorization Middleware

The `auth` middleware:
1. Extracts token from `Authorization: Bearer <token>`
2. Verifies with `JWT_SECRET`
3. Attaches `req.user = { userId, phone, role }` to the request
4. Returns 401 if missing/invalid/expired

## Data Ownership

Every resource query is scoped by `ownerId` (derived from `req.user.userId`).
Users can never access another user's data — enforced at the model/query layer.

## Soft Deletes

Profiles, medications, caregivers, and accounts use soft deletion:
- A `deletedAt` timestamp is set
- Queries filter out soft-deleted records
- Account deletion has a 30-day grace period

## Input Validation

All request bodies are validated using **Zod** schemas in `src/validators/`.
Invalid requests receive a `400 VALIDATION_ERROR` with field-level details.

## Sensitive Headers

| Header | Purpose | Who Sets It |
|--------|---------|-------------|
| `Authorization` | Bearer JWT | Frontend |
| `Idempotency-Key` | UUID v4 for safe retries | Frontend |
| `X-RateLimit-*` | Rate limit info | Backend |
| `Retry-After` | Seconds to wait on 429 | Backend |

## Frontend Security Checklist

- [ ] **Never** store tokens in localStorage (use IndexedDB)
- [ ] **Never** include tokens in URLs or logs
- [ ] Implement auto-refresh: on 401 → call `/auth/refresh` → retry
- [ ] Clear all auth data on logout
- [ ] Validate phone number format client-side before sending
- [ ] Use HTTPS in production (enforced by hosting platform)
- [ ] Set appropriate CSP headers if embedding content
