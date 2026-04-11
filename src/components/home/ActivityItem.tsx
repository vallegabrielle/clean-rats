import { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Swipeable } from 'react-native-gesture-handler';
import { COLORS } from '../../constants';
import { formatTime, initials, swipeStyles, avatarColor } from '../../utils';
import { House, TaskLog } from '../../types';

export function DateSeparator({ label }: { label: string }) {
  return (
    <View style={styles.dateSeparator}>
      <View style={styles.dateSeparatorLine} />
      <Text style={styles.dateSeparatorText}>{label}</Text>
      <View style={styles.dateSeparatorLine} />
    </View>
  );
}

export function ActivityItem({
  log,
  house,
  currentUserId,
  onEdit,
  onDelete,
  onOpen,
  isFirst,
}: {
  log: TaskLog;
  house: House;
  currentUserId: string | null;
  onEdit: (logId: string) => void;
  onDelete: (logId: string) => void;
  onOpen: (ref: Swipeable) => void;
  isFirst?: boolean;
}) {
  const swipeRef = useRef<Swipeable>(null);
  const hintAnim = useRef(new Animated.Value(0)).current;
  const task = house.tasks.find((t) => t.id === log.taskId);
  const member = house.members.find((m) => m.id === log.memberId);

  const isOwner = log.memberId === currentUserId;

  useEffect(() => {
    if (!isFirst || !isOwner) return;
    const timer = setTimeout(() => {
      Animated.sequence([
        Animated.timing(hintAnim, { toValue: -18, duration: 250, useNativeDriver: true }),
        Animated.timing(hintAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  if (!task || !member) return null;

  function renderRightActions() {
    if (!isOwner) return null;
    return (
      <View style={swipeStyles.swipeActions}>
        <TouchableOpacity style={swipeStyles.swipeEdit} onPress={() => onEdit(log.id)}>
          <Text style={swipeStyles.swipeEditText}>✎</Text>
        </TouchableOpacity>
        <TouchableOpacity style={swipeStyles.swipeDelete} onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); onDelete(log.id); }}>
          <Text style={swipeStyles.swipeDeleteText}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ translateX: hintAnim }] }}>
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
      onSwipeableWillOpen={() => isOwner && swipeRef.current && onOpen(swipeRef.current)}
    >
      <View style={styles.activityItem}>
        <View style={[styles.activityAvatar, { backgroundColor: avatarColor(member.id) }]}>
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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
