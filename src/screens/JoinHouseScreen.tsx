import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { AnimatedButton } from '../components/AnimatedButton';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../constants';
import { useHouseStore } from '../contexts/HouseContext';
import { RootStackParamList } from '../../App';

type Nav = NativeStackNavigationProp<RootStackParamList, 'JoinHouse'>;
type RouteType = RouteProp<RootStackParamList, 'JoinHouse'>;

export default function JoinHouseScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteType>();
  const joinHouseByCode = useHouseStore((s) => s.joinHouseByCode);

  const [code, setCode] = useState(route.params?.code ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingHouseName, setPendingHouseName] = useState('');

  async function handleJoin() {
    if (!code.trim()) return setError('Informe o código da toca.');
    setError('');
    setLoading(true);
    try {
      const result = await joinHouseByCode(code.trim());
      if (result.pending) {
        setPendingHouseName(code.toUpperCase().trim());
      } else if (result.success) {
        navigation.navigate('Home');
      } else {
        setError(result.error ?? 'Erro ao entrar na toca.');
      }
    } catch (e) {
      console.error('[JoinHouse]', (e as any)?.code ?? (e as any)?.message);
      setError('Erro ao entrar na toca. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  if (pendingHouseName) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <View style={styles.container}>
          <Text style={styles.title}>Solicitação enviada!</Text>
          <Text style={styles.subtitle}>
            Aguardando aprovação de um membro da toca {pendingHouseName}.
            {'\n\n'}Você será notificado quando aceito.
          </Text>
          <AnimatedButton
            label="Voltar ao início"
            onPress={() => navigation.navigate('Home')}
            style={styles.button}
          />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Entrar na Toca</Text>
        <Text style={styles.subtitle}>Insira o código compartilhado pelo criador</Text>

        <View style={styles.group}>
          <Text style={styles.label}>Código da toca</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: AB12CD34"
            placeholderTextColor={COLORS.textMuted}
            value={code}
            onChangeText={(v) => { setCode(v.toUpperCase()); setError(''); }}
            maxLength={8}
            autoCapitalize="characters"
            autoFocus
          />
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <AnimatedButton
          label="Entrar na Toca"
          onPress={handleJoin}
          disabled={!code.trim()}
          loading={loading}
          style={styles.button}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
  },
  backBtn: {
    marginBottom: 32,
  },
  backBtnText: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 14,
    color: COLORS.textMuted,
  },
  title: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 36,
    color: COLORS.text,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 15,
    color: COLORS.textMuted,
    marginBottom: 36,
  },
  group: {
    marginBottom: 28,
  },
  label: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 13,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 16,
    color: COLORS.text,
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    textAlign: 'center',
    letterSpacing: 8,
  },
  error: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 14,
    color: COLORS.danger,
    marginBottom: 16,
  },
  button: {
    backgroundColor: COLORS.red,
    borderRadius: 10,
    padding: 18,
    alignItems: 'center',
  },
});
