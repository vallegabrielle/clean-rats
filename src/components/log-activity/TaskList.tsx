import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants';
import { styles } from './styles';

type Task = { id: string; name: string; points: number };

type Props = {
  tasks: Task[];
  currentTaskId?: string;
  loadingId: string | null;
  onSelect: (taskId: string) => void;
};

export function TaskList({ tasks, currentTaskId, loadingId, onSelect }: Props) {
  const { t } = useTranslation();

  if (!tasks.length) {
    return <Text style={styles.emptyText}>{t('tasks.noTasks')}</Text>;
  }

  return (
    <>
      {tasks.map((task) => {
        const loading = loadingId === task.id;
        const isCurrent = task.id === currentTaskId;
        return (
          <TouchableOpacity
            key={task.id}
            style={[styles.taskRow, isCurrent && styles.taskRowCurrent, loading && styles.taskRowDisabled]}
            onPress={() => onSelect(task.id)}
            disabled={loadingId !== null}
          >
            <View style={styles.taskInfo}>
              <Text style={styles.taskName}>{task.name}</Text>
              {isCurrent && <Text style={styles.currentLabel}>{t('tasks.selected', { count: 1 })}</Text>}
            </View>
            <View style={styles.pointsBadge}>
              {loading ? (
                <ActivityIndicator color={COLORS.red} size="small" />
              ) : (
                <>
                  <Text style={styles.pointsValue}>{task.points}</Text>
                  <Text style={styles.pointsLabel}>pts</Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </>
  );
}
