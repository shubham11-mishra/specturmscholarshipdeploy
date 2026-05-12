
# Phase 1.5 + Phase 2 — Implementation Plan

This is a large scope. I'll deliver in two staged passes so you can verify between them. Where the spec references DB columns/tables that don't exist in your current schema (e.g. `dimension_scores`, `readiness_snapshots`, `applications`, `shortlists`, `match_year_levels`, `win_probability_base`, `prep_product`), I'll adapt to the existing schema (`wheel_scores`, `student_progress`, `navigator_shortlist`, `scholarships`) so nothing breaks.

---

## Pass A — Phase 1.5 Fix-Up

### A1. Brand rename "Scholarship Searcher" → "Spectrum Navigator"
- Sweep `index.html` (title, meta), `Navbar`, `HeroSection`, footer, alt text, comments
- Replace wordmark text per spec; keep compass mark

### A2. Spectrum Wheel: 6 → 8 dimensions
- DB migration: add columns to `wheel_scores`:
  `arts_creative_self`, `service_community_self`, `interview_self` (+ `_verified` siblings) and rename roles via aliases (keep existing `arts_self`, `sports_self`, `leadership_self`, `test_readiness_self`, `academic_self`, `stem_self`)
- Backfill existing rows: copy `arts_self → arts_creative_self`; default new dims to 5
- Update `src/lib/navigator.ts` `WHEEL_DIMENSIONS` to the 8-item list with exact emoji + scale hints
- Add `src/lib/readiness.ts` with `wheelAverageToScore` + `BAND_CUTOFFS`
- Update Spectrum Wheel radar chart (`src/components/navigator/SpectrumWheel.tsx`) to render 8 spokes
- Show one-time banner for users still on 5/10 defaults for new dims

### A3. The 4 bugs
- **Bug 1 — Postcode autofill**: use existing `src/data/auPostcodes.json`; add `lookupPostcode()` helper; wire into onboarding Step 1 + `ProfileEdit`. Suburb dropdown if multiple; state read-only with manual override
- **Bug 2 — Drop "Target schools" chips**, replace with single free-text "Dream schools" input writing to `profiles.target_schools` as comma-split array (reuse existing column)
- **Bug 3 — Email-already-registered check on Step 1** with debounced `profiles.email` lookup, inline error + Sign in link, disable Continue
- **Bug 4 — "← Back to Goals" ghost button** on Step 5

### A4. 5-Element Journey strip
- Current band: filled card in band colour, white text, "YOU ARE HERE" pill top-right
- Render the same strip on `/dashboard` below hero

### A5. URL/Nav consolidation
- Routes: `/dashboard` (rename of current `/profile`), `/wheel` (alias of `/navigator`), new read-only `/profile`, keep `/profile/edit`
- Stub pages for `/scholarships`, `/readiness`, `/copilot`, `/applications` (filled in Pass B for `/scholarships`)
- Navbar: logged-in vs logged-out variants per spec; shortlist heart with count badge

---

## Pass B — Phase 2 Scholarships

### B1. Match engine — `src/lib/matching.ts`
- `calculateMatch(student, scholarship)` using available fields: parse `year_levels` text → number list; treat `state` null as national; baseline = 50 (no `win_probability_base` column)
- `getCategoryBoost` mapped to the 8 wheel dims
- `classifyTier` → best_fit / stretch / fast_win using parsed `days_left`
- `isLockedForBand` + `getUnlockRequirement` per spec (elite school list)

### B2. `/scholarships` list page
- Header + 3 stat cards (Best-Fit / Stretch / Fast-Win)
- Sticky filter row: tier chips, category, state (default user state), Locked-only toggle, search
- Sort: Match % / Deadline / Value / A-Z
- Scholarship card: category icon, name, tier pill, band tag, school + location, deadline, value, heart, match bar
- Locked card variant with unlock requirements
- Load-more pagination (25 at a time, client-side after fetch+match)
- Server: fetch up to 200 candidates filtered by state OR null + year level using ilike on `year_levels`; compute match client-side; cache via React Query

### B3. `/scholarships/:id` detail page
- Hero with name, school, overview, value, deadline, shortlist + open-source-url buttons (per memory: external URL primary)
- Win Probability gauge + tier + "Start Application" CTA (writes to a new lightweight `applications` table)
- Why It Fits (computed reasons) / What You Need (locked variant)
- Eligibility list from `eligibility_criteria`
- Application Checklist with localStorage persistence
- Prep recommendation strip — hidden (no `prep_product` field)

### B4. Shortlist
- Already wired via `navigator_shortlist`; add filled-heart UI + sonner toasts
- Nav badge with count
- `/shortlist` already exists — restyle to match new card and sort-by-deadline default

### B5. Database additions
- Migration: `applications` table (`user_id`, `scholarship_id`, `status`, timestamps) with RLS for own rows
- Indexes on `scholarships(state)`, `navigator_shortlist(user_id)`

### B6. Dashboard stat refresh
- Eligible = scholarships where match ≥ 50 (computed once after profile load)
- Shortlisted = navigator_shortlist count
- Wheel average from 8 dims; show band emoji

---

## Schema-adaptation notes (technical)
- Spec calls for `dimension_scores` + `readiness_snapshots`; your schema uses `wheel_scores` + `student_progress`. I'll keep using those.
- Spec assumes `match_year_levels: number[]` and `win_probability_base: number`. Your `scholarships` table stores `year_levels` and `value_num` as text. I'll parse on read.
- Spec's "Aether-locking" `win_probability_base < 30` rule will fall back to elite-school name list only.
- New `applications` table is needed (does not exist).

---

## Delivery order
1. Pass A migration (wheel_scores columns + applications table can also go here to save a round trip)
2. Pass A code edits (brand, wheel UI, bugs, nav, routes, journey strip)
3. Pass B code (matching engine, /scholarships list, detail, shortlist polish, dashboard refresh)
4. Verify build, then you test in preview

Reply "go" to start with Pass A migration, or tell me anything to adjust (e.g. skip a section, defer a bug, change route names).
