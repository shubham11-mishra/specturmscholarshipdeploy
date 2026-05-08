# Spectrum Platform — Build Plan

The spec covers ~8 major features, gamification, an AI Copilot, and 8 new database tables. That's weeks of work — too much to ship in one pass without it being broken. I'll execute it in **5 phases**, each shipping a usable slice. After each phase you preview, then we move to the next.

---

## Phase 1 — Foundation (this turn)

**Database** (one migration, all 8 tables + RLS):
- `student_profile` — onboarding answers (state-aware fields, citizenship, indigenous, regional, sibling, religion)
- `student_dimensions` — 7 readiness scores per student (Academic, Leadership, Service, Co-curricular, Interview, Materials, Verification) + computed band
- `student_evidence` — uploaded reports, certificates, NAPLAN
- `student_extracurriculars` — activity + level (school/regional/state/national) + years
- `student_target_schools` — chosen schools, boarding/day, fee tolerance
- `student_badges` — badge_code, earned_at, evidence_link
- `student_streaks` — streak_type, current/longest count
- `student_points_log` — activity → dimension → points (audit trail for scores)

**Replace `/` with new app shell**:
- New routes: `/onboarding`, `/dashboard`, `/matches`, `/gaps`, `/copilot`, `/hub`, `/calendar`, `/profile`
- Sidebar layout (shadcn sidebar), Spectrum branding kept
- Old scholarship search becomes `/matches` tab
- Auto-redirect to `/onboarding` if profile incomplete, else `/dashboard`

**5-step onboarding wizard** (`/onboarding`):
1. About You — state, year level, citizenship, ATSI, regional, sibling, religion
2. Academic — **state-aware fields** (NSW HSC bands / VIC VCE / QLD A-E + 1-7 / etc., dynamic by state+year)
3. Extracurriculars — activity + level + years + free-text "Tell us more"
4. Goals — searchable schools, selective options, boarding/day, fee tolerance
5. Matches — preview top scholarships

## Phase 2 — Readiness Dashboard + Gap Analysis

- 5-band visual (Earth → Aether) with the 7 dimensions as radar chart
- Transparency panel (why this band, confidence indicator, "may be eligible for" softening)
- Gap Analysis screen: prioritised actions, 70/30 generic vs Spectrum recommendations
- Real-time score updates when activities logged

## Phase 3 — Application Hub + Calendar

- Kanban (Not Started / In Progress / Submitted / Outcome)
- Per-application checklists, document repository, outcome tracking with reasons
- Deadline calendar with reminder flags

## Phase 4 — Gamification Layer

- Points system wired into `student_points_log` → updates `student_dimensions` in real time
- Badge system (Foundation/Skill/Activation/Mastery/Excellence + cross-tier) — auto-awarded via DB trigger
- Streaks (login, weekly check-in)
- XP visualisation on dashboard

## Phase 5 — AI Copilot

- Edge function `copilot-chat` using Lovable AI Gateway (`google/gemini-3-flash-preview`)
- Three-layer architecture: LLM + context injection (student profile/scores/gaps/matches) + system-prompt guardrails
- `copilot_conversations` + `copilot_messages` tables with `context_snapshot` JSONB for debuggability
- Streaming chat UI at `/copilot`

---

## Technical notes

- Stack: existing React + Tailwind + Supabase. No new frontend deps beyond `recharts` (radar chart) and `@dnd-kit/sortable` (kanban).
- All 7 dimensions and 5 bands modelled as Postgres enums for type safety.
- Score → band mapping done in a Postgres function `compute_band(score int)` so it's consistent everywhere.
- Profile completeness check via DB function `profile_completeness(user_id)` — drives onboarding redirect.
- Gamification is additive: existing `scholarships` table and shortlist features stay intact.

---

## What I'll do right now if you approve

Phase 1 only:
1. Run the migration creating all 8 tables, enums, RLS policies, helper functions, and the auto-badge trigger for "First Steps" on signup.
2. Build the new sidebar shell + routing.
3. Build the 5-step onboarding wizard with state-aware Academic step.
4. Stub the other pages (`/dashboard`, `/matches`, `/gaps`, `/copilot`, `/hub`, `/calendar`) with "Coming in Phase X" placeholders so navigation works.

Approve this plan and I'll start with the migration.