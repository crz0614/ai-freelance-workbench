# API

## `GET /api/opportunities`

Runs every public collector with `no-store`, applies qualification rules, and returns only opportunities that still pass at response time.

```json
{
  "opportunities": [
    {
      "id": "github-123",
      "company": "owner/repository",
      "role": "Build a verified integration",
      "source": "Algora verified bounty",
      "sourceUrl": "https://github.com/owner/repository/issues/123",
      "budget": "$250",
      "budgetMinUsd": 250,
      "publishedAt": "ISO-8601 timestamp",
      "verifiedAt": "ISO-8601 timestamp",
      "competition": 1,
      "status": "verified-open",
      "deliverable": "Mergeable implementation satisfying the issue acceptance criteria",
      "trustSignals": ["Issue open now", "Cash amount published"],
      "risks": ["1 visible claim/attempt signal(s)"]
    }
  ],
  "sources": [
    { "name": "GitHub + trusted bounty platforms", "ok": true, "count": 1, "rejected": 24 }
  ],
  "rules": {
    "maxListingAgeDays": 30,
    "maxDirectProjectAgeDays": 14,
    "minimumFixedPriceUsd": 25,
    "maximumMarketplaceProposals": 8,
    "cashOnly": true,
    "removeFinished": true,
    "maxVisibleBountyCompetition": 2
  },
  "fetchedAt": "ISO-8601 timestamp",
  "mode": "live-verified-multi-source"
}
```

Responses include `Cache-Control: no-store, no-cache, must-revalidate`. A failed source is reported with `ok: false`; it is never replaced with sample data.

## `GET /api/workspace`

Returns server-persisted opportunity stages, notes and proposal drafts together with the last verified opportunity snapshot. `sourceStillActive` distinguishes records that disappeared from the latest qualified scan.

## `PUT /api/workspace`

Accepts `opportunityId`, a stage (`saved`, `pipeline`, `applied`, or `archived`), and optional `note` and `draft`. Unknown opportunity IDs and oversized text are rejected.

## `GET /api/activity`\n\nReturns the newest persisted workspace events in reverse chronological order. `limit` defaults to 50 and is clamped to 1–100. Events contain only opportunity identity/display metadata, transition type and timestamp; notes and proposal drafts are never returned. Responses use `Cache-Control: no-store`.\n\n## `GET /api/health`

Checks database access and reports whether storage is durable in the current runtime.


## `GET /api/metrics`

Returns Prometheus text exposition format (`text/plain; version=0.0.4`) with aggregate gauges for durable storage, active/inactive opportunity snapshots, and workspace stages, plus the total persisted audit-event count. The endpoint never includes opportunity payloads, notes, proposal drafts, URLs, credentials, or other customer data. Responses use `Cache-Control: no-store`; database failures return HTTP 503 with an error gauge.
