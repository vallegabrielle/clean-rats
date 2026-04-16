import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, MAX_TASK_POINTS } from '../../constants';

const MAX_NAME = 100;

export type EditingTask = { id: string; name: string; points: string };

export function TaskForm({
  initial,
  onConfirm,
  onCancel,
  loading,
}: {
  initial?: EditingTask;
  onConfirm: (name: string, points: number) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name ?? '');
  const [points, setPoints] = useState(initial?.points ?? '');
  const [error, setError] = useState('');

  const canSubmit = name.trim().length > 0 && points.trim().length > 0;

  function handleConfirm() {
    if (!name.trim()) return setError(t('tasks.nameRequired'));
    const pts = parseInt(points, 10);
    if (isNaN(pts) || pts <= 0) return setError(t('tasks.pointsMin'));
    if (pts > MAX_TASK_POINTS) return setError(t('tasks.pointsMax', { max: MAX_TASK_POINTS }));
    setError('');
    onConfirm(name.trim(), pts);
  }

  return (
    <View style={styles.form}>
      <TextInput
        style={styles.input}
        placeholder={t('tasks.name')}
        placeholderTextColor={COLORS.textMuted}
        value={name}
        onChangeText={(v) => { setName(v.slice(0, MAX_NAME)); setError(''); }}
        maxLength={MAX_NAME}
        autoFocus
      />
      <TextInput
        style={styles.input}
        placeholder={t('tasks.points')}
        placeholderTextColor={COLORS.textMuted}
        value={points}
        onChangeText={(v) => { setPoints(v); setError(''); }}
        keyboardType="number-pad"
        maxLength={4}
      />
      {!!error && <Text style={styles.formError}>{error}</Text>}
      <View style={styles.formActions}>
        <TouchableOpacity
          style={[styles.confirmBtn, (!canSubmit || loading) && styles.disabledBtn]}
          onPress={handleConfirm}
          disabled={!canSubmit || loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.confirmBtnText}>
                {initial ? t('common.save') : t('common.add')}
              </Text>
          }
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={loading}>
          <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10,
    padding: 14,
    gap: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 14,
    color: COLORS.text,
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formError: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 13,
    color: COLORS.danger,
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: COLORS.red,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  confirmBtnText: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 14,
    color: '#fff',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 14,
    color: COLORS.textMuted,
  },
});
