# API Changelog

All notable changes to the MediBuddy API will be documented in this file.

Format: [Semantic Versioning](https://semver.org/)

---

## [1.0.0] — 2026-02-10

### Initial Release

**Auth (6 endpoints)**
- `POST /auth/otp` — Request OTP
- `POST /auth/verify` — Verify OTP & get tokens
- `POST /auth/refresh` — Refresh token pair
- `POST /auth/logout` — Revoke refresh token
- `PATCH /auth/consent` — Record consent acceptance
- `DELETE /auth/account` — Soft-delete account (30-day grace)

**Profiles (5 endpoints)**
- `GET /profiles` — List profiles
- `POST /profiles` — Create profile
- `GET /profiles/:profileId` — Get profile
- `PUT /profiles/:profileId` — Update profile
- `DELETE /profiles/:profileId` — Soft-delete profile

**Medications (5 endpoints)**
- `GET /profiles/:profileId/medications` — List medications
- `POST /profiles/:profileId/medications` — Create medication
- `GET /profiles/:profileId/medications/:medId` — Get medication
- `PUT /profiles/:profileId/medications/:medId` — Update medication
- `DELETE /profiles/:profileId/medications/:medId` — Delete medication

**Reminders (2 endpoints)**
- `GET /profiles/:profileId/reminders` — List reminders (24h window)
- `POST /profiles/:profileId/reminders/:reminderId/ack` — Acknowledge reminder

**Symptoms (2 endpoints)**
- `GET /profiles/:profileId/symptoms` — List symptoms (paginated)
- `POST /profiles/:profileId/symptoms` — Log symptom

**Summaries (4 endpoints)**
- `GET /profiles/:profileId/summaries` — List summaries
- `POST /profiles/:profileId/summaries` — Generate summary PDF
- `GET /profiles/:profileId/summaries/:summaryId` — Get summary + PDF URL
- `GET /profiles/:profileId/summaries/:summaryId/download` — Download PDF

**Caregivers (4 endpoints)**
- `GET /profiles/:profileId/caregivers` — List caregivers
- `POST /profiles/:profileId/caregivers` — Add caregiver
- `PATCH /profiles/:profileId/caregivers/:caregiverId` — Update caregiver
- `DELETE /profiles/:profileId/caregivers/:caregiverId` — Remove caregiver

**Appointments (7 endpoints)**
- `GET /appointments/:profileId` — List appointments
- `POST /appointments/:profileId` — Create appointment
- `GET /appointments/:profileId/upcoming` — List upcoming
- `GET /appointments/:profileId/:appointmentId` — Get appointment
- `PUT /appointments/:profileId/:appointmentId` — Update appointment
- `DELETE /appointments/:profileId/:appointmentId` — Delete appointment
- `PATCH /appointments/:profileId/:appointmentId/status` — Update status

**Health Metrics (7 endpoints)**
- `GET /health-metrics/:profileId` — List metrics
- `POST /health-metrics/:profileId` — Record metric
- `GET /health-metrics/:profileId/latest` — Latest by type
- `GET /health-metrics/:profileId/trends` — Trend data
- `POST /health-metrics/:profileId/batch` — Batch record
- `PUT /health-metrics/:profileId/:metricId` — Update metric
- `DELETE /health-metrics/:profileId/:metricId` — Delete metric

**Messages (7 endpoints)**
- `POST /messages` — Send message
- `POST /messages/system` — Send system message
- `GET /messages/conversations` — List conversations
- `GET /messages/unread` — Unread count
- `GET /messages/conversation/:conversationId` — Get conversation
- `PATCH /messages/conversation/:conversationId/read` — Mark read
- `DELETE /messages/:messageId` — Delete message

**Push (4 endpoints)**
- `GET /push/public-key` — VAPID public key
- `POST /push/subscribe` — Save push subscription
- `POST /push/unsubscribe` — Remove push subscription
- `POST /push/test` — Send test notification

**Sync (2 endpoints)**
- `POST /sync/batch` — Batch sync operations
- `GET /sync/changes` — Get changes since timestamp

**Admin (1 endpoint)**
- `GET /admin/metrics` — System & domain metrics

**Health (1 endpoint)**
- `GET /health` — Service health check

---

## Deprecation Policy

- Deprecated endpoints will be announced **2 weeks** before removal
- Deprecated endpoints return a `Sunset` header with the removal date
- Breaking changes increment the major version

## Template for New Entries

```markdown
## [X.Y.Z] — YYYY-MM-DD

### Added
- `METHOD /path` — Description

### Changed
- `METHOD /path` — What changed

### Deprecated
- `METHOD /path` — Use `NEW /path` instead (removal: YYYY-MM-DD)

### Removed
- `METHOD /path` — Was deprecated in X.Y.Z
```
