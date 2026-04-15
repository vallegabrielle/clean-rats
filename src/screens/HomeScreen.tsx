import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import { getDateKey, formatDateLabel } from '../utils';
import { useHouseStore, selectActiveHouse } from '../contexts/HouseContext';
import { useShallow } from 'zustand/react/shallow';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList } from '../../App';
import { computeScores } from '../services/period';
import SideMenu from '../components/SideMenu';
import { LogActivityModal } from '../components/LogActivityModal';
import { HouseSettingsModal } from '../components/HouseSettingsModal';
import { EmptyState } from '../components/EmptyState';
import { PeriodProgressBar } from '../components/home/PeriodProgressBar';
import { PeriodResetBanner } from '../components/home/PeriodResetBanner';
import { ActivityItem, DateSeparator } from '../components/home/ActivityItem';
import { AdBanner } from '../components/AdBanner';
import { initInterstitialAd } from '../utils/adManager';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const house = useHouseStore(selectActiveHouse);
  const { loadingHouses: loadingHouse, removeLogFromHouse, logs } = useHouseStore(
    useShallow((s) => ({ loadingHouses: s.loadingHouses, removeLogFromHouse: s.removeLogFromHouse, logs: s.logs }))
  );
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | undefined>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsOpenToRequests, setSettingsOpenToRequests] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30);
  const openSwipeRef = useRef<Swipeable | null>(null);
  const scrollViewRef = useRef<import('react-native').ScrollView>(null);
  const feedY = useRef(0);

  useEffect(() => { setVisibleCount(30); }, [house?.id]);

  // HomeScreen is the first screen rendered after auth + onboarding — ToastProvider
  // is guaranteed mounted here. initInterstitialAd() is idempotent (runs once only).
  useEffect(() => { initInterstitialAd(); }, []);

  function handleSwipeOpen(ref: Swipeable) {
    if (openSwipeRef.current && openSwipeRef.current !== ref) {
      openSwipeRef.current.close();
    }
    openSwipeRef.current = ref;
  }

  function handleEditLog(logId: string) {
    setEditingLogId(logId);
    setLogModalOpen(true);
  }

  function handleDeleteLog(logId: string) {
    Alert.alert(
      'Excluir atividade',
      'Deseja excluir esta atividade?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => removeLogFromHouse(logId) },
      ],
    );
  }

  if (loadingHouse) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar style="light" />
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.red} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // logs come from store (already sorted desc by completedAt)
  const scores = house ? computeScores(house, logs) : [];
  const myMember = house?.members.find((m) => m.id === user?.uid) ?? null;
  const myScore = scores.find((s) => s.member.id === myMember?.id) ?? null;
  const topPoints = scores[0]?.points ?? 0;
  const leaders = scores.filter((s) => s.points === topPoints && topPoints > 0);
  const leader = leaders.length === 1 ? leaders[0] : null;
  const isTied = leaders.length > 1;
  const myRank = myMember
    ? scores.filter((s) => s.points > (myScore?.points ?? 0)).length + 1
    : 0;
  const rankLabel = ({ 1: '🥇', 2: '🥈', 3: '🥉' } as Record<number, string>)[myRank] ?? `#${myRank}`;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />

      {/* Header (takes remaining flex space above the ad banner) */}
      <View style={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuBtn} onPress={() => setMenuOpen(true)}>
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
          <View style={[styles.menuLine, styles.menuLineShort]} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {house ? house.name : 'Clean Rats'}
        </Text>

        {house && (
          <View style={styles.headerActions}>
            {(house.pendingRequests?.length ?? 0) > 0 && (
              <TouchableOpacity
                style={styles.pendingBtn}
                onPress={() => { setSettingsOpenToRequests(true); setSettingsOpen(true); }}
              >
                <Text style={styles.pendingBtnIcon}>👥</Text>
                <View style={styles.pendingBtnBadge}>
                  <Text style={styles.pendingBtnBadgeText}>{house.pendingRequests!.length}</Text>
                </View>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setSettingsOpen(true)}
              accessibilityLabel="Configurações"
              accessibilityRole="button"
            >
              <MaterialIcons name="more-vert" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.logBtn}
              onPress={() => setLogModalOpen(true)}
              accessibilityLabel="Registrar atividade"
              accessibilityRole="button"
            >
              <Text style={styles.logBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Content */}
      {!house ? (
        <View style={styles.emptyState}>
          <Image source={require('../../assets/red_rat.png')} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>Adicione uma toca</Text>
          <Text style={styles.emptySubtitle}>
            Crie ou entre em uma toca para{'\n'}começar a organizar as tarefas.
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('CreateHouse')}>
            <Text style={styles.buttonText}>Criar uma toca</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('JoinHouse')}>
            <Text style={styles.secondaryButtonText}>Entrar com código</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.houseContent}>
        {/* Period reset banner — only visible when this client just performed a reset */}
        <PeriodResetBanner />
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.topBarItem} onPress={() => navigation.navigate('Members')}>
            <Text style={styles.topBarValue}>{house.members.length}</Text>
            <Text style={styles.topBarLabel}>membros</Text>
          </TouchableOpacity>
          <View style={styles.topBarDivider} />
          <TouchableOpacity style={styles.topBarItem} onPress={() => navigation.navigate('Tasks')}>
            <Text style={styles.topBarValue}>{house.tasks.length}</Text>
            <Text style={styles.topBarLabel}>tarefas</Text>
          </TouchableOpacity>
          <View style={styles.topBarDivider} />
          <TouchableOpacity style={styles.topBarItem} onPress={() => scrollViewRef.current?.scrollTo({ y: feedY.current, animated: true })}>
            <Text style={styles.topBarValue}>{logs.length}</Text>
            <Text style={styles.topBarLabel}>atividades</Text>
          </TouchableOpacity>
          <View style={styles.topBarDivider} />
          <TouchableOpacity style={styles.topBarItem} onPress={() => navigation.navigate('History')}>
            <Text style={styles.topBarValue}>{(house.history ?? []).length}</Text>
            <Text style={styles.topBarLabel}>histórico</Text>
          </TouchableOpacity>
        </View>
        <ScrollView ref={scrollViewRef} contentContainerStyle={styles.feed}>
          {/* Scores */}
          {scores.length > 0 && (
            <View style={styles.scoresSection}>
              <Text style={styles.feedLabel}>Placar</Text>
              <View style={styles.scoresRow}>
                {myScore && (
                  <View style={styles.scoreCard}>
                    <Text style={styles.scoreCardLabel} numberOfLines={1}>{myRank > 0 ? `${rankLabel} ` : ''}Meus pontos</Text>
                    <Text style={styles.scoreCardValue} numberOfLines={1}>{myScore.points}</Text>
                    <Text style={styles.scoreCardSub} numberOfLines={1}>{myScore.completedTasks} atividade(s)</Text>
                  </View>
                )}
                {logs.length === 0 ? (
                  <View style={styles.scoreCard}>
                    <Text style={styles.scoreCardLabel} numberOfLines={1}>Nenhuma atividade</Text>
                    <Text style={[styles.scoreCardSub, { marginTop: 6 }]}>🚀 Registre a primeira tarefa!</Text>
                  </View>
                ) : (
                  <>
                    {isTied && (
                      <View style={[styles.scoreCard, styles.scoreCardLeader]}>
                        <Text style={styles.scoreCardLabel} numberOfLines={1}>🏆 Empate!</Text>
                        <Text style={styles.scoreCardValue} numberOfLines={1}>{topPoints} pts</Text>
                        <Text style={styles.scoreCardSub} numberOfLines={1}>{leaders.map((l) => l.member.name).join(' & ')}</Text>
                      </View>
                    )}
                    {leader && leader.member.id !== myMember?.id && (
                      <View style={[styles.scoreCard, styles.scoreCardLeader]}>
                        <Text style={styles.scoreCardLabel} numberOfLines={1}>🏆 Líder</Text>
                        <Text style={styles.scoreCardValue} numberOfLines={1}>{leader.points}</Text>
                        <Text style={styles.scoreCardSub} numberOfLines={1}>{leader.member.name}</Text>
                      </View>
                    )}
                    {leader && leader.member.id === myMember?.id && scores.length === 1 && (
                      <View style={[styles.scoreCard, styles.scoreCardLeader]}>
                        <Text style={styles.scoreCardLabel} numberOfLines={1}>🏆 Você é o líder!</Text>
                        <Text style={styles.scoreCardValue} numberOfLines={1}>{leader.points} pts</Text>
                      </View>
                    )}
                    {leader && leader.member.id === myMember?.id && scores.length > 1 && (
                      <View style={[styles.scoreCard, styles.scoreCardLeader]}>
                        <Text style={styles.scoreCardLabel} numberOfLines={1}>🏆 Você lidera!</Text>
                        <Text style={styles.scoreCardValue} numberOfLines={1}>{leader.points} pts</Text>
                        <Text style={styles.scoreCardSub} numberOfLines={1}>à frente de {scores.find((s) => s.points < leader.points)?.member.name}</Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            </View>
          )}

          {/* Period progress */}
          <PeriodProgressBar house={house} />

          {/* Feed label */}
          <Text style={styles.feedLabel} onLayout={(e) => { feedY.current = e.nativeEvent.layout.y; }}>Atividades recentes</Text>

          {logs.length === 0 ? (
            <EmptyState
              icon="🧹"
              text={"Nenhuma atividade ainda.\nToque em + para registrar."}
              style={styles.emptyFeed}
            />
          ) : (
            <>
              {logs.slice(0, visibleCount).flatMap((log, i) => {
                const dateKey = getDateKey(log.completedAt);
                const prevDateKey = i > 0 ? getDateKey(logs[i - 1].completedAt) : null;
                const items: React.ReactNode[] = [];
                if (dateKey !== prevDateKey) {
                  items.push(<DateSeparator key={`sep-${dateKey}`} label={formatDateLabel(log.completedAt)} />);
                }
                items.push(
                  <ActivityItem
                    key={log.id}
                    log={log}
                    house={house}
                    currentUserId={user?.uid ?? null}
                    onEdit={handleEditLog}
                    onDelete={handleDeleteLog}
                    onOpen={handleSwipeOpen}
                    isFirst={i === 0}
                  />,
                );
                return items;
              })}
              {logs.length > visibleCount && (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={() => setVisibleCount((c) => c + 30)}
                >
                  <Text style={styles.loadMoreText}>
                    Carregar mais ({logs.length - visibleCount})
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

        </ScrollView>
        </View>
      )}

      <HouseSettingsModal
        visible={settingsOpen}
        openToRequests={settingsOpenToRequests}
        onClose={() => { setSettingsOpen(false); setSettingsOpenToRequests(false); }}
      />

      <LogActivityModal
        visible={logModalOpen}
        editingLogId={editingLogId}
        onClose={() => { setLogModalOpen(false); setEditingLogId(undefined); }}
      />

      <SideMenu
        visible={menuOpen}
        onOpen={() => setMenuOpen(true)}
        onClose={() => setMenuOpen(false)}
      />

      </View>

      <AdBanner />

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 16,
  },
  menuBtn: { width: 32, height: 32, justifyContent: 'center', gap: 5 },
  menuLine: { height: 2, backgroundColor: COLORS.text, borderRadius: 2, width: 22 },
  menuLineShort: { width: 14 },
  headerTitle: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 20,
    color: COLORS.text,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logBtnText: { fontSize: 22, color: '#fff', includeFontPadding: false },
  pendingBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBtnIcon: {
    fontSize: 18,
  },
  pendingBtnBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.red,
    borderRadius: 8,
    minWidth: 16,
    paddingHorizontal: 3,
    paddingVertical: 1,
    alignItems: 'center',
  },
  pendingBtnBadgeText: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 9,
    color: '#fff',
    lineHeight: 12,
  },

  // empty (no house)
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIcon: { width: 160, height: 160, marginBottom: 8 },
  emptyTitle: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 28,
    color: COLORS.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  button: {
    backgroundColor: COLORS.red,
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: { fontFamily: 'Bungee_400Regular', fontSize: 15, color: '#fff' },
  secondaryButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryButtonText: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 15,
    color: COLORS.text,
  },

  // feed
  feed: { padding: 20, gap: 10, paddingBottom: 40 },
  feedLabel: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 12,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  scoresSection: {
    gap: 10,
  },
  scoresRow: {
    flexDirection: 'row',
    gap: 10,
  },
  scoreCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 2,
  },
  scoreCardLeader: {
    borderColor: COLORS.red,
  },
  scoreCardLabel: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreCardValue: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 26,
    color: COLORS.text,
  },
  scoreCardSub: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 12,
    color: COLORS.textMuted,
  },
  emptyFeed: { paddingTop: 48 },

  // house content wrapper
  houseContent: {
    flex: 1,
  },

  // top bar
  topBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  topBarItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    gap: 2,
  },
  topBarValue: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 22,
    color: COLORS.text,
  },
  topBarLabel: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 10,
    color: COLORS.red,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  topBarDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginVertical: 10,
  },
  loadMoreBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
  },
  loadMoreText: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 13,
    color: COLORS.textMuted,
  },
});
