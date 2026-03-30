import React, { useState, useRef } from 'react';
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
import { COLORS } from '../constants';
import { formatTime, getDateKey, formatDateLabel, initials, swipeStyles } from '../utils';
import { useHouseStore, selectActiveHouse } from '../contexts/HouseContext';
import { useShallow } from 'zustand/react/shallow';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList } from '../../App';
import { House, TaskLog, Period } from '../types';
import { computeScores } from '../services/period';
import SideMenu from '../components/SideMenu';
import { LogActivityModal } from '../components/LogActivityModal';
import { HouseSettingsModal } from '../components/HouseSettingsModal';
import { EmptyState } from '../components/EmptyState';

type Nav = NativeStackNavigationProp<RootStackParamList>;


function getPeriodEnd(period: Period, periodStart: Date): Date {
  const d = new Date(periodStart);
  if (period === 'weekly') {
    d.setDate(d.getDate() + 7);
  } else if (period === 'biweekly') {
    if (d.getDate() === 1) {
      d.setDate(16);
    } else {
      d.setMonth(d.getMonth() + 1, 1);
    }
  } else {
    d.setMonth(d.getMonth() + 1, 1);
  }
  return d;
}

const PERIOD_LABEL: Record<Period, string> = {
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
};

// ─── Period Progress ──────────────────────────────────────────────────────────

function PeriodProgressBar({ house }: { house: House }) {
  if (!house.periodStart) return null;
  const now = new Date();
  const start = new Date(house.periodStart);
  const end = getPeriodEnd(house.period, start);
  const total = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  const progress = Math.min(1, Math.max(0, elapsed / total));
  const msLeft = end.getTime() - now.getTime();
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  const remaining = daysLeft <= 0 ? 'Encerra hoje' : daysLeft === 1 ? '1 dia restante' : `${daysLeft} dias restantes`;

  return (
    <View style={styles.periodContainer}>
      <View style={styles.periodHeader}>
        <Text style={styles.periodLabel}>Período {PERIOD_LABEL[house.period]}</Text>
        <Text style={styles.periodRemaining}>{remaining}</Text>
      </View>
      <View style={styles.periodTrack}>
        <View style={[styles.periodFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
    </View>
  );
}

// ─── Date Separator ──────────────────────────────────────────────────────────

function DateSeparator({ label }: { label: string }) {
  return (
    <View style={styles.dateSeparator}>
      <View style={styles.dateSeparatorLine} />
      <Text style={styles.dateSeparatorText}>{label}</Text>
      <View style={styles.dateSeparatorLine} />
    </View>
  );
}

// ─── Activity Log Item ────────────────────────────────────────────────────────

function ActivityItem({
  log,
  house,
  currentUserId,
  onEdit,
  onDelete,
  onOpen,
}: {
  log: TaskLog;
  house: House;
  currentUserId: string | null;
  onEdit: (logId: string) => void;
  onDelete: (logId: string) => void;
  onOpen: (ref: Swipeable) => void;
}) {
  const swipeRef = useRef<Swipeable>(null);
  const task = house.tasks.find((t) => t.id === log.taskId);
  const member = house.members.find((m) => m.id === log.memberId);
  if (!task || !member) return null;

  const isOwner = log.memberId === currentUserId;

  function renderRightActions() {
    if (!isOwner) return null;
    return (
      <View style={swipeStyles.swipeActions}>
        <TouchableOpacity style={swipeStyles.swipeEdit} onPress={() => onEdit(log.id)}>
          <Text style={swipeStyles.swipeEditText}>✎</Text>
        </TouchableOpacity>
        <TouchableOpacity style={swipeStyles.swipeDelete} onPress={() => onDelete(log.id)}>
          <Text style={swipeStyles.swipeDeleteText}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
      onSwipeableWillOpen={() => isOwner && swipeRef.current && onOpen(swipeRef.current)}
    >
      <View style={styles.activityItem}>
        <View style={styles.activityAvatar}>
          <Text style={styles.activityAvatarText}>{initials(member.name)}</Text>
        </View>
        <View style={styles.activityInfo}>
          <Text style={styles.activityTask}>{task.name}</Text>
          <Text style={styles.activityMeta}>
            {member.name} · {formatTime(log.completedAt)}
          </Text>
        </View>
        <View style={styles.activityPoints}>
          <Text style={styles.activityPointsValue}>{task.points}</Text>
          <Text style={styles.activityPointsLabel}>pts</Text>
        </View>
      </View>
    </Swipeable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const house = useHouseStore(selectActiveHouse);
  const { loadingHouses: loadingHouse, removeLogFromHouse } = useHouseStore(
    useShallow((s) => ({ loadingHouses: s.loadingHouses, removeLogFromHouse: s.removeLogFromHouse }))
  );
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | undefined>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsOpenToRequests, setSettingsOpenToRequests] = useState(false);
  const openSwipeRef = useRef<Swipeable | null>(null);
  const scrollViewRef = useRef<import('react-native').ScrollView>(null);
  const feedY = useRef(0);

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

  const logs = house
    ? [...new Map(house.logs.map((l) => [l.id, l])).values()].reverse()
    : [];
  const scores = house ? computeScores(house) : [];
  const myMember = house?.members.find((m) => m.id === user?.uid) ?? null;
  const myScore = scores.find((s) => s.member.id === myMember?.id) ?? null;
  const leader = scores[0] ?? null;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />

      {/* Header */}
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
            <TouchableOpacity style={styles.iconBtn} onPress={() => setSettingsOpen(true)}>
              <Text style={styles.iconBtnText}>···</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logBtn} onPress={() => setLogModalOpen(true)}>
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
            <Text style={styles.topBarValue}>{house.logs.length}</Text>
            <Text style={styles.topBarLabel}>atividades</Text>
          </TouchableOpacity>
          <View style={styles.topBarDivider} />
          <TouchableOpacity style={styles.topBarItem} onPress={() => navigation.navigate('History')}>
            <Text style={styles.topBarValue}>{house.history.length}</Text>
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
                    <Text style={styles.scoreCardLabel}>Meus pontos</Text>
                    <Text style={styles.scoreCardValue}>{myScore.points}</Text>
                    <Text style={styles.scoreCardSub}>{myScore.completedTasks} atividade(s)</Text>
                  </View>
                )}
                {logs.length === 0 ? (
                  <View style={[styles.scoreCard, styles.scoreCardLeader]}>
                    <Text style={styles.scoreCardLabel}>Nenhuma atividade</Text>
                    <Text style={[styles.scoreCardSub, { marginTop: 6 }]}>🚀 Registre a primeira tarefa!</Text>
                  </View>
                ) : (
                  <>
                    {leader && leader.member.id !== myMember?.id && (
                      <View style={[styles.scoreCard, styles.scoreCardLeader]}>
                        <Text style={styles.scoreCardLabel}>🏆 Líder</Text>
                        <Text style={styles.scoreCardValue}>{leader.points}</Text>
                        <Text style={styles.scoreCardSub}>{leader.member.name}</Text>
                      </View>
                    )}
                    {leader && leader.member.id === myMember?.id && scores.length === 1 && (
                      <View style={[styles.scoreCard, styles.scoreCardLeader]}>
                        <Text style={styles.scoreCardLabel}>🏆 Você é o líder!</Text>
                        <Text style={styles.scoreCardValue}>{leader.points} pts</Text>
                      </View>
                    )}
                    {leader && leader.member.id === myMember?.id && scores.length > 1 && (
                      <View style={[styles.scoreCard, styles.scoreCardLeader]}>
                        <Text style={styles.scoreCardLabel}>🏆 Você lidera!</Text>
                        <Text style={styles.scoreCardValue}>{leader.points} pts</Text>
                        <Text style={styles.scoreCardSub}>à frente de {scores[1].member.name}</Text>
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
            logs.flatMap((log, i) => {
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
                />,
              );
              return items;
            })
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
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
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
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: {
    fontSize: 24,
    color: COLORS.textMuted,
    letterSpacing: 2,
    lineHeight: 28,
  },
  logBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logBtnText: { fontSize: 22, color: '#fff', lineHeight: 22 },
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
  joinForm: {
    width: '100%',
    gap: 8,
    marginTop: 4,
  },
  joinInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    color: COLORS.text,
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    letterSpacing: 2,
    textAlign: 'center',
  },
  joinError: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 13,
    color: COLORS.danger,
    textAlign: 'center',
  },
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
  buttonDisabled: { opacity: 0.5 },

  // feed
  feed: { padding: 20, gap: 10, paddingBottom: 40 },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  statChip: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 18,
    color: COLORS.text,
  },
  statLabel: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
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
  leaveBtn: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  leaveBtnText: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 14,
    color: COLORS.danger,
    textDecorationLine: 'underline',
  },

  // period progress
  periodContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  periodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  periodLabel: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  periodRemaining: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 12,
    color: COLORS.text,
  },
  periodTrack: {
    height: 6,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden',
  },
  periodFill: {
    height: '100%',
    backgroundColor: COLORS.red,
    borderRadius: 3,
  },

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

  // date separator
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dateSeparatorText: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // activity item
  activityItem: {
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
  activityAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityAvatarText: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 13,
    color: '#fff',
  },
  activityInfo: { flex: 1, gap: 3 },
  activityTask: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 15,
    color: COLORS.text,
  },
  activityMeta: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 12,
    color: COLORS.textMuted,
  },
  activityPoints: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
    minWidth: 48,
  },
  activityPointsValue: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 16,
    color: COLORS.red,
  },
  activityPointsLabel: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
