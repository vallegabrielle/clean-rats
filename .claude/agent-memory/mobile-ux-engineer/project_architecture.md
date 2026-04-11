---
name: Clean Rats — project architecture snapshot
description: Core tech stack, data model, and key architectural decisions for the Clean Rats household chore tracking app
type: project
---

Clean Rats is an Expo ~54 / React Native 0.81 app targeting iOS and Android (App Store review scope).

**Stack**
- State: Zustand (v5) — HouseStore + AuthStore, no Context API
- Backend: Firestore (Firebase v12) + Firebase Auth (Google + Apple Sign-In)
- Navigation: React Navigation v6 native-stack
- Gestures: react-native-gesture-handler ~2.28
- Haptics: expo-haptics (already installed)
- No Reanimated in package.json — only the core Animated API is available unless added
- Language: TypeScript, Portuguese UI copy throughout

**Firestore schema (single collection)**
- `/houses/{houseId}` — contains everything: members[], memberIds[], tasks[], logs[], pendingRequests[], pendingMemberIds[], period, periodStart, history[], prize?, code, name
- No top-level `/users` collection exists — user data lives only inside house documents
- Period reset is handled client-side via a Firestore transaction in the onSnapshot listener (checkAndResetPeriod in services/period.ts)

**Key app flows**
- Logging a task: logTaskInHouse → updateDoc on active house
- Joining: joinHouseByCode → writes pendingRequests/pendingMemberIds; admin approves via approveJoinRequest
- Period reset: detected on snapshot, written via transaction; surfaces as PeriodResetBanner (lastResetInfo in store) only on the client that won the transaction race
- Toast system: showToast() exists and is used for new-member join events (fires from HouseContext onSnapshot diff)

**Expo config (app.config.js)**
- bundleIdentifier: com.gdvll.cleanrats
- android package: com.gdvll.cleanrats
- EAS projectId: 58ffff89-2dd4-4649-87b7-79630c98065b
- google-services.json already referenced for Android
- No expo-notifications plugin yet
- iOS: no GoogleService-Info.plist reference yet (needs adding for FCM on iOS)

**Why:** Understanding this prevents suggesting solutions that conflict with the existing client-side-only architecture (e.g., no Cloud Functions currently deployed).
**How to apply:** Any notification plan must account for the absence of a backend trigger layer — the realistic path is either client-side FCM HTTP calls or a lightweight Cloud Functions layer added specifically for notifications.
