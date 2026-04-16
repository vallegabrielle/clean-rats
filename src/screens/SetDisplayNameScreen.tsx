import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants';
import { useAuth } from '../contexts/AuthContext';

export default function SetDisplayNameScreen() {
  const { t } = useTranslation();
  const { updateDisplayName } = useAuth();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const trimmed = name.trim();

  async function handleConfirm() {
    if (!trimmed) return;
    setLoading(true);
    setError('');
    try {
      await updateDisplayName(trimmed);
    } catch {
      setError(t('displayName.saveError'));
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <Text style={styles.title}>{t('displayName.title')}</Text>
        <Text style={styles.subtitle}>
          {t('displayName.subtitle')}
        </Text>

        <TextInput
          style={styles.input}
          placeholder={t('displayName.placeholder')}
          placeholderTextColor={COLORS.textMuted}
          value={name}
          onChangeText={setName}
          autoFocus
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={handleConfirm}
          maxLength={40}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.btn, (!trimmed || loading) && styles.btnDisabled]}
          onPress={handleConfirm}
          disabled={!trimmed || loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>{t('displayName.continue')}</Text>
          }
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  title: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 28,
    color: COLORS.text,
  },
  subtitle: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
    marginTop: -8,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    color: COLORS.text,
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 16,
    marginTop: 8,
  },
  error: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 13,
    color: COLORS.danger,
  },
  btn: {
    backgroundColor: COLORS.red,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnText: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 15,
    color: '#fff',
  },
});
