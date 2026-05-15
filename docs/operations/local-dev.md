---
owner: platform
status: draft
updated_at: 2026-05-14
---

# Local Development

## Local MongoDB

Connection string:
- `mongodb://localhost:27017/mouse_lottery?authSource=admin`

## Environment Variables (Draft)

- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `SUPER_ADMIN_PHONE`
- `SUPER_ADMIN_PASSWORD`
- `NEXT_PUBLIC_API_BASE_URL`

## Super Admin Bootstrap

On backend startup:
1. Check whether a super admin account exists.
2. If not, create from environment variables.
3. If yes, skip creation.

## Dev Run Strategy (Planned)

- Root command starts frontend and backend together.
- Frontend default: single-screen game page.
- Backend default: REST API + polling updates in V1.

## Test Commands

- `npm run test:e2e:wallet`
  - Runs deterministic end-to-end validation for jackpot split, wallet crediting, and wallet credit history API.

## Confirmed V1 Decisions

- OTP: disabled for V1.
- Realtime mode: polling-first.
- Polling interval: fixed at 5 seconds.
- Jackpot remainder after floor split: platform retained.
- Access token renewal: frontend auto-refreshes once on 401 and retries original request.
- Permission feedback: frontend uses unified handling for 403 responses.
