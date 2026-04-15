import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';
import { canShowAd, recordAdShown } from './adFrequencyCap';

const adUnitId = __DEV__
  ? TestIds.INTERSTITIAL
  : Platform.select({
      ios: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS_ID ?? '',
      android: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID_ID ?? '',
    }) ?? '';

let ad: InterstitialAd | null = null;
let adLoaded = false;

function createAndLoad() {
  ad = InterstitialAd.createForAdRequest(adUnitId);
  adLoaded = false;

  ad.addAdEventListener(AdEventType.LOADED, () => { adLoaded = true; });
  ad.addAdEventListener(AdEventType.CLOSED, () => { adLoaded = false; createAndLoad(); });
  ad.addAdEventListener(AdEventType.ERROR, () => { adLoaded = false; });

  ad.load();
}

/**
 * Call once after MobileAds().initialize() in App.tsx.
 * Preloads the interstitial immediately and auto-reloads after each show.
 */
export function initInterstitialAd() {
  createAndLoad();
}

/**
 * Shows the preloaded interstitial if the frequency cap allows and the ad is ready.
 * Returns true if the ad was shown, false if blocked by cap or no fill.
 * All errors are swallowed — never interrupts the user flow.
 */
export function maybeShowInterstitial(): boolean {
  if (!canShowAd() || !adLoaded || !ad) return false;
  try {
    recordAdShown();
    ad.show();
    return true;
  } catch {
    return false;
  }
}
