import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';

const adUnitId = Platform.select({
  ios: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS_ID ?? TestIds.INTERSTITIAL,
  android: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID_ID ?? TestIds.INTERSTITIAL,
}) ?? TestIds.INTERSTITIAL;

let ad: InterstitialAd | null = null;
let adLoaded = false;
let initialized = false;

function createAndLoad() {
  if (ad) ad.removeAllListeners();
  ad = InterstitialAd.createForAdRequest(adUnitId);
  adLoaded = false;
  ad.addAdEventListener(AdEventType.LOADED, () => { adLoaded = true; });
  ad.addAdEventListener(AdEventType.CLOSED, () => { adLoaded = false; createAndLoad(); });
  ad.addAdEventListener(AdEventType.ERROR, () => { adLoaded = false; setTimeout(createAndLoad, 30_000); });
  ad.load();
}

export function initInterstitialAd() {
  if (initialized) return;
  initialized = true;
  createAndLoad();
}

// Returns true if the ad was shown. Caller should retry if false.
export function showInterstitial(): boolean {
  if (adLoaded && ad) {
    try {
      ad.show();
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
