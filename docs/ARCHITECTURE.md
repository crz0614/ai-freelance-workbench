# Architecture

## Boundaries

The browser receives normalized opportunity objects, never provider credentials. Source adapters, scoring and optional model calls belong on the server. Personal experience facts, when enabled in a private deployment, must be encrypted at rest and separated from public demo data.

## Pipeline

1. Source adapters fetch public GitHub bounties, fixed-price project posts and remote contract feeds with deadlines and rate limits.
2. A normalizer maps different payloads to the `Opportunity` contract.
3. Filters remove listings older than 30 days, duplicate URLs, filled/rewarded tasks, unsafe payment requests, missing cash budgets and bounties with three or more visible claim signals.
4. Ranking combines skill overlap, recency, published compensation and visible competition.
5. The UI explains the score instead of presenting an opaque number.
6. Proposal generation may cite only verified experience facts.
7. External submission always requires an auditable approval step.

## Production evolution

- PostgreSQL for opportunities, profiles and application events
- Queue-backed collectors with per-source circuit breakers
- Encrypted secret storage and OAuth token rotation
- Structured LLM outputs with factual-claim validation
- OpenTelemetry traces, source health metrics and retry dashboards

## Privacy model

The public deployment is intentionally stateless. It displays current public listings and their original source URLs but stores no personal search or application history. Production identity and email integrations are outside this repository's public boundary.
