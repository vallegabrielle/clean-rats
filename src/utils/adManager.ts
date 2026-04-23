import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';
import { showToast } from '../components/Toast';

const adUnitId = Platform.select({
  ios: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS_ID ?? TestIds.INTERSTITIAL,
  android: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID_ID ?? TestIds.INTERSTITIAL,
}) ?? TestIds.INTERSTITIAL;

let ad: InterstitialAd | null = null;
let adLoaded = false;
let initialized = false;
let showPending = false;

function createAndLoad() {
  if (ad) ad.removeAllListeners();

  ad = InterstitialAd.createForAdRequest(adUnitId);
  adLoaded = false;

  ad.addAdEventListener(AdEventType.LOADED, () => {
    adLoaded = true;
    showToast(`AD loaded, pending=${showPending}`, 'success');
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
    showToast(`AD error, pending=${showPending}`, 'error');
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
  showToast(`showInterstitial: loaded=${adLoaded}`, 'success');
  if (adLoaded && ad) {
    try { ad.show(); } catch { /* silent */ }
  } else {
    showPending = true;
  }
}
