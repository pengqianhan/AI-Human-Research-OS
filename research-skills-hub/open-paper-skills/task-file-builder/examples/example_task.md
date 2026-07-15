## Objective
Add per-IP rate limiting to `POST /api/login` so that a single IP cannot submit more than 10 login attempts per minute. Exceeding the limit must return HTTP 429 with a `Retry-After` header, without breaking the existing session-cookie flow on successful logins.

## Background & Intent
Support has seen a spike in credential-stuffing attempts over the last two weeks. Product wants a lightweight mitigation shipped before the end of the sprint while we evaluate a full WAF. The login path is the only endpoint in scope for this change — do not add rate limiting anywhere else yet.

## Constraints
- Node 20, Express 4.x — pinned in `package.json`, do not upgrade.
- Rate-limit state must live in the existing Redis instance (`REDIS_URL` env var). Do not add a new in-memory store; the API runs behind 3 replicas.
- Do not change the shape of the successful-login response; frontend parses it strictly.
- Keep the dependency footprint small. `express-rate-limit` + `rate-limit-redis` is acceptable; custom middleware is also fine.

## Acceptance Criteria
- [ ] 11th login attempt from the same IP within 60s returns HTTP 429.
- [ ] 429 response includes a `Retry-After` header in seconds.
- [ ] Successful login still sets the `sid` cookie identically to today (verified against `tests/session.spec.ts`).
- [ ] Counter is shared across replicas (verified by hitting two replicas in a local `docker compose` setup).
- [ ] New tests in `tests/rate-limit.spec.ts` cover: under-limit success, over-limit 429, window reset after 60s.
- [ ] `npm test` passes; no new lint errors.

## Relevant Files / Entry Points
- `src/routes/auth.ts` — current `POST /api/login` handler. Rate-limit middleware should attach here.
- `src/middleware/` — where new middleware should live.
- `src/lib/redis.ts` — existing Redis client; reuse this, don't create a second connection.
- `tests/session.spec.ts` — existing session tests; must still pass unchanged.
- `docker-compose.yml` — use this to verify multi-replica behavior locally.

## Known Context
- A previous attempt used `express-slow-down` and got reverted because it delayed rather than rejected, which confused the frontend. Reject with 429 instead.
- The `X-Forwarded-For` header is trusted — the app sits behind Cloudflare and `app.set('trust proxy', 1)` is already configured in `src/app.ts`.

## Questions
1. Should the 10/min limit apply to *all* login attempts or only failed ones? (If unclear, default to all attempts — simpler and safer.)
