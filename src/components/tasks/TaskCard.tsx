import { useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Swipeable } from 'react-native-gesture-handler';
import { COLORS } from '../../constants';
import { Task } from '../../types';
import { swipeStyles } from '../../utils';

const SWIPE_HINT_KEY = 'swipe_hint_seen';

export function TaskCard({
  task,
  onEdit,
  onDelete,
  onOpen,
  isFirst,
}: {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onOpen: (ref: Swipeable) => void;
  isFirst?: boolean;
}) {
  const swipeRef = useRef<Swipeable>(null);
  const hintAnim = useRef(new Animated.Value(0)).current;
  const [hintSeen, setHintSeen] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(SWIPE_HINT_KEY).then((val) => setHintSeen(val === 'true'));
  }, []);

  useEffect(() => {
    if (!isFirst || hintSeen) return;
    const timer = setTimeout(() => {
      Animated.sequence([
        Animated.timing(hintAnim, { toValue: -18, duration: 250, useNativeDriver: true }),
        Animated.timing(hintAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        AsyncStorage.setItem(SWIPE_HINT_KEY, 'true');
        setHintSeen(true);
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [hintSeen]);

  function renderRightActions() {
    return (
      <View style={swipeStyles.swipeActions}>
        <TouchableOpacity style={swipeStyles.swipeEdit} onPress={() => onEdit(task)}>
          <Text style={swipeStyles.swipeEditText}>✎</Text>
        </TouchableOpacity>
        <TouchableOpacity style={swipeStyles.swipeDelete} onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); onDelete(task); }}>
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
      onSwipeableWillOpen={() => swipeRef.current && onOpen(swipeRef.current)}
    >
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <Text style={styles.taskName}>{task.name}</Text>
        </View>

        <View style={styles.pointsBadge}>
          <Text style={styles.pointsValue}>{task.points}</Text>
          <Text style={styles.pointsLabel}>pts</Text>
        </View>
      </View>
    </Swipeable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  cardLeft: {
    flex: 1,
    gap: 3,
  },
  taskName: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 16,
    color: COLORS.text,
  },
  pointsBadge: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
    minWidth: 52,
  },
  pointsValue: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 16,
    color: COLORS.red,
  },
  pointsLabel: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
