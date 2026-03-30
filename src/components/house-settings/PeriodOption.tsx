import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { COLORS } from '../../constants';
import { Period } from '../../types';
import { styles } from './styles';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quinzenal' },
  { value: 'monthly', label: 'Mensal' },
];

const PERIOD_LABELS: Record<Period, string> = {
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
};

type Props = {
  currentPeriod: Period;
  onUpdate: (period: Period) => Promise<void>;
};

export function PeriodOption({ currentPeriod, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  async function select(period: Period) {
    if (period === currentPeriod) { setEditing(false); return; }
    setLoading(true);
    try {
      await onUpdate(period);
    } finally {
      setLoading(false);
    }
    setEditing(false);
  }

  if (!editing) {
    return (
      <TouchableOpacity style={styles.option} onPress={() => setEditing(true)}>
        <Text style={styles.optionIcon}>⏱</Text>
        <Text style={styles.optionText}>Período</Text>
        <Text style={styles.optionDetail}>{PERIOD_LABELS[currentPeriod]}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.editForm}>
      {loading
        ? <ActivityIndicator color={COLORS.red} style={{ paddingVertical: 14 }} />
        : (
          <View style={styles.periodOptions}>
            {PERIOD_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.periodOption, currentPeriod === opt.value && styles.periodOptionActive]}
                onPress={() => select(opt.value)}
              >
                <Text style={[styles.periodOptionText, currentPeriod === opt.value && styles.periodOptionTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )
      }
      {!loading && (
        <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
