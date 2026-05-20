## Pathway-Aware Gap Analysis Upgrade

Transform the Gap Analysis tab into a pathway-aware, brand-aligned experience with exactly 3 dynamically computed recommendations.

### 1. Database — extend `gap_recommendations`

Add columns (migration):
- `pathway` text — one of `academic | stem | arts | sports | leadership | test_readiness`
- `xp_reward` int default 0
- `why_template` text — sentence with `{pathway}` token used for "Why this matters"
- `badge_name` text nullable
- `verifies_evidence` boolean default false

Then seed the action library from the brief (≈25 actions across pathways) via the insert tool. Existing recs without a pathway stay inactive (or get tagged `leadership`).

No new RPC is needed — the top-3 computation runs client-side from `wheel_scores` + `gap_recommendations` (already loaded) so it stays reactive and zero-cost.

### 2. Pathway detection (`src/lib/pathway.ts`, new)

```text
primary  = argmax(academic, stem, arts_creative, sports_fitness)
secondary = 2nd of the 4 if its score is within 2 of primary, else null
```

Strict cross-pathway exclusion map:
- academic → exclude sports, arts (unless secondary)
- sports → exclude arts, stem (unless secondary)
- arts → exclude sports, stem (unless secondary)
- stem → exclude arts, sports (unless secondary)
- leadership + test_readiness are always allowed as supporting

Pathway theme tokens (label, hex, emoji, gradient class).

### 3. Top-3 scoring (`src/lib/gapRanking.ts`, new)

```text
relevance = 1.0 primary | 0.7 secondary | 0.5 leadership/test_readiness | 0
evidence_boost = 1.5 if verifies_evidence and that dimension is unverified, else 1.0
priority = (unlocks × relevance × evidence_boost) / effort_cost   // low=1, med=2, high=3
```

Filter to `score10 <= trigger_score_max` and pathway not excluded; sort desc; take 3. Card 1 = primary pathway color, Card 2 = secondary (or supporting), Card 3 = leadership/test_readiness fallback to ensure variety.

### 4. UI — `src/pages/Readiness.tsx` Gap tab rebuild

Above the cards:
- **Pathway badge row**: compass-pill `🧭 {Primary} pathway` in pathway color + optional smaller `+ {Secondary}` pill.
- **Readiness band card**: one line — `{emoji} {BAND} — {description}` using the new copy.
- **Progression bar**: "You are N actions away from {NextBand}" + rainbow gradient progress (Blue→Green→Gold→Red) showing position toward next band cutoff.

Cards:
- Exactly 3, left accent = pathway color, no "HIGH PRIORITY" pill.
- Pills: `+X scholarships` (green), `Effort: …` (gray), `+XX XP` (blue), `Earns: {badge}` (gold) when present.
- "Why this matters" line under title using `why_template` with `{pathway}` substituted.
- Expanded state shows description + frosted-glass **Start →** button (white/16 + blur-12, rainbow 3px bottom bar).

Keep: header, tab nav, "Show completed" toggle, Copilot link, expand chevron, mark-done flow.

### 5. Brand tokens (`src/index.css`)

Add HSL tokens:
- `--spec-blue`, `--spec-green`, `--spec-gold`, `--spec-red`, `--spec-charcoal`
- `--gradient-rainbow: linear-gradient(90deg, hsl(var(--spec-blue)), hsl(var(--spec-green)), hsl(var(--spec-gold)), hsl(var(--spec-red)))`
- `.btn-frost` utility class for the frosted-glass button + rainbow underline.

### 6. Test cases (manual, via wheel_scores edit)

Verified by switching wheel scores: academic-heavy → 0 sports cards & blue accent; sports-heavy → 0 arts cards & red accent; arts-heavy → 0 sports cards & gold accent.

### Files touched

- migration: add 5 columns to `gap_recommendations`
- insert: seed ~25 actions
- `src/index.css` (brand tokens + frost util)
- `src/lib/pathway.ts` (new)
- `src/lib/gapRanking.ts` (new)
- `src/pages/Readiness.tsx` (Gap tab rebuilt; My Wheel tab untouched)
