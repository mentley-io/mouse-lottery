---
owner: operations
status: draft
updated_at: 2026-04-22
---

# Admin Playbook

## Access Model

- Admin entry appears in frontend only for users with `admin:access`.
- Admin users can still access frontend game as regular players.

## Primary Admin Actions (V1)

1. Update draw interval.
2. Update YouTube live source.
3. Trigger or import draw result (MVP path).
4. Review draw history and entry states.

## Permission Matrix (Draft)

- `admin:access`: show admin entry in frontend
- `draw:manage`: modify draw interval and draw operations
- `live:manage`: update YouTube live configuration
- `users:read`: read player and entry overview

## Operational Notes

- Changes to live config should propagate quickly to frontend.
- Draw interval changes must be auditable.
- Rule 6 matching logic cannot be overridden from admin UI.
