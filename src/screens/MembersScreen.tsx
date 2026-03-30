import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants';
import { ScreenHeader } from '../components/ScreenHeader';
import { EmptyState } from '../components/EmptyState';
import { useHouseStore, selectActiveHouse } from '../contexts/HouseContext';
import { useAuth } from '../contexts/AuthContext';
import { computeScores } from '../services/period';
import { initials } from '../utils';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function MembersScreen() {
  const house = useHouseStore(selectActiveHouse);
  const { user } = useAuth();

  const scores = house ? computeScores(house) : [];
  const myId = user?.uid ?? null;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />

      <ScreenHeader title="Membros" />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>Placar do período</Text>

        {scores.length === 0 ? (
          <EmptyState text="Nenhum membro encontrado." style={styles.emptyCard} />
        ) : (
          <View style={styles.rankList}>
            {scores.map((s, i) => {
              const isMe = s.member.id === myId;
              const medal = MEDALS[i] ?? null;
              return (
                <View key={s.member.id} style={[styles.rankRow, isMe && styles.rankRowMe]}>
                  <View style={styles.rankPosition}>
                    {medal
                      ? <Text style={styles.rankMedal}>{medal}</Text>
                      : <Text style={styles.rankNumber}>{i + 1}</Text>}
                  </View>
                  <View style={styles.rankAvatar}>
                    <Text style={styles.rankAvatarText}>{initials(s.member.name)}</Text>
                  </View>
                  <View style={styles.rankInfo}>
                    <Text style={styles.rankName} numberOfLines={1}>
                      {s.member.name}{isMe ? ' (eu)' : ''}
                    </Text>
                    <Text style={styles.rankSub}>{s.completedTasks} tarefa(s)</Text>
                  </View>
                  <View style={styles.rankPoints}>
                    <Text style={styles.rankPointsValue}>{s.points}</Text>
                    <Text style={styles.rankPointsLabel}>pts</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, gap: 12 },
  sectionLabel: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 12,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  rankList: { gap: 6 },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  rankRowMe: { borderColor: COLORS.red },
  rankPosition: { width: 28, alignItems: 'center' },
  rankMedal: { fontSize: 20 },
  rankNumber: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 15,
    color: COLORS.textMuted,
  },
  rankAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankAvatarText: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 13,
    color: '#fff',
  },
  rankInfo: { flex: 1, gap: 2 },
  rankName: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 15,
    color: COLORS.text,
  },
  rankSub: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 12,
    color: COLORS.textMuted,
  },
  rankPoints: { alignItems: 'flex-end', gap: 1 },
  rankPointsValue: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 20,
    color: COLORS.red,
  },
  rankPointsLabel: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
