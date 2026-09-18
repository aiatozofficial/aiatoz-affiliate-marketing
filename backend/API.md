# API Overview

Base path: `/api/v1`

Public: `POST /applications`, `GET /applications/{public_id}`, `POST /referrals/click`, `GET /referrals/{code}`, `POST /tracking/event`, `POST /leads`.

Authenticated affiliate: `GET /auth/me`, `GET /affiliate/profile`, `GET /affiliate/dashboard`, `GET /content/kit`.

Operations: application listing/status, lead listing, enrollment creation.

Finance: commission approval, payout creation/status.

Admin: overview.

Interactive OpenAPI documentation is available at `/docs` and `/redoc`.

Affiliate-private endpoints are ownership-scoped from the authenticated user; client-supplied affiliate IDs are not trusted for those reads.

Admin can set an approved affiliate password through `PATCH /api/v1/admin/affiliates/{affiliate_id}/password` so the local workflow is fully testable without emailing credentials.
