import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants';
import { Period } from '../../types';
import { styles } from './styles';

type Props = {
  currentPeriod: Period;
  logCount: number;
  onUpdate: (period: Period) => Promise<void>;
};

export function PeriodOption({ currentPeriod, logCount, onUpdate }: Props) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const periodOptions: { value: Period; label: string }[] = [
    { value: 'weekly', label: t('period.weekly') },
    { value: 'biweekly', label: t('period.biweekly') },
    { value: 'monthly', label: t('period.monthly') },
  ];

  const periodLabels: Record<Period, string> = {
    weekly: t('period.weekly'),
    biweekly: t('period.biweekly'),
    monthly: t('period.monthly'),
  };

  async function confirmAndSelect(period: Period) {
    if (period === currentPeriod) { setEditing(false); return; }

    const message = logCount > 0
      ? t('settings.period.changeWarning', { count: logCount })
      : t('settings.period.changeWarningZero');

    Alert.alert(t('settings.period.changeTitle'), message, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.period.change'),
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await onUpdate(period);
          } finally {
            setLoading(false);
          }
          setEditing(false);
        },
      },
    ]);
  }

  if (!editing) {
    return (
      <TouchableOpacity style={styles.option} onPress={() => setEditing(true)}>
        <Text style={styles.optionIcon}>⏱</Text>
        <Text style={styles.optionText}>{t('period.current')}</Text>
        <Text style={styles.optionDetail}>{periodLabels[currentPeriod]}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.editForm}>
      {loading
        ? <ActivityIndicator color={COLORS.red} style={{ paddingVertical: 14 }} />
        : (
          <View style={styles.periodOptions}>
            {periodOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.periodOption, currentPeriod === opt.value && styles.periodOptionActive]}
                onPress={() => confirmAndSelect(opt.value)}
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
          <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
