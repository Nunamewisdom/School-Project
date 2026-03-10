# File Uploads & Summary PDF Downloads

MediBuddy generates **consultation summary PDFs** on the backend and stores
them in **Backblaze B2** (S3-compatible). This document explains the flow.

## Architecture

```
┌────────┐          ┌────────┐          ┌───────────┐
│ Client │          │  API   │          │ B2 Storage│
└───┬────┘          └───┬────┘          └─────┬─────┘
    │ POST /summaries   │                     │
    │ {startDate,endDate}│                    │
    │──────────────────>│ generate PDF        │
    │                   │ (pdfkit)            │
    │                   │────────────────────>│ upload
    │   202 { summaryId, status: "processing"}│
    │<──────────────────│                     │
    │                   │                     │
    │ GET /summaries/:id│                     │
    │──────────────────>│ get signed URL      │
    │                   │────────────────────>│
    │   200 { pdfUrl }  │                     │
    │<──────────────────│                     │
```

## Generating a Summary

```bash
curl -X POST http://localhost:5000/api/profiles/${profileId}/summaries \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2026-01-01", "endDate": "2026-02-01"}'
```

The server:
1. Queries medications, symptoms, and reminders for the date range
2. Generates a PDF using `pdfkit`
3. Uploads the PDF to Backblaze B2
4. Stores the summary record in MongoDB with status `completed`

## Downloading a Summary

### Via API (signed URL)

```bash
curl http://localhost:5000/api/profiles/${profileId}/summaries/${summaryId} \
  -H "Authorization: Bearer $TOKEN"
```

Response includes a `pdfUrl` — a pre-signed URL valid for **1 hour**.

### Direct download

```bash
curl http://localhost:5000/api/profiles/${profileId}/summaries/${summaryId}/download \
  -H "Authorization: Bearer $TOKEN" \
  -o summary.pdf
```

Returns the raw PDF binary with `Content-Type: application/pdf`.

## Frontend Integration

```javascript
// Trigger summary generation
const { data } = await apiClient.post(
  `/profiles/${profileId}/summaries`,
  { startDate: '2026-01-01', endDate: '2026-02-01' }
);

// Poll or navigate to summary detail
const summary = await apiClient.get(
  `/profiles/${profileId}/summaries/${data._id}`
);

// Open PDF in new tab
if (summary.data.pdfUrl) {
  window.open(summary.data.pdfUrl, '_blank');
}
```

## Storage Configuration

Backend uses the `@aws-sdk/client-s3` SDK to communicate with B2. Required env vars:

| Variable | Description |
|----------|-------------|
| `B2_KEY_ID` | Backblaze application key ID |
| `B2_APP_KEY` | Backblaze application key |
| `B2_BUCKET_ID` | Target bucket ID |
| `B2_BUCKET_NAME` | Target bucket name |
| `B2_ENDPOINT` | S3-compatible endpoint URL |

## No Direct File Uploads (Yet)

Currently the frontend **does not** upload files directly. Symptom logs
support a `voiceNoteUrl` field which is reserved for future implementation.
When voice notes are added, the flow will use pre-signed upload URLs.
