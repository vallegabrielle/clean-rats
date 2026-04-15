import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';
import { canShowAd, recordAdShown } from './adFrequencyCap';
import { showToast } from '../components/Toast';

const adUnitId = __DEV__
  ? TestIds.INTERSTITIAL
  : Platform.select({
      ios: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS_ID ?? '',
      android: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID_ID ?? '',
    }) ?? '';

let ad: InterstitialAd | null = null;
let adLoaded = false;

function createAndLoad() {
  if (!adUnitId) {
    showToast('[AD] erro: adUnitId vazio (variavel de env nao definida)', 'error');
    return;
  }

  if (ad) ad.removeAllListeners();

  ad = InterstitialAd.createForAdRequest(adUnitId);
  adLoaded = false;

  ad.addAdEventListener(AdEventType.LOADED, () => {
    adLoaded = true;
    showToast('[AD] carregado', 'success');
  });
  ad.addAdEventListener(AdEventType.CLOSED, () => { adLoaded = false; createAndLoad(); });
  ad.addAdEventListener(AdEventType.ERROR, (e: unknown) => {
    adLoaded = false;
    const msg = e instanceof Error ? e.message : String(e);
    showToast(`[AD] erro: ${msg}`, 'error');
  });

  ad.load();
}

/**
 * Call once after MobileAds().initialize() in App.tsx.
 * Preloads the interstitial immediately and auto-reloads after each show.
 */
export function initInterstitialAd() {
  // Log the resolved unit ID so you can confirm the correct ID is baked into
  // the build. In production __DEV__ is false, so the real env var is used.
  // If this toast shows an empty string or the banner ID, the env var is wrong.
  showToast(`[AD] init id=${adUnitId || '(vazio)'}`, 'success');
  createAndLoad();
}

/**
 * Shows the preloaded interstitial if the frequency cap allows and the ad is ready.
 * Returns true if the ad was shown, false if blocked by cap or no fill.
 */
export function maybeShowInterstitial(): boolean {
  if (!canShowAd()) { showToast('[AD] bloqueado: cap', 'error'); return false; }
  if (!adLoaded)    { showToast('[AD] nao carregado', 'error'); return false; }
  if (!ad)          { showToast('[AD] sem instancia', 'error'); return false; }
  try {
    ad.show();
    recordAdShown();
    showToast('[AD] exibindo!', 'success');
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    showToast(`[AD] show() falhou: ${msg}`, 'error');
    return false;
  }
}
