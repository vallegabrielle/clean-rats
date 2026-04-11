import { useRef } from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../constants';
import { ScreenHeader } from '../components/ScreenHeader';
import { EmptyState } from '../components/EmptyState';
import { useHouseStore, selectActiveHouse } from '../contexts/HouseContext';
import { useShallow } from 'zustand/react/shallow';
import { useAuth } from '../contexts/AuthContext';
import { computeScores } from '../services/period';
import { initials, avatarColor, swipeStyles } from '../utils';

const MEDALS = ['🥇', '🥈', '🥉'];

function MemberRow({
  memberId,
  memberName,
  rank,
  points,
  completedTasks,
  isMe,
  isFirst,
  onOpen,
  onRemove,
}: {
  memberId: string;
  memberName: string;
  rank: number;
  points: number;
  completedTasks: number;
  isMe: boolean;
  isFirst: boolean;
  onOpen: (ref: Swipeable) => void;
  onRemove: () => void;
}) {
  const swipeRef = useRef<Swipeable>(null);
  const hintAnim = useRef(new Animated.Value(0)).current;
  const hasAnimated = useRef(false);

  function onLayout() {
    if (!isFirst || isMe || hasAnimated.current) return;
    hasAnimated.current = true;
    setTimeout(() => {
      Animated.sequence([
        Animated.timing(hintAnim, { toValue: -18, duration: 250, useNativeDriver: true }),
        Animated.timing(hintAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }, 800);
  }

  const medal = MEDALS[rank] ?? null;

  if (isMe) {
    return (
      <View style={[styles.rankRow, styles.rankRowMe]}>
        <View style={styles.rankPosition}>
          {medal
            ? <Text style={styles.rankMedal}>{medal}</Text>
            : <Text style={styles.rankNumber}>{rank + 1}</Text>}
        </View>
        <View style={[styles.rankAvatar, { backgroundColor: avatarColor(memberId) }]}>
          <Text style={styles.rankAvatarText}>{initials(memberName)}</Text>
        </View>
        <View style={styles.rankInfo}>
          <Text style={styles.rankName} numberOfLines={1}>
            {memberName} (eu)
          </Text>
          <Text style={styles.rankSub}>{completedTasks} tarefa(s)</Text>
        </View>
        <View style={styles.rankPoints}>
          <Text style={styles.rankPointsValue}>{points}</Text>
          <Text style={styles.rankPointsLabel}>pts</Text>
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ translateX: hintAnim }] }} onLayout={onLayout}>
      <Swipeable
        ref={swipeRef}
        renderRightActions={() => (
          <View style={swipeStyles.swipeActions}>
            <TouchableOpacity
              style={swipeStyles.swipeDelete}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                Alert.alert(
                  'Remover membro',
                  `Deseja remover "${memberName}" da toca?`,
                  [
                    { text: 'Cancelar', style: 'cancel', onPress: () => swipeRef.current?.close() },
                    { text: 'Remover', style: 'destructive', onPress: onRemove },
                  ],
                );
              }}
            >
              <Text style={swipeStyles.swipeDeleteText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        rightThreshold={40}
        overshootRight={false}
        onSwipeableWillOpen={() => swipeRef.current && onOpen(swipeRef.current)}
      >
        <View style={styles.rankRow}>
          <View style={styles.rankPosition}>
            {medal
              ? <Text style={styles.rankMedal}>{medal}</Text>
              : <Text style={styles.rankNumber}>{rank + 1}</Text>}
          </View>
          <View style={[styles.rankAvatar, { backgroundColor: avatarColor(memberId) }]}>
            <Text style={styles.rankAvatarText}>{initials(memberName)}</Text>
          </View>
          <View style={styles.rankInfo}>
            <Text style={styles.rankName} numberOfLines={1}>{memberName}</Text>
            <Text style={styles.rankSub}>{completedTasks} tarefa(s)</Text>
          </View>
          <View style={styles.rankPoints}>
            <Text style={styles.rankPointsValue}>{points}</Text>
            <Text style={styles.rankPointsLabel}>pts</Text>
          </View>
        </View>
      </Swipeable>
    </Animated.View>
  );
}

export default function MembersScreen() {
  const house = useHouseStore(selectActiveHouse);
  const { removeMemberFromHouse, logs } = useHouseStore(
    useShallow((s) => ({ removeMemberFromHouse: s.removeMemberFromHouse, logs: s.logs }))
  );
  const { user } = useAuth();

  const scores = house ? computeScores(house, logs) : [];
  const myId = user?.uid ?? null;

  const openSwipeRef = useRef<Swipeable | null>(null);

  function handleSwipeOpen(ref: Swipeable) {
    if (openSwipeRef.current && openSwipeRef.current !== ref) {
      openSwipeRef.current.close();
    }
    openSwipeRef.current = ref;
  }

  // Index of the first non-me member (hint target)
  const firstRemovableIndex = scores.findIndex((s) => s.member.id !== myId);

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
            {scores.map((s, i) => (
              <MemberRow
                key={s.member.id}
                memberId={s.member.id}
                memberName={s.member.name}
                rank={i}
                points={s.points}
                completedTasks={s.completedTasks}
                isMe={s.member.id === myId}
                isFirst={i === firstRemovableIndex}
                onOpen={handleSwipeOpen}
                onRemove={() => house && removeMemberFromHouse(house.id, s.member.id)}
              />
            ))}
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
