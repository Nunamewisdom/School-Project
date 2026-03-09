# Frontend Developer Onboarding Guide

Quick-start guide for frontend developers integrating with the MediBuddy API.

---

## 1. Get Running in 5 Minutes

```bash
# Clone & install
git clone <repo-url> && cd MediBuddy-Dev

# Backend
cd backend && cp .env.example .env   # fill in values below
npm install && npm run dev            # → http://localhost:5000

# Frontend (separate terminal)
cd frontend && npm install && npm run dev  # → http://localhost:3000
```

### Required `.env` (backend)

```env
PORT=5000
MONGODB_URI=mongodb+srv://...         # Ask team lead
JWT_SECRET=any-random-string-here
JWT_REFRESH_SECRET=another-random-string
CORS_ORIGIN=*
```

### Frontend `.env`

```env
VITE_API_URL=/api                     # Proxied by Vite to localhost:5000
VITE_VAPID_PUBLIC_KEY=...             # Ask team lead
```

## 2. Where to Find Things

| Need | Location |
|------|----------|
| **Interactive API docs** | http://localhost:5000/docs (Swagger UI) |
| **OpenAPI spec** | `backend/openapi.yaml` |
| **Raw spec (JSON)** | http://localhost:5000/docs/spec.json |
| **Mock server** | `cd backend && npm run mock` → http://localhost:4010 |
| **Auth flow docs** | `backend/docs/auth.md` |
| **Upload/PDF docs** | `backend/docs/uploads.md` |
| **Error/pagination** | `backend/docs/api-conventions.md` |
| **Security/CORS** | `backend/docs/security.md` |
| **API changelog** | `backend/API_CHANGELOG.md` |

## 3. Authentication Quick Reference

```javascript
// 1. Login
const { data } = await fetch('/api/auth/otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: '+2348012345678' })
}).then(r => r.json());

// 2. Verify
const auth = await fetch('/api/auth/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ requestId: data.requestId, otp: '123456' })
}).then(r => r.json());

// 3. Store tokens in IndexedDB (NOT localStorage)
// 4. Use the access token:
const profiles = await fetch('/api/profiles', {
  headers: { 'Authorization': `Bearer ${auth.data.accessToken}` }
}).then(r => r.json());
```

See `backend/docs/auth.md` for the full flow including refresh.

## 4. Response Format

**Every** response looks like:
```json
{ "success": true, "data": { ... }, "serverTime": "2026-..." }
```

Errors:
```json
{ "success": false, "error": "msg", "code": "VALIDATION_ERROR", "details": [...] }
```

Always check `success` first, then use `data`.

## 5. Common Patterns

### Creating a medication (with idempotency)

```javascript
const res = await fetch(`/api/profiles/${profileId}/medications`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'Idempotency-Key': crypto.randomUUID?.() || generateUUID()
  },
  body: JSON.stringify({
    name: 'Amlodipine',
    dosage: '5mg',
    times: ['08:00', '20:00']
  })
});
```

### Offline sync

```javascript
// Queue operations in IndexedDB, then sync when online:
const res = await fetch('/api/sync/batch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ operations: queuedOps })
});
```

### Pagination

```javascript
const symptoms = await fetch(
  `/api/profiles/${profileId}/symptoms?page=2&limit=20`,
  { headers: { 'Authorization': `Bearer ${token}` } }
).then(r => r.json());
// symptoms.data → array, symptoms.pagination → { page, limit, total, pages }
```

## 6. Working with the Mock Server

If the backend team hasn't deployed a feature yet:

```bash
cd backend
npm run mock   # starts Prism on http://localhost:4010
```

Update your `.env`:
```env
VITE_API_URL=http://localhost:4010
```

The mock server returns example responses from `openapi.yaml`.

## 7. Generating a TypeScript Client

```bash
cd backend
npm run gen:client
```

This generates typed API functions in `frontend/src/api-client/`.

## 8. Troubleshooting

| Problem | Solution |
|---------|----------|
| `401 Unauthorized` | Token expired → call `/auth/refresh` |
| `429 Too Many Requests` | Wait `Retry-After` seconds |
| CORS error | Check `CORS_ORIGIN` in backend `.env` |
| `ERR_CONNECTION_REFUSED` | Backend not running → `cd backend && npm run dev` |
| Data not showing | Check Vite proxy → `vite.config.js` must proxy `/api` to `localhost:5000` |

## 9. API Endpoint Count by Domain

| Domain | Endpoints | Prefix |
|--------|-----------|--------|
| Auth | 6 | `/api/auth` |
| Profiles | 5 | `/api/profiles` |
| Medications | 5 | `/api/profiles/:id/medications` |
| Reminders | 2 | `/api/profiles/:id/reminders` |
| Symptoms | 2 | `/api/profiles/:id/symptoms` |
| Summaries | 4 | `/api/profiles/:id/summaries` |
| Caregivers | 4 | `/api/profiles/:id/caregivers` |
| Appointments | 7 | `/api/appointments` |
| Health Metrics | 7 | `/api/health-metrics` |
| Messages | 7 | `/api/messages` |
| Push | 4 | `/api/push` |
| Sync | 2 | `/api/sync` |
| Admin | 1 | `/api/admin` |
| Health | 1 | `/api/health` |
| **Total** | **57** | |
