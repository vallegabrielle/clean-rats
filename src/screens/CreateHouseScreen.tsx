import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, DEFAULT_TASKS, MAX_TASK_POINTS } from '../constants';
import { ScreenHeader } from '../components/ScreenHeader';
import { AnimatedButton } from '../components/AnimatedButton';
import { sanitizeName } from '../utils';
import { createHouse } from '../services/house';
import { Period, Task } from '../types';
import { useHouseStore, MAX_HOUSES } from '../contexts/HouseContext';
import { useShallow } from 'zustand/react/shallow';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList } from '../../App';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CreateHouse'>;

type CustomTask = Omit<Task, 'id'>;

const MAX_NAME_LENGTH = 100;
const MAX_PRIZE_LENGTH = 100;

export default function CreateHouseScreen() {
  const navigation = useNavigation<Nav>();
  const { houses, addHouseToList } = useHouseStore(
    useShallow((s) => ({ houses: s.houses, addHouseToList: s.addHouseToList }))
  );
  const { user } = useAuth();

  const [houseName, setHouseName] = useState('');
  const [period, setPeriod] = useState<Period>('monthly');
  const [prize, setPrize] = useState('');

  const [selectedDefaultIndices, setSelectedDefaultIndices] = useState<Set<number>>(
    new Set(DEFAULT_TASKS.map((_, i) => i)),
  );
  const [customTasks, setCustomTasks] = useState<CustomTask[]>([]);

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPoints, setCustomPoints] = useState('');
  const [customFormError, setCustomFormError] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function toggleDefaultTask(index: number) {
    setSelectedDefaultIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function addCustomTask() {
    const pts = parseInt(customPoints, 10);
    if (isNaN(pts) || pts <= 0) {
      setCustomFormError('Informe uma pontuação válida (mín. 1).');
      return;
    }
    if (pts > MAX_TASK_POINTS) {
      setCustomFormError(`Pontuação máxima: ${MAX_TASK_POINTS}.`);
      return;
    }
    setCustomTasks((prev) => [...prev, { name: customName.trim(), points: pts, isDefault: false }]);
    setCustomName('');
    setCustomPoints('');
    setCustomFormError('');
    setShowCustomForm(false);
  }

  function removeCustomTask(index: number) {
    setCustomTasks((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreate() {
    const allTasks = [
      ...DEFAULT_TASKS.filter((_, i) => selectedDefaultIndices.has(i)),
      ...customTasks,
    ];
    if (!houseName.trim()) return setError('Dê um nome para a toca.');
    if (allTasks.length === 0) return setError('Adicione pelo menos uma tarefa.');
    if (houses.length >= MAX_HOUSES) return setError(`Limite de ${MAX_HOUSES} tocas atingido.`);

    setError('');
    setLoading(true);
    try {
      const house = {
        ...createHouse(houseName.trim(), period, user!.uid, sanitizeName(user!.displayName ?? 'Você'), allTasks),
        prize: prize.trim() || undefined,
      };
      await addHouseToList(house);
      navigation.navigate('Home');
    } catch (e) {
      setError('Erro ao criar a toca. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const selectedCount = selectedDefaultIndices.size + customTasks.length;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader title="Criar Toca" />

        <View style={styles.group}>
          <Text style={styles.label}>Nome da toca</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: República das Ratas"
            placeholderTextColor={COLORS.textMuted}
            value={houseName}
            onChangeText={(v) => { setHouseName(v.slice(0, MAX_NAME_LENGTH)); setError(''); }}
            maxLength={MAX_NAME_LENGTH}
          />
        </View>

        <View style={styles.group}>
          <Text style={styles.label}>Prêmio do desafio</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Jantar especial (opcional)"
            placeholderTextColor={COLORS.textMuted}
            value={prize}
            onChangeText={(v) => setPrize(v.slice(0, MAX_PRIZE_LENGTH))}
            maxLength={MAX_PRIZE_LENGTH}
          />
        </View>

        <View style={styles.group}>
          <Text style={styles.label}>Período de pontuação</Text>
          <View style={styles.toggle}>
            <TouchableOpacity
              style={[styles.toggleOption, period === 'weekly' && styles.toggleActive]}
              onPress={() => setPeriod('weekly')}
            >
              <Text style={[styles.toggleText, period === 'weekly' && styles.toggleTextActive]}>
                Semanal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleOption, period === 'biweekly' && styles.toggleActive]}
              onPress={() => setPeriod('biweekly')}
            >
              <Text style={[styles.toggleText, period === 'biweekly' && styles.toggleTextActive]}>
                Quinzenal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleOption, period === 'monthly' && styles.toggleActive]}
              onPress={() => setPeriod('monthly')}
            >
              <Text style={[styles.toggleText, period === 'monthly' && styles.toggleTextActive]}>
                Mensal
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.periodHint}>
            {period === 'weekly' ? 'Reinicia todo domingo.' : period === 'biweekly' ? 'Reinicia nos dias 1° e 16.' : 'Reinicia todo dia 1°.'}
          </Text>
        </View>

        <View style={styles.group}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Tarefas</Text>
            <Text style={styles.taskCount}>{selectedCount} selecionada{selectedCount !== 1 ? 's' : ''}</Text>
          </View>
          <Text style={styles.sectionHint}>Toque para selecionar ou desmarcar as sugestões.</Text>

          <View style={styles.suggestionsGrid}>
            {DEFAULT_TASKS.map((task, i) => {
              const selected = selectedDefaultIndices.has(i);
              return (
                <TouchableOpacity
                  key={task.name}
                  style={[styles.suggestionChip, selected && styles.suggestionChipActive]}
                  onPress={() => toggleDefaultTask(i)}
                >
                  <Text
                    style={[styles.suggestionChipName, selected && styles.suggestionChipTextActive]}
                    numberOfLines={1}
                  >
                    {task.name}
                  </Text>
                  <Text style={[styles.suggestionChipPoints, selected && styles.suggestionChipTextActive]}>
                    {task.points} pts
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {customTasks.length > 0 && (
            <View style={styles.customTasksList}>
              {customTasks.map((task, i) => (
                <View key={`${task.name}-${i}`} style={styles.taskRow}>
                  <Text style={styles.taskName}>{task.name}</Text>
                  <Text style={styles.taskPoints}>{task.points} pts</Text>
                  <TouchableOpacity onPress={() => removeCustomTask(i)} style={styles.removeBtn}>
                    <Text style={styles.removeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {showCustomForm ? (
            <View style={styles.customForm}>
              <TextInput
                style={[styles.input, styles.customInput]}
                placeholder="Nome da tarefa"
                placeholderTextColor={COLORS.textMuted}
                value={customName}
                onChangeText={(v) => { setCustomName(v.slice(0, MAX_NAME_LENGTH)); setCustomFormError(''); }}
                maxLength={MAX_NAME_LENGTH}
              />
              <TextInput
                style={[styles.input, styles.customInput]}
                placeholder="Pontuação (máx. 1000)"
                placeholderTextColor={COLORS.textMuted}
                value={customPoints}
                onChangeText={(v) => { setCustomPoints(v); setCustomFormError(''); }}
                keyboardType="number-pad"
                maxLength={4}
              />
              {!!customFormError && <Text style={styles.error}>{customFormError}</Text>}
              <View style={styles.customFormActions}>
                <TouchableOpacity
                  style={[styles.confirmBtn, (!customName.trim() || !customPoints.trim()) && styles.buttonDisabled]}
                  onPress={addCustomTask}
                  disabled={!customName.trim() || !customPoints.trim()}
                >
                  <Text style={styles.confirmBtnText}>Adicionar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => { setShowCustomForm(false); setCustomName(''); setCustomPoints(''); setCustomFormError(''); }}
                >
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.addCustomBtn} onPress={() => setShowCustomForm(true)}>
              <Text style={styles.addCustomBtnText}>+ Criar tarefa personalizada</Text>
            </TouchableOpacity>
          )}
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <AnimatedButton
          label="Criar Toca"
          onPress={handleCreate}
          loading={loading}
          disabled={loading}
          style={styles.button}
          textStyle={styles.buttonText}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  label: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 13,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  taskCount: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 12,
    color: COLORS.red,
  },
  sectionHint: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  suggestionChip: {
    width: '48%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 2,
  },
  suggestionChipActive: {
    backgroundColor: COLORS.red,
    borderColor: COLORS.red,
  },
  suggestionChipName: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 14,
    color: COLORS.text,
  },
  suggestionChipPoints: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 11,
    color: COLORS.textMuted,
  },
  suggestionChipTextActive: {
    color: '#fff',
  },
  customTasksList: {
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 16,
    color: COLORS.text,
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: COLORS.red,
  },
  toggleText: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 15,
    color: COLORS.textMuted,
  },
  toggleTextActive: {
    color: '#fff',
  },
  periodHint: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 8,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    marginBottom: 8,
    gap: 12,
  },
  taskName: {
    flex: 1,
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 15,
    color: COLORS.text,
  },
  taskPoints: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 13,
    color: COLORS.red,
  },
  removeBtn: {
    padding: 4,
  },
  removeBtnText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  customForm: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10,
    padding: 14,
    gap: 10,
    marginTop: 4,
  },
  customInput: {
    marginBottom: 0,
  },
  customFormActions: {
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
  addCustomBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addCustomBtnText: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 14,
    color: COLORS.textMuted,
  },
  error: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 14,
    color: COLORS.danger,
    marginBottom: 8,
  },
  button: {
    backgroundColor: COLORS.red,
    borderRadius: 10,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 16,
    color: '#fff',
  },
});
