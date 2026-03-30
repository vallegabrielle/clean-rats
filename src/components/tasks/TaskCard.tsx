import { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { COLORS } from '../../constants';
import { Task } from '../../types';
import { swipeStyles } from '../../utils';

export function TaskCard({
  task,
  onEdit,
  onDelete,
  onOpen,
}: {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onOpen: (ref: Swipeable) => void;
}) {
  const swipeRef = useRef<Swipeable>(null);

  function renderRightActions() {
    return (
      <View style={swipeStyles.swipeActions}>
        <TouchableOpacity style={swipeStyles.swipeEdit} onPress={() => onEdit(task)}>
          <Text style={swipeStyles.swipeEditText}>✎</Text>
        </TouchableOpacity>
        <TouchableOpacity style={swipeStyles.swipeDelete} onPress={() => onDelete(task)}>
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
