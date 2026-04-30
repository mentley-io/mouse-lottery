---
owner: backend
status: draft
updated_at: 2026-04-22
---

# API Endpoints (V1 Draft)

## Auth

### POST /auth/register
- Purpose: Register with Kenyan phone number and password.
- Auth: Public
- Request: `{ phone, password }`
- Response: `{ userId, accessToken, refreshToken }`
- Error Cases: invalid phone format, duplicate phone.

### POST /auth/login
- Purpose: Login with shared account.
- Auth: Public
- Request: `{ phone, password }`
- Response: `{ accessToken, refreshToken, user }`
- Error Cases: invalid credentials.

### POST /auth/refresh
- Purpose: Rotate access token.
- Auth: Refresh token
- Request: `{ refreshToken }`
- Response: `{ accessToken, refreshToken }`
- Error Cases: expired/invalid refresh token.

## User/Game

### GET /game/jackpot
- Purpose: Return current jackpot and target trend metadata.
- Auth: User
- Response: `{ amount, currency, updatedAt }`

### GET /game/current-draw
- Purpose: Return latest draw and live display payload.
- Auth: User

### GET /game/history
- Purpose: Return historical complete draws.
- Auth: User

### GET /eligibility
- Purpose: Return daily wager status vs 500 KES threshold.
- Auth: User
- Response: `{ eligible, wageredKES, requiredKES, missingKES }`

### POST /entries/select
- Purpose: Submit 4-digit selection.
- Auth: User
- Request: `{ digits: [n1,n2,n3,n4] }`
- Response: `{ entryId, lockUntil, validFromDrawNo, validToDrawNo }`
- Error Cases: cooldown active, ineligible user.

### GET /entries/me
- Purpose: Return my active and recent entries.
- Auth: User

## Admin

### GET /admin/me
- Purpose: Return admin permissions for frontend visibility.
- Auth: Admin permission `admin:access`

### PATCH /admin/draw-interval
- Purpose: Update draw interval configuration.
- Auth: Admin permission `draw:manage`
- Request: `{ seconds }`

### GET /admin/live-config
- Purpose: Read YouTube live config.
- Auth: Admin permission `live:manage`

### PATCH /admin/live-config
- Purpose: Update YouTube live video source.
- Auth: Admin permission `live:manage`
- Request: `{ youtubeVideoId }`

### POST /admin/draws
- Purpose: Insert/trigger draw result (MVP simulation).
- Auth: Admin permission `draw:manage`

## Notes

- Contracts will be aligned with shared types in `shared/` once implementation starts.
- Rule 6 validation is authoritative on backend.
