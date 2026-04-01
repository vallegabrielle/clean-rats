import { View, Text, StyleSheet } from 'react-native';
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

const PERIOD_LABEL: Record<Period, string> = {
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
};

export function PeriodProgressBar({ house }: { house: House }) {
  if (!house.periodStart) return null;
  const now = new Date();
  const start = new Date(house.periodStart);
  const end = getPeriodEnd(house.period, start);
  const total = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  const progress = Math.min(1, Math.max(0, elapsed / total));
  const msLeft = end.getTime() - now.getTime();
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  const remaining = daysLeft <= 0 ? 'Encerra hoje' : daysLeft === 1 ? '1 dia restante' : `${daysLeft} dias restantes`;

  return (
    <View style={styles.periodContainer}>
      <View style={styles.periodHeader}>
        <Text style={styles.periodLabel}>Período {PERIOD_LABEL[house.period]}</Text>
        <Text style={styles.periodRemaining}>{remaining}</Text>
      </View>
      <View style={styles.periodTrack}>
        <View style={[styles.periodFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
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
    height: 6,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden',
  },
  periodFill: {
    height: '100%',
    backgroundColor: COLORS.red,
    borderRadius: 3,
  },
});
