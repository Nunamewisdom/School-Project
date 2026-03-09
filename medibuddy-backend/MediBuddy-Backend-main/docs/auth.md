# Authentication Flow

MediBuddy uses a **phone-based OTP login** (no passwords).

## Sequence

```
┌────────┐      ┌────────┐      ┌───────────┐
│ Client │      │  API   │      │SMS Gateway│
└───┬────┘      └───┬────┘      └─────┬─────┘
    │ POST /auth/otp│                 │
    │  { phone }    │                 │
    │──────────────>│  generate OTP   │
    │               │────────────────>│ send SMS
    │  200 { requestId, expiresIn }   │
    │<──────────────│                 │
    │               │                 │
    │ POST /auth/verify               │
    │ { requestId, otp }              │
    │──────────────>│                 │
    │  200 { accessToken,             │
    │        refreshToken, user }     │
    │<──────────────│                 │
```

## Step-by-Step

### 1. Request OTP

```bash
curl -X POST http://localhost:5000/api/auth/otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+2348012345678"}'
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "requestId": "6613a1c8e4b0f12abc000001",
    "expiresIn": 600
  },
  "serverTime": "2026-02-10T12:00:00.000Z"
}
```

### 2. Verify OTP

```bash
curl -X POST http://localhost:5000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"requestId": "6613a1c8e4b0f12abc000001", "otp": "123456"}'
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "6613a1c8e4b0f12abc000002",
      "phone": "+2348012345678",
      "name": null,
      "timezone": "Africa/Lagos",
      "consent": { "accepted": false }
    }
  },
  "serverTime": "2026-02-10T12:00:05.000Z"
}
```

### 3. Store Tokens

```javascript
// Frontend — store in IndexedDB via db/index.js
import { putItem } from '../db/index.js';

async function handleLogin(data) {
  await putItem('auth', { key: 'accessToken', value: data.accessToken });
  await putItem('auth', { key: 'refreshToken', value: data.refreshToken });
  await putItem('auth', { key: 'user', value: data.user });
}
```

### 4. Use Access Token

Attach to every authenticated request:

```javascript
const res = await fetch('/api/profiles', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
```

### 5. Refresh Token

Access tokens expire in **15 minutes**. To get a new pair without re-authenticating:

```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "eyJhbGciOiJIUzI1NiIs..."}'
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "new-access-token...",
    "refreshToken": "new-refresh-token..."
  }
}
```

> **Important:** The old refresh token is revoked. Always store the new pair.

### 6. Consent

After first login, prompt the user to accept terms. Until consent is given, some features may be restricted.

```bash
curl -X PATCH http://localhost:5000/api/auth/consent \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"accepted": true, "version": "1.0"}'
```

### 7. Logout

```bash
curl -X POST http://localhost:5000/api/auth/logout
```

## Frontend Integration Checklist

- [ ] Store both tokens in IndexedDB (not localStorage — PWA requirement)
- [ ] Attach `Authorization: Bearer <accessToken>` to every API call
- [ ] Implement silent refresh: on 401, call `/auth/refresh`, retry original request
- [ ] If refresh also returns 401, redirect to login
- [ ] On logout, clear all IndexedDB auth records
- [ ] Show consent screen after first login if `user.consent.accepted === false`

## Token Details

| Token | Lifetime | Storage |
|-------|----------|---------|
| Access Token | 15 min | IndexedDB `auth` store |
| Refresh Token | 7 days | IndexedDB `auth` store |
| OTP | 10 min | Server-only |

## Error Codes

| Code | Meaning |
|------|---------|
| `INVALID_OTP` | Code expired or wrong |
| `OTP_EXPIRED` | 10 min window passed |
| `UNAUTHORIZED` | Missing or invalid Bearer token |
| `RATE_LIMITED` | OTP: max 5/15 min; Auth: max 20/15 min |
