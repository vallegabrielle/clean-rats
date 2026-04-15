// ─── Ad Frequency Cap ────────────────────────────────────────────────────────
// In-memory only. Resets on cold start (intentional).
// Max 1 ad per session, min 5 minutes between ads.

let sessionAdCount = 0;
let lastAdShownAt = 0;

const MAX_PER_SESSION = 5;
const MIN_INTERVAL_MS = 5 * 60 * 1000;

export function canShowAd(): boolean {
  if (sessionAdCount >= MAX_PER_SESSION) return false;
  if (lastAdShownAt > 0 && Date.now() - lastAdShownAt < MIN_INTERVAL_MS) return false;
  return true;
}

export function recordAdShown(): void {
  sessionAdCount++;
  lastAdShownAt = Date.now();
}
