import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants';
import { styles } from './styles';

const MAX_NAME = 100;

type Props = {
  currentName: string;
  onRename: (name: string) => Promise<void>;
};

export function RenameOption({ currentName, onRename }: Props) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function open() {
    setInput(currentName);
    setError('');
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError('');
  }

  async function confirm() {
    if (!input.trim()) return setError(t('house.nameRequired'));
    setLoading(true);
    try {
      await onRename(input.trim());
      setEditing(false);
    } finally {
      setLoading(false);
    }
  }

  if (!editing) {
    return (
      <TouchableOpacity style={styles.option} onPress={open}>
        <Text style={styles.optionIcon}>✎</Text>
        <Text style={styles.optionText}>{t('house.rename')}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.editForm}>
      <TextInput
        style={[styles.input, !!error && styles.inputError]}
        value={input}
        onChangeText={(v) => { setInput(v.slice(0, MAX_NAME)); setError(''); }}
        maxLength={MAX_NAME}
        autoFocus
        placeholderTextColor={COLORS.textMuted}
        placeholder={t('house.name')}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.formActions}>
        <TouchableOpacity
          style={[styles.confirmBtn, (!input.trim() || loading) && styles.disabledBtn]}
          onPress={confirm}
          disabled={!input.trim() || loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.confirmBtnText}>{t('common.save')}</Text>
          }
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={cancel} disabled={loading}>
          <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
