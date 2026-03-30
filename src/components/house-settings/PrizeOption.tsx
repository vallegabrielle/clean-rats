import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { COLORS } from '../../constants';
import { styles } from './styles';

const MAX_PRIZE = 100;

type Props = {
  currentPrize: string | undefined;
  onUpdate: (prize: string) => Promise<void>;
};

export function PrizeOption({ currentPrize, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  function open() {
    setInput(currentPrize ?? '');
    setEditing(true);
  }

  async function confirm() {
    setLoading(true);
    try {
      await onUpdate(input.trim());
      setEditing(false);
    } finally {
      setLoading(false);
    }
  }

  if (!editing) {
    return (
      <TouchableOpacity style={styles.option} onPress={open}>
        <Text style={styles.optionIcon}>🏆</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.optionText, { flex: undefined }]}>Prêmio do desafio</Text>
          {currentPrize
            ? <Text style={styles.optionDetail} numberOfLines={1} ellipsizeMode="tail">{currentPrize}</Text>
            : <Text style={styles.prizeHint}>Toque para definir o prêmio do vencedor</Text>
          }
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.editForm}>
      <TextInput
        style={styles.input}
        value={input}
        onChangeText={(v) => setInput(v.slice(0, MAX_PRIZE))}
        maxLength={MAX_PRIZE}
        autoFocus
        placeholderTextColor={COLORS.textMuted}
        placeholder="Ex: Pizza para todos!"
      />
      <View style={styles.formActions}>
        <TouchableOpacity
          style={[styles.confirmBtn, loading && styles.disabledBtn]}
          onPress={confirm}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.confirmBtnText}>Salvar</Text>
          }
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)} disabled={loading}>
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
