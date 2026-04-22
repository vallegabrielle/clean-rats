import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';

const adUnitId = __DEV__
  ? TestIds.INTERSTITIAL
  : Platform.select({
      ios: 'ca-app-pub-8864558033968402/8291195810',
      android: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID_ID ?? '',
    }) ?? '';

let ad: InterstitialAd | null = null;
let adLoaded = false;
let initialized = false;
let showPending = false;

function createAndLoad() {
  if (!adUnitId) return;
  if (ad) ad.removeAllListeners();

  ad = InterstitialAd.createForAdRequest(adUnitId);
  adLoaded = false;

  ad.addAdEventListener(AdEventType.LOADED, () => {
    adLoaded = true;
    if (showPending) {
      showPending = false;
      try { ad?.show(); } catch { /* silent */ }
    }
  });
  ad.addAdEventListener(AdEventType.CLOSED, () => {
    adLoaded = false;
    createAndLoad();
  });
  ad.addAdEventListener(AdEventType.ERROR, () => {
    adLoaded = false;
    showPending = false;
    setTimeout(createAndLoad, 30_000);
  });

  ad.load();
}

export function initInterstitialAd() {
  if (initialized) return;
  initialized = true;
  createAndLoad();
}

export function showInterstitial() {
  if (adLoaded && ad) {
    try { ad.show(); } catch { /* silent */ }
  } else {
    showPending = true;
  }
}
