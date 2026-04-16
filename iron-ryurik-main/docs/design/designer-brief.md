# Designer Brief (Visual Foundation Sprint)

## 1) Product Context
- Product: role-based fitness studio app (`client`, `trainer`, `admin`).
- Platform: web app (Next.js), mobile-first usage is critical.
- Current objective: produce final visual design to replace interim UI with minimal code-level disruption.

## 2) Users and Role Priorities
- **Client:** fastest path to schedule, bookings, diary logging.
- **Trainer:** efficient client context switching, notes, diary updates for client.
- **Admin:** dense operational workflows (schedule, memberships, exercises, client management).

## 3) Screen Inventory and Priority
Source list: `docs/design/screen-inventory.md`.

### Priority A (must design first)
- Auth: login, register, forgot-password, reset-password.
- Client: schedule, bookings, diary list, diary create/edit.
- Trainer: clients list, client details, client diary list/create/edit.
- Admin: schedule list/edit/new, memberships plans list/edit/new, exercises list/edit/new.

### Priority B
- All dashboards (`/client`, `/trainer`, `/admin`), profiles, auxiliary pages.

## 4) Flows to Design
- Auth flow including validation and recovery edge states.
- Client booking flow:
  - discover slot
  - book
  - cancel (with rules feedback)
  - observe history/status.
- Diary flow:
  - create entry
  - edit entry
  - empty history and success feedback.
- Trainer client flow:
  - list -> detail -> notes/diary.
- Admin operations:
  - schedule CRUD
  - memberships CRUD + issuance
  - exercises CRUD.

## 5) Component Matrix (required states)
- Button: `default`, `hover`, `focus`, `active`, `disabled`, `loading`.
- Input/Textarea/Select/Checkbox: `default`, `focus`, `error`, `disabled`, `filled`.
- Tabs: default/active/hover.
- Table: default, compact/mobile behavior, empty state.
- Card: standard, with actions, empty/informational variation.
- Toast/inline messages: success, warning, error, neutral.
- Dialog/confirm patterns: open, destructive confirm, disabled submit.

## 6) Responsive Rules
- Breakpoints to explicitly cover: mobile, tablet, desktop.
- Define behavior for:
  - long tables (scroll vs card transform),
  - action button groups in headers,
  - sidebar/top navigation in role shells,
  - form layout collapsing.

## 7) Visual Direction: Hybrid
- Base mood: clean, professional, high readability.
- Sport accents: restrained and meaningful (states, highlights, key CTAs), not decorative overload.
- Must support dark and light themes.

## 8) Technical Constraints (for implementation)
- UI primitives are in `src/components/ui`.
- Theme tokens are in `src/app/globals.css`.
- Avoid changing business logic in feature actions/queries.
- Final design should map to token + primitive updates where possible.

## 9) Designer Deliverables
- Full page designs for Priority A, then Priority B.
- Component library with variants and states listed above.
- Token spec (colors, typography, spacing, radius, elevation).
- Responsive annotations (mobile/tablet/desktop behavior).
- Handoff notes for edge states (empty/error/loading/not-found).

## 10) Open Questions for Designer Kickoff
- Preferred visual energy level within hybrid direction (conservative vs expressive accents).
- Data-density preference for admin tables on laptop and tablet.
- Whether trainer/client dashboards should share one card language or have role-specific accents.
