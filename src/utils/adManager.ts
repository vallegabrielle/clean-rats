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
const TAG = '[AdManager]';

function tryShowPending() {
  const expired = showPendingUntil === 0 || Date.now() > showPendingUntil;
  console.log(TAG, 'tryShowPending', { expired, canShow: canShowAd(), adLoaded, hasAd: !!ad });
  if (expired) return;
  if (!canShowAd() || !adLoaded || !ad) return;
  try {
    console.log(TAG, 'showing pending ad');
    ad.show();
    recordAdShown();
    showPendingUntil = 0;
  } catch (e) {
    console.log(TAG, 'tryShowPending show() threw:', e);
    showPendingUntil = 0;
  }
}

function createAndLoad() {
  console.log(TAG, 'createAndLoad', { adUnitId: adUnitId || '(empty)' });
  if (!adUnitId) {
    console.log(TAG, 'ERROR: adUnitId is empty — ad will never load');
    return;
  }

  if (ad) ad.removeAllListeners();

  ad = InterstitialAd.createForAdRequest(adUnitId);
  adLoaded = false;

  ad.addAdEventListener(AdEventType.LOADED, () => {
    console.log(TAG, 'LOADED');
    adLoaded = true;
    tryShowPending();
  });
  ad.addAdEventListener(AdEventType.CLOSED, () => {
    console.log(TAG, 'CLOSED — reloading');
    adLoaded = false;
    createAndLoad();
  });
  ad.addAdEventListener(AdEventType.ERROR, (error) => {
    console.log(TAG, 'ERROR:', error);
    adLoaded = false;
    showPendingUntil = 0;
    setTimeout(createAndLoad, ERROR_RETRY_DELAY_MS);
  });

  ad.load();
}

export function initInterstitialAd() {
  console.log(TAG, 'initInterstitialAd', { alreadyInitialized: initialized });
  if (initialized) return;
  initialized = true;
  createAndLoad();
}

export function maybeShowInterstitial(): boolean {
  const cap = canShowAd();
  console.log(TAG, 'maybeShowInterstitial', { canShowAd: cap, adLoaded, hasAd: !!ad, showPendingUntil });
  if (!cap) {
    console.log(TAG, 'blocked by frequency cap');
    return false;
  }
  if (adLoaded && ad) {
    try {
      console.log(TAG, 'calling ad.show()');
      ad.show();
      recordAdShown();
      console.log(TAG, 'ad.show() succeeded');
      return true;
    } catch (e) {
      console.log(TAG, 'ad.show() threw:', e);
      return false;
    }
  }
  console.log(TAG, 'ad not ready — queuing pending show for 10s');
  showPendingUntil = Date.now() + PENDING_SHOW_TTL_MS;
  return false;
}
