import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, MAX_TASK_POINTS } from '../../constants';
import { styles } from './styles';

type Props = {
  loading: boolean;
  onSubmit: (name: string, points: number) => void;
  onCancel: () => void;
};

export function CustomTaskForm({ loading, onSubmit, onCancel }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [points, setPoints] = useState('');

  const canSubmit = name.trim() && !!points && !loading;

  function handleSubmit() {
    const pts = parseInt(points, 10);
    if (!name.trim() || !pts || pts <= 0 || pts > MAX_TASK_POINTS) return;
    onSubmit(name.trim(), pts);
  }

  return (
    <View style={styles.customForm}>
      <TextInput
        style={styles.input}
        placeholder={t('logActivity.customName')}
        placeholderTextColor={COLORS.textMuted}
        value={name}
        onChangeText={setName}
        maxLength={60}
        editable={!loading}
      />
      <TextInput
        style={styles.input}
        placeholder={t('logActivity.customPoints')}
        placeholderTextColor={COLORS.textMuted}
        value={points}
        onChangeText={setPoints}
        keyboardType="numeric"
        maxLength={4}
        editable={!loading}
      />
      <View style={styles.customActions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={loading}>
          <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmBtn, !canSubmit && styles.confirmBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.confirmBtnText}>{t('logActivity.register')}</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}
