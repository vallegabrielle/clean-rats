import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { showToast } from '../components/Toast';

// TEMP: usando TestIds para validar o fluxo — trocar de volta para IDs reais após confirmar
const adUnitId = TestIds.INTERSTITIAL;

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
