import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';
import { showToast } from '../components/Toast';

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
  if (!adUnitId) {
    showToast('AD: adUnitId vazio!', 'error');
    return;
  }
  showToast(`AD: carregando... (pending=${showPending})`, 'success');
  if (ad) ad.removeAllListeners();

  ad = InterstitialAd.createForAdRequest(adUnitId);
  adLoaded = false;

  ad.addAdEventListener(AdEventType.LOADED, () => {
    adLoaded = true;
    showToast(`AD: carregado! pending=${showPending}`, 'success');
    if (showPending) {
      showPending = false;
      try { ad?.show(); } catch (e) { showToast(`AD: show() falhou: ${e}`, 'error'); }
    }
  });
  ad.addAdEventListener(AdEventType.CLOSED, () => {
    adLoaded = false;
    createAndLoad();
  });
  ad.addAdEventListener(AdEventType.ERROR, (e) => {
    adLoaded = false;
    showToast(`AD: erro ao carregar: ${JSON.stringify(e)}`, 'error');
    setTimeout(createAndLoad, 30_000);
  });

  ad.load();
}

export function initInterstitialAd() {
  showToast(`AD: init (já inicializado=${initialized})`, 'success');
  if (initialized) return;
  initialized = true;
  createAndLoad();
}

export function showInterstitial() {
  showToast(`AD: showInterstitial (loaded=${adLoaded}, pending=${showPending})`, 'success');
  if (adLoaded && ad) {
    try {
      ad.show();
      showToast('AD: show() chamado!', 'success');
    } catch (e) {
      showToast(`AD: show() throw: ${e}`, 'error');
    }
  } else {
    showPending = true;
    showToast('AD: ad não pronto, setou pending', 'error');
  }
}
