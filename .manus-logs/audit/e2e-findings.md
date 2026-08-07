# E2E User Scenario Validation Findings

## Critical Integration Gap Found

### MoveOS REST vs Backend tRPC Mismatch

**MoveOS admin panel** (`moveos/lib/api.ts`) calls REST endpoints:
- POST `/api/owner/login`
- POST `/api/owner/verify-2fa`
- POST `/api/owner/logout`
- GET `/api/owner/dashboard`
- GET `/api/owner/users`
- GET `/api/owner/users/:userId`
- PUT `/api/owner/users/:userId`
- DELETE `/api/owner/users/:userId`
- GET `/api/owner/categories`
- POST `/api/owner/categories`
- PUT `/api/owner/categories/:categoryId`
- DELETE `/api/owner/categories/:categoryId`
- POST `/api/owner/ai-command`
- GET `/api/owner/wallet`
- POST `/api/owner/wallet/withdraw`
- GET `/api/owner/analytics`

**Backend** exposes these through tRPC at `/api/trpc/owner.login`, etc.

**Impact:** MoveOS admin panel CANNOT communicate with backend. All admin operations fail.

**Fix:** Add REST adapter routes to Express server that bridge `/api/owner/*` to tRPC owner procedures.

### Other Findings
- Owner router uses `protectedProcedure` (any authenticated user) instead of `adminProcedure` — authorization gap
- Owner router returns mock data, not real DB queries
- Wallet/Payment/Notification services exist but are NOT mounted in routers.ts
- E2E test file uses non-existent REST endpoints (pre-existing debt)
