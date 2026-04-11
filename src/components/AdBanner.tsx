import { useState } from 'react';
import { Platform, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

// iOS test banner ID provided by the SDK — never use a real ID in __DEV__.
const TEST_BANNER_ID = TestIds.ADAPTIVE_BANNER;

const PROD_BANNER_IOS_ID = process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS_ID ?? '';

const adUnitId = __DEV__ ? TEST_BANNER_ID : PROD_BANNER_IOS_ID;

/**
 * Renders an anchored adaptive banner ad for iOS.
 * Returns null on Android (not yet configured) and collapses to zero height
 * if the ad fails to load, so it never leaves dead whitespace in the layout.
 */
export function AdBanner() {
  const [failed, setFailed] = useState(false);

  if (Platform.OS !== 'ios') return null;
  if (failed) return null;

  return (
    <View>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}
