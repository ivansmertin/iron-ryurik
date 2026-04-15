# UI Audit (Visual Foundation Sprint)

## Scope
- Auth, Client, Trainer, Admin key routes.
- Shared UI layer in `src/components/ui` and cross-role primitives in `src/components/admin`.
- Visual style target: `hybrid` (clean base + sporty accents).

## Current Strengths
- Theme tokens are centralized in `src/app/globals.css`.
- Shared primitives are already present (`Button`, `Input`, `Card`, `Table`, `Badge`, `Dialog`).
- Role shells are consistent (sidebar + topbar + content area).

## P0 Findings (must fix in sprint)
- Inconsistent form controls: raw `select`/`checkbox` styles differ across forms.
- Inline status/error messages use mixed hardcoded colors (`text-red-600`, `text-emerald-600`) instead of a shared message pattern.
- Missing documented visual contract for component states (`default/hover/focus/disabled/loading/error/success`).

## P1 Findings (should fix in sprint)
- Role pages use the same patterns but without documented rules, making future design handoff risky.
- Critical state screens are not systematized at segment level (`loading.tsx`, `error.tsx`, `not-found.tsx`).
- Table-heavy pages depend on horizontal scrolling and need explicit designer guidance for mobile fallback.

## P2 Findings (later backlog)
- Dashboard stat-card style can be formalized into a single presentation pattern.
- Empty-state copy and iconography can be unified after designer pass.

## Applied Visual Foundation Decisions
- Add shared primitives:
  - `src/components/ui/select.tsx`
  - `src/components/ui/checkbox.tsx`
  - `src/components/ui/inline-message.tsx`
- Replace ad-hoc controls/messages in high-impact forms first (auth + workouts + memberships).

## Open Risks
- Over-customizing interim visual style before final design could increase rework.
- Need strict boundary: only presentation layer changes, no business logic shifts.
