import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';
import { canShowAd, recordAdShown } from './adFrequencyCap';

const adUnitId = __DEV__
  ? TestIds.INTERSTITIAL
  : Platform.select({
      ios: 'ca-app-pub-8864558033968402/8291195810',
      android: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID_ID ?? '',
    }) ?? '';

let ad: InterstitialAd | null = null;
let adLoaded = false;
let initialized = false;
let showPendingUntil = 0;

const PENDING_SHOW_TTL_MS = 10_000;
const ERROR_RETRY_DELAY_MS = 30_000;

function tryShowPending() {
  if (showPendingUntil === 0 || Date.now() > showPendingUntil) return;
  if (!canShowAd() || !adLoaded || !ad) return;
  try {
    ad.show();
    recordAdShown();
    showPendingUntil = 0;
  } catch {
    showPendingUntil = 0;
  }
}

function createAndLoad() {
  if (!adUnitId) return;

  if (ad) ad.removeAllListeners();

  ad = InterstitialAd.createForAdRequest(adUnitId);
  adLoaded = false;

  ad.addAdEventListener(AdEventType.LOADED, () => {
    adLoaded = true;
    tryShowPending();
  });
  ad.addAdEventListener(AdEventType.CLOSED, () => { adLoaded = false; createAndLoad(); });
  ad.addAdEventListener(AdEventType.ERROR, () => {
    adLoaded = false;
    showPendingUntil = 0;
    setTimeout(createAndLoad, ERROR_RETRY_DELAY_MS);
  });

  ad.load();
}

export function initInterstitialAd() {
  if (initialized) return;
  initialized = true;
  createAndLoad();
}

export function maybeShowInterstitial(): boolean {
  if (!canShowAd()) return false;
  if (adLoaded && ad) {
    try {
      ad.show();
      recordAdShown();
      return true;
    } catch {
      return false;
    }
  }
  showPendingUntil = Date.now() + PENDING_SHOW_TTL_MS;
  return false;
}
