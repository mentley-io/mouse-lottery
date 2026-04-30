# Mouse Lottery Architecture (Living Document)

Last updated: 2026-04-23
Status: Draft v0.1

## 1. Purpose

This file is the source of truth for project organization and system boundaries.
It must be updated whenever architecture-impacting changes are made.

## 2. Product/Technical Scope (V1)

- Single-screen frontend experience in English.
- Stack: TypeScript + Next.js + NestJS + MongoDB.
- Shared account identity across frontend and backend.
- Admin entry inside frontend, visible only to authorized users.
- One super admin account auto-created at backend startup.
- First section uses YouTube IFrame Player API for live playback.

## 3. Organization Structure

Planned repository structure:

```text
mouse-lottery/
	README.md
	package.json
	docs/
		README.md
		architecture/system-overview.md
		product/game-spec.md
		product/game-spec-zh.md
		api/endpoints.md
		operations/local-dev.md
		admin/admin-playbook.md
		changelog/CHANGELOG.md
	frontend/                  # Next.js app (to be implemented)
	backend/                   # NestJS app (to be implemented)
	shared/                    # Shared types/contracts (to be implemented)
	architecture.md            # This living document
```

Current repository now includes baseline `frontend/`, `backend/`, and `shared/` scaffolding.

## 4. Domain Boundaries

### 4.1 Frontend (Next.js)

- Render single-screen game sections.
- Handle login/register UX and Kenyan phone normalization.
- Show/hide admin entry based on permission payload.
- Render YouTube live section using IFrame Player API.
- Display jackpot, draw numbers, eligibility state, and win state.

### 4.2 Backend (NestJS)

- Auth module: register/login/refresh.
- User and role module: shared account identity and RBAC.
- Admin module: draw interval, YouTube live config, operational controls.
- Lottery module: entry lock, Rule 6 windowing, winning decision, payout split.
- Bootstrap: auto-create super admin if absent.

### 4.3 Database (MongoDB)

- Persist users, roles, entries, draws, configuration, and audit fields.
- Local test URI:
	`mongodb://localhost:27017/mouse_lottery?authSource=admin`

## 5. Rule Ownership

Business-rule authority lives in backend services:

- Eligibility threshold: 500 KES daily wager.
- Re-selection cooldown: 30 minutes.
- Entry validity: each ticket is bound to one target issue (next draw sequence).
- Overlapping sequential combinations crossing current result are invalid.
- Non-winning terminal status: `Expired`.
- Jackpot split strategy: floor division among winners.
- If a user re-submits within the same target issue, previous pending ticket is marked `Voided`.

Frontend only visualizes and guides users; it must not be source of truth for winning logic.

## 6. Auth and Permission Model

- Authentication: JWT access token + refresh token.
- Authorization: role/permission checks at backend endpoint layer.
- Frontend admin entry visibility depends on permission `admin:access`.
- Admin account may also place entries as a player.

## 7. First-Section Live Video Strategy

- Frontend embeds YouTube player via IFrame Player API.
- Backend stores current live video ID in admin-manageable config.
- Admin updates should propagate to frontend without redeploy.

## 8. Event/Data Flow (Initial)

1. User signs up or logs in with Kenyan phone number.
2. Backend returns access/refresh tokens.
3. Frontend loads game state: jackpot, current draw, history, eligibility, and my entries.
4. User selects 4 digits and confirms.
5. Backend stores entry for the target issue (next draw sequence), voiding prior pending entry for the same issue/user.
6. On draw updates, backend evaluates entries and sets result state.
7. Frontend reflects `Won`, `Expired`, or `Voided` states and issue-linked history.

## 9. Architecture Decision Log (ADL)

### ADL-001
- Decision: Shared account model for frontend and backend.
- Reason: prevent identity divergence and simplify permission checks.

### ADL-002
- Decision: Admin entry shown inside frontend, permission-gated.
- Reason: unified product entry while preserving access control.

### ADL-003
- Decision: Super admin auto-bootstrap on startup.
- Reason: deterministic initialization for fresh environments.

### ADL-004
- Decision: Rule 6 enforced server-side only.
- Reason: avoid client drift and cheating vectors.

### ADL-005
- Decision: OTP is deferred (not in V1).
- Reason: reduce implementation risk and ship password-based baseline first.

### ADL-006
- Decision: Realtime delivery starts with polling.
- Reason: lower complexity for first implementation milestone.

### ADL-007
- Decision: Jackpot split remainder is retained by platform.
- Reason: aligns with product-side payout policy.

### ADL-008
- Decision: Frontend polling interval is fixed at 5 seconds for V1.
- Reason: predictable update cadence during MVP rollout.

### ADL-009
- Decision: Frontend retries protected API calls once after automatic refresh token renewal on 401.
- Reason: keep user sessions seamless while preserving short-lived access tokens.

### ADL-010
- Decision: Frontend emits a unified forbidden-event path for 403 responses.
- Reason: provide consistent permission feedback across pages.

### ADL-011
- Decision: Refresh-token renewal is guarded by a single-flight lock in frontend client.
- Reason: avoid duplicate refresh calls when multiple requests fail with 401 simultaneously.

### ADL-012
- Decision: Frontend uses a global toast hub for auth/session/permission feedback.
- Reason: unify UX feedback across pages and reduce duplicated inline handling.

### ADL-013
- Decision: Draw results and betting tickets are persisted in MongoDB with explicit issue sequence numbers.
- Reason: support deterministic history/audit and issue-bound settlement logic.

### ADL-014
- Decision: Ticket settlement is single-issue based; unmatched ticket after corresponding issue draw is marked `Expired`.
- Reason: align game behavior with issue-centric draw model and simplify user expectations.

### ADL-015
- Decision: Re-betting in the same issue invalidates previous pending ticket as `Voided`.
- Reason: ensure one effective active ticket per user per issue while preserving audit trail.

## 10. Living Update Protocol

When implementation changes architecture, update this file in the same change set:

1. Update "Last updated" date.
2. Add/modify ADL entries when decisions change.
3. Keep section 3 (Organization Structure) aligned with real folders.
4. Keep section 5 (Rule Ownership) aligned with backend implementation.
5. Append cross-reference links in [docs/README.md](docs/README.md) if new docs are added.

## 11. Open Questions

No blocking architecture questions at this stage.
