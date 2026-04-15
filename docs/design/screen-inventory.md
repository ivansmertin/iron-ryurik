# Screen Inventory (Role-based)

## Auth
- `/login` -> `src/app/(auth)/login/page.tsx`
- `/register` -> `src/app/(auth)/register/page.tsx`
- `/forgot-password` -> `src/app/(auth)/forgot-password/page.tsx`
- `/reset-password` -> `src/app/(auth)/reset-password/page.tsx`

## Client
- `/client` -> `src/app/(client)/client/page.tsx`
- `/client/schedule` -> `src/app/(client)/client/schedule/page.tsx`
- `/client/bookings` -> `src/app/(client)/client/bookings/page.tsx`
- `/client/diary` -> `src/app/(client)/client/diary/page.tsx`
- `/client/diary/new` -> `src/app/(client)/client/diary/new/page.tsx`
- `/client/diary/[id]` -> `src/app/(client)/client/diary/[id]/page.tsx`
- `/client/profile` -> `src/app/(client)/client/profile/page.tsx`

## Trainer
- `/trainer` -> `src/app/(trainer)/trainer/page.tsx`
- `/trainer/slots` -> `src/app/(trainer)/trainer/slots/page.tsx`
- `/trainer/slots/new` -> `src/app/(trainer)/trainer/slots/new/page.tsx`
- `/trainer/slots/[id]` -> `src/app/(trainer)/trainer/slots/[id]/page.tsx`
- `/trainer/clients` -> `src/app/(trainer)/trainer/clients/page.tsx`
- `/trainer/clients/[id]` -> `src/app/(trainer)/trainer/clients/[id]/page.tsx`
- `/trainer/clients/[id]/notes` -> `src/app/(trainer)/trainer/clients/[id]/notes/page.tsx`
- `/trainer/clients/[id]/diary` -> `src/app/(trainer)/trainer/clients/[id]/diary/page.tsx`
- `/trainer/clients/[id]/diary/new` -> `src/app/(trainer)/trainer/clients/[id]/diary/new/page.tsx`
- `/trainer/clients/[id]/diary/[entryId]` -> `src/app/(trainer)/trainer/clients/[id]/diary/[entryId]/page.tsx`

## Admin
- `/admin` -> `src/app/(admin)/admin/page.tsx`
- `/admin/schedule` -> `src/app/(admin)/admin/schedule/page.tsx`
- `/admin/schedule/new` -> `src/app/(admin)/admin/schedule/new/page.tsx`
- `/admin/schedule/[id]` -> `src/app/(admin)/admin/schedule/[id]/page.tsx`
- `/admin/clients` -> `src/app/(admin)/admin/clients/page.tsx`
- `/admin/clients/[id]` -> `src/app/(admin)/admin/clients/[id]/page.tsx`
- `/admin/memberships` -> `src/app/(admin)/admin/memberships/page.tsx`
- `/admin/memberships/plans` -> `src/app/(admin)/admin/memberships/plans/page.tsx`
- `/admin/memberships/plans/new` -> `src/app/(admin)/admin/memberships/plans/new/page.tsx`
- `/admin/memberships/plans/[id]` -> `src/app/(admin)/admin/memberships/plans/[id]/page.tsx`
- `/admin/exercises` -> `src/app/(admin)/admin/exercises/page.tsx`
- `/admin/exercises/new` -> `src/app/(admin)/admin/exercises/new/page.tsx`
- `/admin/exercises/[id]` -> `src/app/(admin)/admin/exercises/[id]/page.tsx`
- `/admin/profile` -> `src/app/(admin)/admin/profile/page.tsx`

## Key Flows to Design
- Auth flow: login/register/password reset.
- Client flow: schedule -> booking/cancel -> bookings history -> diary create/edit.
- Trainer flow: clients list -> client detail -> notes/diary.
- Admin flow: schedule CRUD, memberships CRUD/issuance, exercises CRUD.

## Missing System States (to include in designer brief)
- Segment-level `loading` screen patterns.
- Segment-level `error` patterns.
- Segment-level `not-found` patterns for dynamic routes.
