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

function createAndLoad() {
  if (!adUnitId) return;

  if (ad) ad.removeAllListeners();

  ad = InterstitialAd.createForAdRequest(adUnitId);
  adLoaded = false;

  ad.addAdEventListener(AdEventType.LOADED, () => { adLoaded = true; });
  ad.addAdEventListener(AdEventType.CLOSED, () => { adLoaded = false; createAndLoad(); });
  ad.addAdEventListener(AdEventType.ERROR, () => { adLoaded = false; });

  ad.load();
}

export function initInterstitialAd() {
  if (initialized) return;
  initialized = true;
  createAndLoad();
}

export function maybeShowInterstitial(): boolean {
  if (!canShowAd() || !adLoaded || !ad) return false;
  try {
    ad.show();
    recordAdShown();
    return true;
  } catch {
    return false;
  }
}
