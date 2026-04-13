# Clean Rats — Release Testing Checklist

Platform: iOS (primary) + Android (secondary)  
Language: all UI copy is pt-BR — verify no English strings regress into production builds.  
Run this checklist on a physical device whenever possible. Simulator is acceptable for most items, but items marked **[device]** require a real device.

---

## 1. Authentication

- [ ] Google Sign-In completes successfully on iOS (triggers `expo-auth-session` flow, browser opens and returns)
- [ ] Google Sign-In completes successfully on Android
- [ ] Apple Sign-In button is visible on iOS, hidden on Android
- [ ] Apple Sign-In completes successfully on a real iOS device **[device]**
- [ ] First-time Apple Sign-In saves the full name to Firebase `displayName` (Apple only sends it once)
- [ ] Subsequent Apple Sign-In for an existing account does not overwrite display name with null
- [ ] After successful login with no `displayName`, user is routed to `SetDisplayNameScreen` before seeing `HomeScreen`
- [ ] `SetDisplayNameScreen` saves name, sanitizes it (strips control chars, collapses whitespace), and routes to `HomeScreen`
- [ ] Auth loading spinner shows during `onAuthStateChanged` and disappears after it resolves
- [ ] Auth 10-second safety timeout fires correctly if `onAuthStateChanged` never resolves — app unblocks to login screen (simulate by killing network before cold start)
- [ ] Sign-out clears local state and returns to `LoginScreen`
- [ ] Account deletion leaves all houses the user belongs to (or deletes them if last member), clears AsyncStorage, and deletes the Firebase Auth account

---

## 2. Onboarding

- [ ] First launch shows `OnboardingScreen` with 7 slides before any other content
- [ ] Each slide advances correctly via swipe and via the next/arrow button
- [ ] "Pular" (skip) button on any slide marks onboarding complete and proceeds to login
- [ ] After onboarding is marked done (`@cleanrats:onboarding_done` in AsyncStorage), subsequent launches skip it entirely
- [ ] Dot indicators track the active slide accurately across all 7 slides

---

## 3. House Creation

- [ ] Attempting to create with an empty house name shows "Dê um nome para a toca." error
- [ ] Attempting to create with zero tasks selected shows "Adicione pelo menos uma tarefa." error
- [ ] Attempting to create when already in 5 houses shows the "Limite de 5 tocas atingido." error
- [ ] House name is capped at 100 characters; extra characters are silently truncated in the input
- [ ] Prize field is capped at 100 characters
- [ ] All 8 default tasks are shown as chips; each toggles on/off by tap
- [ ] Deselecting all default chips and adding a custom task allows creation
- [ ] Custom task form: points field accepts only numeric input; non-numeric entry shows "Informe uma pontuação válida (mín. 1)."
- [ ] Custom task form: points > 1000 shows "Pontuação máxima: 1000."
- [ ] Custom task form: points = 0 is rejected
- [ ] Custom tasks added during creation appear in the list and can be removed before saving
- [ ] Period selector (Semanal / Quinzenal / Mensal) highlights the selected option and shows the correct reset-day hint text
- [ ] After creation, user lands on `HomeScreen` with the new house as the active house
- [ ] House code is 8 characters from the Crockford Base32 alphabet (no I, L, O, U) — inspect via HouseSettingsModal

---

## 4. Joining a House

- [ ] Entering a valid 8-character code (case-insensitive) sends a join request and shows "Solicitação enviada!" state
- [ ] Entering an invalid or nonexistent code shows "Código não encontrado."
- [ ] Entering a code for a house you are already a member of shows "Você já faz parte desta toca."
- [ ] Entering a code when you already have a pending request for that house shows "Você já enviou uma solicitação."
- [ ] Entering a code when already in 5 houses shows the limit error
- [ ] Deep link `cleanrats://join/<code>` opens `JoinHouseScreen` with the code pre-filled **[device]**
- [ ] Existing member receives a push notification "Nova solicitação 🐀" when someone requests to join **[device]**
- [ ] Rate limit: submitting more than 10 join attempts within 1 hour (via Cloud Function) returns the "Muitas tentativas" error on the 11th attempt

---

## 5. Join Request Approval / Rejection

- [ ] Pending request badge appears in HomeScreen header with correct count when requests exist
- [ ] Tapping the badge opens `HouseSettingsModal` directly to the requests section
- [ ] Approving a request moves the user from `pendingRequests`/`pendingMemberIds` to `members`/`memberIds` in Firestore
- [ ] Rejecting a request removes the user from both pending arrays without adding them to members
- [ ] Approved user receives push notification "Solicitação aceita ✅" **[device]**
- [ ] Rejected user receives push notification "Solicitação recusada" **[device]**
- [ ] After approval, approved user's real-time listener updates — their `pendingHouses` entry disappears and `houses` entry appears with a "Você foi aceito em..." toast
- [ ] Existing members see a "X entrou em Y" toast when a new member is approved while they have the app open

---

## 6. Home Screen — Scores and Feed

- [ ] Score cards show correct points for the current user and the current leader
- [ ] Tie state: when two or more members share the top score, "Empate!" card appears with both names
- [ ] User is leader alone: "Você lidera!" card shows with the name of the second-place member
- [ ] User is the only member: "Você é o líder!" card shows without a comparison name
- [ ] No logs yet: "Nenhuma atividade" card replaces leader card; "Registre a primeira tarefa!" prompt shows
- [ ] Rank medals (🥇 🥈 🥉) and numeric rank (#4, #5…) compute correctly
- [ ] Activity feed is sorted descending by `completedAt`
- [ ] Date separators ("Hoje", "Ontem", named dates) appear correctly between day groups
- [ ] Feed loads 30 items initially; "Carregar mais (N)" button appears when there are more; tapping it loads 30 more
- [ ] Switching active houses resets `visibleCount` to 30
- [ ] Top bar counts (membros, tarefas, atividades, histórico) match actual data
- [ ] Top bar taps navigate to the correct screen or scroll to the feed

---

## 7. Period Progress Bar

- [ ] Bar shows correct label: "Período Semanal", "Período Quinzenal", or "Período Mensal"
- [ ] Progress fill percentage is visually plausible relative to the known period start/end
- [ ] "X dias restantes" count is accurate for all three period types
- [ ] "Encerra hoje" shows on the final day of a period
- [ ] Prize text shows below the bar when a prize is set; absent when no prize
- [ ] Bar is hidden if `periodStart` is missing (legacy houses without the field)

---

## 8. Period Reset

- [ ] Period reset triggers automatically when the app loads or receives an onSnapshot update after a period boundary
- [ ] Reset is executed inside a Firestore transaction — only one client writes; others receive the updated `periodStart` from the transaction re-read
- [ ] `history` array gains a new `PeriodRecord` with correct `periodStart`, `periodEnd`, member scores, and prize
- [ ] Existing period is not double-archived: if `periodStart` is already in `history`, no duplicate entry is added
- [ ] All logs in the `logs` subcollection are batch-deleted after a successful reset commit
- [ ] `PeriodResetBanner` appears only on the client that committed the reset (not on other clients)
- [ ] Banner shows top-3 members with medals, correct point values, and prize if set
- [ ] Dismissing the banner calls `clearResetInfo()` and it does not reappear on the same session
- [ ] Changing period type via `PeriodOption` (with existing logs): current logs are archived to history, then deleted; house starts fresh with new `period` and `periodStart`
- [ ] Changing period type with zero logs: no archive entry is created; period simply resets
- [ ] Cloud Function `onHouseUpdated` sends "Período encerrado! 🏆" push to all members when `periodStart` changes **[device]**
- [ ] If all members scored 0 pts, period-end push body reads "sem pontuação" instead of a winner name

---

## 9. Logging Activity

- [ ] `LogActivityModal` opens from the "+" button on HomeScreen
- [ ] All tasks defined on the house are listed
- [ ] Tapping a task logs it optimistically (appears in feed immediately), then writes to Firestore subcollection
- [ ] Haptic feedback fires on successful log **[device]**
- [ ] "Atividade registrada!" toast appears on success
- [ ] On Firestore write failure: optimistic entry is rolled back; "Sem conexão" or "Erro ao salvar" toast appears
- [ ] Date selector defaults to today; back arrow steps to previous days down to `periodStart` (inclusive)
- [ ] Date selector forward arrow is disabled when the selected date equals today
- [ ] Date selector back arrow is disabled when the selected date equals `periodStart`
- [ ] Logging a task with a past date writes the chosen `completedAt` to Firestore, not `new Date()`
- [ ] Editing an existing log from the feed: `LogActivityModal` opens with the current task highlighted; selecting a different task calls `updateLogInHouse`; date selector is hidden
- [ ] "Tarefa personalizada" button opens `CustomTaskForm`; submitting creates the task on the house AND logs it atomically
- [ ] Cancelling the custom form returns to the task list without side effects
- [ ] Interstitial ad fires on iOS on every 3rd new log (not edits) during the session — test ad ID used in dev, production ID in release **[device]**
- [ ] Cloud Function `onLogCreated` sends push notification to all other house members when a log is created **[device]**

---

## 10. Task Management (TasksScreen)

- [ ] All house tasks are listed with name and points
- [ ] "+" button in header shows/hides the `TaskForm` for adding a new task
- [ ] Adding a task with valid name and points (1–1000) saves to Firestore and shows "Tarefa adicionada!" toast
- [ ] Adding a task with points = 0 is rejected
- [ ] Adding a task with points > 1000 is rejected
- [ ] Swipe-left on a task reveals edit and delete actions (only one swipe open at a time)
- [ ] Editing a task pre-fills the form with current name and points; saving updates Firestore and shows "Tarefa salva!" toast
- [ ] Deleting a task with associated logs shows confirmation text listing the number of logs that will also be deleted
- [ ] Deleting a task with associated logs removes the task AND batch-deletes all orphaned log documents from the subcollection
- [ ] Deleting a task with no logs shows simpler confirmation and removes only the task
- [ ] Empty state "Nenhuma tarefa cadastrada." appears when house has no tasks

---

## 11. Members Screen (Leaderboard)

- [ ] All members are listed, sorted by descending points
- [ ] Current user row has the red border highlight and "(eu)" label; no swipe action
- [ ] Medals show for ranks 1–3; numeric rank for 4+
- [ ] Point values and task counts are correct
- [ ] Swipe-left on any non-self member reveals a remove action
- [ ] Only one swipe is open at a time (other closes when a new one opens)
- [ ] Remove confirmation dialog names the member correctly
- [ ] Confirming removal calls `removeMemberFromHouse` — updates `memberIds` and `members` in Firestore
- [ ] The swipe hint animation plays once on the first non-me member row on initial render
- [ ] Empty state shows when house has no members

---

## 12. History Screen

- [ ] Archived periods are shown in reverse chronological order (most recent first)
- [ ] Each `PeriodCard` shows formatted date range, members sorted by points descending, medals for top 3, and prize if present
- [ ] Period index numbering counts from 1 upward (oldest = 1)
- [ ] `formatDateRange` renders correctly in pt-BR locale (e.g., "01 jan – 31 jan, 2025")
- [ ] Empty state "Nada por aqui ainda" shows when `history` is empty
- [ ] AdBanner renders correctly on iOS without dead whitespace; does not render on Android

---

## 13. House Settings Modal

- [ ] Modal opens from "···" button on HomeScreen and from the pending-requests badge
- [ ] When opened via pending-requests badge, `MembersSection` is pre-expanded showing request rows
- [ ] House name and code are displayed correctly
- [ ] `RenameOption`: editing and saving updates house name in Firestore
- [ ] `PrizeOption`: editing and saving updates or clears the prize in Firestore
- [ ] `PeriodOption`: changing period shows confirmation with log count; confirmed change archives and resets (see section 8)
- [ ] "Compartilhar código" invokes the native share sheet with the correct code and App Store link **[device]**
- [ ] `MembersSection` lists all current members with remove-by-swipe; own row has no swipe action
- [ ] "Sair da toca" asks for confirmation, calls `leaveHouse`, and navigates away
- [ ] If the leaving user is the last member, the house document is deleted from Firestore
- [ ] If other members exist, leaving only removes the user from `memberIds` and `members`
- [ ] Modal can be dismissed by tapping the backdrop or swiping down via pan gesture

---

## 14. Side Menu (SideMenu)

- [ ] Menu opens from the hamburger button on HomeScreen
- [ ] All user's houses are listed; tapping a house sets it as active and persists to AsyncStorage
- [ ] "Nova Toca" navigates to `CreateHouseScreen`
- [ ] "Entrar com código" navigates to `JoinHouseScreen`
- [ ] Pending houses (requests submitted, not yet approved) are shown in a separate section
- [ ] Display name and user rename option are accessible
- [ ] Renaming the display name updates `displayName` in Firebase Auth AND updates the `members` and `history.scores` entries across all houses via `renameCurrentUserInHouses`
- [ ] "Sair da conta" signs out
- [ ] Account deletion option is present and triggers the full deletion flow (leave all houses, clear storage, delete user)
- [ ] Menu closes on backdrop tap and on navigation actions

---

## 15. Offline Behavior and Network Handling

- [ ] `OfflineBanner` slides in when the device loses connectivity **[device]**
- [ ] `OfflineBanner` slides out when connectivity is restored **[device]**
- [ ] Logging a task offline: optimistic update shows in feed; on restore the write succeeds (Firebase SDK queues offline writes)
- [ ] Logging a task offline when the SDK cannot queue (unavailable error): optimistic rollback happens and "Sem conexão. A ação não foi salva." toast appears
- [ ] Creating a house offline: "Sem conexão. Não foi possível criar a toca." error appears
- [ ] Joining a house offline: "Sem conexão. Não foi possível entrar na toca." error appears
- [ ] All destructive actions (remove task, remove log, remove member) surface appropriate offline toasts on failure and rollback optimistic state

---

## 16. Push Notifications

- [ ] On first authenticated launch, `registerForPushNotifications` is called; notification permission prompt appears **[device]**
- [ ] Push token is written to `/users/{uid}` in Firestore with correct `pushToken` and `updatedAt` fields
- [ ] On Android, `setNotificationChannelAsync` is called before requesting permissions
- [ ] If permission is denied, no token write occurs (function returns early)
- [ ] Stale token cleanup: if Expo Push API returns `DeviceNotRegistered` or `InvalidCredentials`, the token field is deleted from Firestore by the Cloud Function
- [ ] Foreground notifications display alert, play sound, and do not set a badge (per `setNotificationHandler` config) **[device]**

---

## 17. Ads (iOS only)

- [ ] ATT (App Tracking Transparency) prompt fires once after first successful login on iOS 14+ **[device]**
- [ ] AdMob SDK is initialized after ATT prompt resolves (not before)
- [ ] `AdBanner` on `HomeScreen` and `HistoryScreen` renders on iOS; returns null on Android
- [ ] `AdBanner` collapses to zero height (no whitespace) when ad fails to load
- [ ] Interstitial ad in `LogActivityModal` is loaded when the modal mounts; fires on every 3rd new log
- [ ] `sessionLogCount` persists across modal opens within the session but resets on app restart
- [ ] In release build: production ad unit IDs are used (not `TestIds`)
- [ ] In dev build: test ad unit IDs are used (never production IDs)

---

## 18. Data Integrity

- [ ] Score computation (`computeScores`) handles a log whose `taskId` no longer exists in `house.tasks` — it contributes 0 points, not NaN or a crash
- [ ] `buildPeriodRecord` correctly snapshots member names at the time of archiving
- [ ] `renameCurrentUserInHouses` updates `memberName` in all existing `history.scores` entries — history does not retain stale names
- [ ] Removing a member does not alter historical period records (member scores remain in `history`)
- [ ] Duplicate history guard: if multiple clients attempt to archive the same period simultaneously, the transaction's `alreadyArchived` check prevents duplicate `PeriodRecord` entries
- [ ] House code uniqueness: codes are 8-char Crockford Base32; no two houses in Firestore have the same code (probabilistically safe, no uniqueness constraint exists — verify by visual inspection of test data)
- [ ] `MAX_TASK_POINTS = 1000` is enforced both client-side (form validation) and in `addTask`/`updateTask` service functions — verify the throw paths

---

## 19. Firestore Security Rules

- [ ] Unauthenticated user cannot read, write, create, or delete any house document
- [ ] Authenticated non-member cannot read a specific house via `get` (only members and pending members can)
- [ ] Authenticated non-member can `list` houses (required for `joinHouseByCode` query) — this is the known broad rule; verify it has not been accidentally tightened or loosened
- [ ] Non-member `update` is limited to adding self to `pendingMemberIds` and `pendingRequests` only — cannot change any other field
- [ ] Non-member cannot remove existing entries from `pendingMemberIds` (rule enforces `nextPending.hasAll(prevPending)`)
- [ ] Member can freely update any field on their house document
- [ ] Only the last remaining member (who is also a member) can delete a house document
- [ ] `/users/{userId}`: only the owner can write their own push token; writes restricted to `pushToken` (string) and `updatedAt` fields only
- [ ] `/users/{userId}`: read is denied for all clients (tokens are read server-side only)
- [ ] `/houses/{houseId}/logs/{logId}`: member can read logs
- [ ] Log create rule: `memberId` must equal the caller's UID; required fields `id`, `taskId`, `memberId`, `completedAt` must all be present
- [ ] Log update: only the original author (`resource.data.memberId == request.auth.uid`) can update their own log
- [ ] Log delete: only the original author can delete their own log — verify that another member cannot delete someone else's log

---

## 20. Navigation and Deep Links

- [ ] `cleanrats://join/<code>` deep link opens the app to `JoinHouseScreen` with code pre-filled when app is backgrounded **[device]**
- [ ] `cleanrats://join/<code>` deep link cold-starts the app and routes correctly after auth resolves **[device]**
- [ ] Back gesture from `TasksScreen`, `MembersScreen`, `HistoryScreen`, `CreateHouseScreen`, `JoinHouseScreen` returns to `HomeScreen`
- [ ] Navigation stack does not accumulate duplicate `Home` entries when navigating back from house creation

---

## 21. Error Boundary and Error States

- [ ] `ErrorBoundary` wraps the entire app — a thrown render error does not produce a blank white screen; verify by temporarily throwing in a child component
- [ ] `Toast` component shows success (green) and error (default) variants; verify both in a single test session
- [ ] All `Alert.alert` confirmation dialogs have both "Cancelar" and destructive action buttons
- [ ] Loading spinners (`ActivityIndicator`) are visible during async operations and disappear on completion or error

---

## 22. Build and Release Hygiene

- [ ] `__DEV__` guard on `seedMockData`: function returns early if not in dev mode
- [ ] The seed mock data button in `HouseSettingsModal` is commented out (not accessible in production)
- [ ] No `console.error` or `console.warn` calls are spamming in a clean production session (use device logs to verify)
- [ ] Production environment variables are set in EAS secrets: `EXPO_PUBLIC_ADMOB_BANNER_IOS_ID`, `EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS_ID`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_REDIRECT_URI`
- [ ] `GoogleService-Info.plist` in the iOS build corresponds to the production Firebase project, not a dev project
- [ ] `google-services.json` in the Android build corresponds to the production Firebase project
- [ ] App bundle ID is `com.gdvll.cleanrats`; verify in Xcode project settings before archive
- [ ] TypeScript compiles without errors: `npx tsc --noEmit`
- [ ] Unit tests pass: `npm test`
- [ ] Expo prebuild (`npx expo prebuild --clean --platform ios`) completes without errors before archiving
