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
