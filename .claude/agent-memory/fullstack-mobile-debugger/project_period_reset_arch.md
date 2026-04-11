---
name: Period Reset Architecture
description: How the period reset flow works end-to-end, known bugs found and fixed, and constraints to keep in mind
type: project
---

The period reset runs entirely client-side on Firestore snapshot arrival. There is no Cloud Function.

Flow: onSnapshot → checkAndResetPeriod (period.ts) → if 'reset': runTransaction → tx.update logs/periodStart/history → set({ lastResetInfo }) → set({ houses }) → Firestore triggers second snapshot → second snapshot returns 'none' → no-op.

Key constraint: `lastResetInfo` must only be set AFTER `runTransaction` resolves AND `committedHouse !== null`. If set before the transaction (original bug), it fires spuriously when another client already reset the period (transaction no-op path).

`PeriodResetBanner` component was missing entirely when this was first diagnosed — it had to be created. It lives at `src/components/home/PeriodResetBanner.tsx` and is rendered inside the house content block in HomeScreen, above the top bar.

Timezone handling in checkAndResetPeriod is correct: both sides of the comparison go through `setHours(0,0,0,0)` (local midnight), so they are consistently in local time. Not a bug.

The `??  result.house` fallback in `loaded.push(committedHouse ?? result.house)` uses the pre-reset snapshot data briefly when another client won the race. This is acceptable — the second Firestore snapshot corrects it within seconds.
