---
name: Clean Rats — Project Overview
description: Core context about what Clean Rats is, its tech stack, domain model, and current state
type: project
---

Clean Rats is a React Native (Expo ~54) app for gamifying household chore division among roommates. It is written in Portuguese (pt-BR). Backend is Firebase (Firestore + Auth).

**What it does:** Users create or join a "toca" (house), define tasks with point values, log completed chores, and compete on a leaderboard. Periods (weekly/biweekly/monthly) auto-reset; history is archived. Prizes can be set per house.

**Tech stack:**
- Expo ~54 / React Native 0.81.5 / React 19
- Firebase SDK v12 (Firestore real-time listeners + Auth)
- Zustand v5 (global state — HouseContext + AuthContext)
- React Navigation v6 (native stack)
- expo-haptics, expo-auth-session, expo-apple-authentication
- @react-native-async-storage (local persistence of activeHouseId)

**Domain model (src/types/index.ts):**
- House: contains all data inline — members[], memberIds[], tasks[], logs[], history[], pendingRequests[], periodStart, period, prize
- TaskLog: { id, taskId, memberId, completedAt (ISO string) }
- PeriodRecord: archived when period resets — includes scores[] and prize snapshot
- Member: { id (Firebase UID), name }
- Max 5 houses per user

**Key architectural facts:**
- All house data lives in a single Firestore document per house (denormalized). No subcollections.
- Period reset happens client-side in onSnapshot callback using a Firestore transaction to prevent race conditions between multiple clients.
- The entire logs[] array is stored on the house document — no pagination or subcollection for logs.
- Score computation (computeScores/computePeriodScores) is fully client-side, runs on every render.
- All members can edit/delete any task, any log, remove any member (no role system).
- Firestore rules: authenticated members can update anything on the house document freely. Non-members can only add themselves to pendingMemberIds/pendingRequests.
- `allow list: if isAuth()` — any authenticated user can list all houses (mitigated by recommending App Check in comments).

**Auth:**
- Google OAuth (expo-auth-session) + Apple Sign-In (iOS only)
- No email/password option
- Single loading state; no re-auth flow for sensitive actions

**Screens:**
- LoginScreen, OnboardingScreen (7 slides, skippable)
- HomeScreen (feed, scores, period bar, period reset banner)
- TasksScreen (CRUD tasks via swipe)
- HistoryScreen (archived periods)
- MembersScreen (leaderboard + swipe-to-remove)
- CreateHouseScreen, JoinHouseScreen
- HouseSettingsModal (rename, prize, period change, share code, leave)
- LogActivityModal (log a task or create custom one-off task)

**Language:** All UI copy is in Brazilian Portuguese.

**Why:** Personal project for a household (likely small group). Not a commercial product yet.

**How to apply:** Frame all suggestions in the context of a small-team personal project that may grow. Prioritize correctness, data integrity, and UX polish over enterprise-scale concerns.
