import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants';
import { MemberScore } from '../../types';
import { useHouseStore } from '../../contexts/HouseContext';
import { useShallow } from 'zustand/react/shallow';
import { showInterstitial } from '../../utils/adManager';

interface Props {
  houseId: string;
  scores: MemberScore[];
  prize?: string;
  onDismiss: () => void;
}

function BannerContent({ scores, prize, onDismiss }: Omit<Props, 'houseId'>) {
  const { t } = useTranslation();
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const top3 = scores.slice(0, 3);

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY }], opacity }]}>
      <View style={styles.topRow}>
        <Text style={styles.title}>{t('period.closed')}</Text>
        <TouchableOpacity onPress={onDismiss} hitSlop={12}>
          <Text style={styles.close}>×</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>{t('period.previousResult')}</Text>
      {!!prize && (
        <Text style={styles.prize}>{`🏆 ${t('period.prize')}: ${prize}`}</Text>
      )}
      {top3.map((s, i) => (
        <View key={s.member.id} style={styles.row}>
          <Text style={styles.medal}>
            {(['🥇', '🥈', '🥉'] as const)[i] ?? `${i + 1}.`}
          </Text>
          <Text style={styles.name} numberOfLines={1}>{s.member.name}</Text>
          <Text style={styles.pts}>{s.points} pts</Text>
        </View>
      ))}
    </Animated.View>
  );
}

/**
 * Reads `lastResetInfo` from the house store and renders an animated banner
 * when a period reset was performed by this client in the current session.
 * Dismissing calls `clearResetInfo()` which sets `lastResetInfo` back to null.
 */
export function PeriodResetBanner() {
  const { lastResetInfo, clearResetInfo } = useHouseStore(
    useShallow((s) => ({
      lastResetInfo: s.lastResetInfo,
      clearResetInfo: s.clearResetInfo,
    })),
  );

  // Show the singleton interstitial when a period reset is detected.
  // The ad is already preloaded by adManager — no latency risk.
  // Banner renders regardless of whether the ad fires.
  useEffect(() => {
    if (!lastResetInfo) return;
    showInterstitial();
  }, [lastResetInfo]);

  // Banner renders regardless of whether the ad fires.
  if (!lastResetInfo) return null;

  return (
    <BannerContent
      scores={lastResetInfo.scores}
      prize={lastResetInfo.prize}
      onDismiss={clearResetInfo}
    />
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.red,
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 14,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 14,
    color: COLORS.red,
  },
  close: {
    fontSize: 22,
    color: COLORS.textMuted,
    lineHeight: 22,
  },
  subtitle: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  prize: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 12,
    color: COLORS.text,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  medal: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  name: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 13,
    color: COLORS.text,
    flex: 1,
  },
  pts: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 13,
    color: COLORS.red,
  },
});
