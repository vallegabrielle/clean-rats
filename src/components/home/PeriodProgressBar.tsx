import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants';
import { House, Period } from '../../types';

function getPeriodEnd(period: Period, periodStart: Date): Date {
  const d = new Date(periodStart);
  if (period === 'weekly') {
    d.setDate(d.getDate() + 7);
  } else if (period === 'biweekly') {
    if (d.getDate() === 1) {
      d.setDate(16);
    } else {
      d.setMonth(d.getMonth() + 1, 1);
    }
  } else {
    d.setMonth(d.getMonth() + 1, 1);
  }
  return d;
}

export function PeriodProgressBar({ house }: { house: House }) {
  const { t } = useTranslation();

  if (!house.periodStart) return null;
  const now = new Date();
  const start = new Date(house.periodStart);
  const end = getPeriodEnd(house.period, start);
  const total = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  const progress = Math.min(1, Math.max(0, elapsed / total));
  const msLeft = end.getTime() - now.getTime();
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  const remaining = daysLeft <= 0 ? t('period.endsToday') : t('period.daysLeft', { count: daysLeft });

  return (
    <View style={styles.periodContainer}>
      <View style={styles.periodHeader}>
        <Text style={styles.periodLabel}>{t('period.current') + ' '}{t(`period.${house.period}`)}</Text>
        <Text style={styles.periodRemaining}>{remaining}</Text>
      </View>
      <View
        style={styles.periodTrack}
        accessibilityRole="progressbar"
        accessibilityLabel={t('period.progressA11y', { percent: Math.round(progress * 100) })}
        accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      >
        <View style={[styles.periodFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
      {!!house.prize && (
        <Text style={styles.prize}>🏆 {house.prize}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  periodContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  periodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  periodLabel: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  periodRemaining: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 12,
    color: COLORS.text,
  },
  periodTrack: {
    height: 8,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden',
  },
  periodFill: {
    height: '100%',
    backgroundColor: COLORS.red,
    borderRadius: 3,
  },
  prize: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
