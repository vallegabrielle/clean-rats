// ─── Ad Frequency Cap ────────────────────────────────────────────────────────
// In-memory only. Resets on cold start (intentional).
// Min 5 minutes between ads, no per-session cap.

let lastAdShownAt = 0;

const MIN_INTERVAL_MS = 30 * 1000;

export function canShowAd(): boolean {
  if (lastAdShownAt > 0 && Date.now() - lastAdShownAt < MIN_INTERVAL_MS) return false;
  return true;
}

export function recordAdShown(): void {
  lastAdShownAt = Date.now();
}
