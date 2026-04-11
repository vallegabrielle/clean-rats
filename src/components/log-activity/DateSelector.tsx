import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../../constants';

type Props = {
  date: Date;
  minDate: Date;
  onChange: (date: Date) => void;
};

function formatLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, today)) return 'Hoje';
  if (isSameDay(date, yesterday)) return 'Ontem';

  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${weekdays[date.getDay()]}, ${day}/${month}`;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function DateSelector({ date, minDate, onChange }: Props) {
  const todayStart = startOfDay(new Date());
  const minStart = startOfDay(minDate);
  const dateStart = startOfDay(date);

  const canGoBack = dateStart > minStart;
  const canGoForward = dateStart < todayStart;

  function shift(days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    onChange(next);
  }

  return (
    <View style={styles.row}>
      <TouchableOpacity
        onPress={() => shift(-1)}
        disabled={!canGoBack}
        style={[styles.arrow, !canGoBack && styles.arrowDisabled]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.arrowText}>‹</Text>
      </TouchableOpacity>

      <Text style={styles.label}>{formatLabel(date)}</Text>

      <TouchableOpacity
        onPress={() => shift(1)}
        disabled={!canGoForward}
        style={[styles.arrow, !canGoForward && styles.arrowDisabled]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.arrowText}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  arrow: {
    width: 28,
    alignItems: 'center',
  },
  arrowDisabled: {
    opacity: 0.25,
  },
  arrowText: {
    fontSize: 22,
    color: COLORS.text,
    lineHeight: 26,
  },
  label: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 14,
    color: COLORS.text,
  },
});
