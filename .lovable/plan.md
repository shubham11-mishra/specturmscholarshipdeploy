## Scope decision

Your request covers ~30 distinct improvements across 3 user roles, the assessment engine, the admin panel, and global UX. Doing all of it in one pass will produce shallow changes. I propose splitting it into **5 focused phases** you can approve one at a time. I'll start with Phase 1 once you confirm — or tell me to jump to a specific phase.

Already in place from prior turns:
- Admin sidebar separated, `/admin/*` behind `AdminGuard` (role check + Access Denied screen)
- Supabase RLS: `assessment_questions/sections/passages/user_roles` mutations gated by `has_role(auth.uid(),'admin')`
- Onboarding tour + HelpButton + InfoTip components exist
- Student sidebar already trimmed to: Dashboard, Scholarships, Shortlist, Readiness, AI Copilot, Applications, Wins, Profile

---

## Phase 1 — Access control & role routing (foundational)

- Add `useUserRole()` hook returning `'admin' | 'parent' | 'student'` (reads `user_roles` + `profiles.view_mode`).
- Replace `AppLayout`'s blind "go to /auth if no user" with role-aware redirect:
  - On `/dashboard`: admin → `/admin`, parent → `/parent`, student → student dashboard.
- Harden `AdminGuard` (done) + add `ParentGuard` for `/parent`.
- Top header: show role badge + "Switch to Student/Parent/Admin" only for users who have that role.

## Phase 2 — Student dashboard as a true journey hub

Today `/dashboard` just renders `<Profile />`. Replace with a real dashboard:

```text
[ Welcome, {name} · Year {x} ]   [ Readiness Score ring 0–100 ]
[ Next Step CTA banner ] → smart pick from: complete onboarding → take assessment → review matches → shortlist → start application
[ 3 cards: Top Scholarship Matches | Upcoming Deadlines | Recent AI Copilot tips ]
[ Progress bar across the 5 elements (Earth → Aether) ]
[ Empty / loading / error states for every card ]
```

- Active sidebar item highlighted via `NavLink` (currently uses manual `startsWith` which highlights wrong items).
- Mobile: collapse sidebar into a Sheet drawer (`use-mobile` hook already exists).

## Phase 3 — Assessment flow polish

- Hub: show per-subject status chips (Not started / In progress / Completed · score).
- Take page: confirm dialog on "Submit" if unanswered > 0; autosave indicator.
- Results: ✅ score + section breakdown + weakest topic CTA → "Practice this" link to Copilot. Already awards +15 Readiness Points; add toast on first completion.
- Hook completion → recompute `student_progress` band + emit notification.
- Empty state when no questions exist for a band (currently silent fail).

## Phase 4 — Admin dashboard (replace placeholders with real value)

- Admin home: KPI tiles fetched live: total questions (published/draft), passages, attempts, completed attempts, avg score, active students last 7d.
- Question Bank: read-only searchable list of all questions (filter subject/band/status) — reuses existing admin lib.
- Passage Manager: list/edit passages (the table + RLS already exist).
- User Management: list profiles + grant/revoke `admin` role via `user_roles`.
- Gamification Settings: editable JSON for points-per-action + band thresholds, stored in a new `app_settings` table (single row, admin-only RLS).
- Leave Assessment Editor as-is (already built).

## Phase 5 — Global UX polish

- Toasts on every save/submit/delete (sonner already wired).
- `ConfirmDialog` component used before destructive actions (delete shortlist, revoke invite, delete question, retake assessment).
- `InfoTip` applied to: Readiness Score, Gap Analysis, AI Copilot, Match %.
- Breadcrumbs component in TopHeader for nested routes (`/assessments/english/...`, `/admin/...`).
- 404 + offline + generic error boundary.
- First-time tour already exists; add per-page micro-tours later if needed.

---

## Technical notes

- New tables: `app_settings (key text pk, value jsonb)` with admin-only RLS.
- New hook: `useUserRole`. Existing `useIsAdmin` becomes a thin wrapper.
- No schema changes to assessment tables.
- All role checks are server-enforced via RLS; frontend role checks are UX only.

---

**Which phase do you want me to start with?** Reply "1" (or "all in order") and I'll begin. If you'd rather I just dive in, say "go" and I'll execute Phase 1 → 5 sequentially, pausing only if I hit a decision point.