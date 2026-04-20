import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants';
import { ScreenHeader } from '../components/ScreenHeader';
import { EmptyState } from '../components/EmptyState';
import { useHouseStore, selectActiveHouse } from '../contexts/HouseContext';
import { useShallow } from 'zustand/react/shallow';
import { Task } from '../types';
import { TaskCard } from '../components/tasks/TaskCard';
import { TaskForm, EditingTask } from '../components/tasks/TaskForm';
import { showToast } from '../components/Toast';
import { maybeShowInterstitial } from '../utils/adManager';

let sessionTaskAddCount = 0;

export default function TasksScreen() {
  const { t } = useTranslation();
  const house = useHouseStore(selectActiveHouse);
  const { addTaskToHouse, removeTaskFromHouse, updateTaskInHouse, logs } = useHouseStore(
    useShallow((s) => ({
      addTaskToHouse: s.addTaskToHouse,
      removeTaskFromHouse: s.removeTaskFromHouse,
      updateTaskInHouse: s.updateTaskInHouse,
      logs: s.logs,
    }))
  );

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTask, setEditingTask] = useState<EditingTask | null>(null);
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const openSwipeRef = useRef<Swipeable | null>(null);

  const tasks = house?.tasks ?? [];

  function handleSwipeOpen(ref: Swipeable) {
    if (openSwipeRef.current && openSwipeRef.current !== ref) {
      openSwipeRef.current.close();
    }
    openSwipeRef.current = ref;
  }

  async function handleAdd(name: string, points: number) {
    setLoadingAdd(true);
    try {
      await addTaskToHouse(name, points);
      sessionTaskAddCount += 1;
      showToast(t('tasks.taskAdded'), 'success');
      setShowAddForm(false);
      if (sessionTaskAddCount % 3 === 0) {
        setTimeout(() => { try { maybeShowInterstitial(); } catch { /* silent */ } }, 350);
      }
    } finally {
      setLoadingAdd(false);
    }
  }

  async function handleEdit(name: string, points: number) {
    if (!editingTask) return;
    setLoadingEdit(true);
    try {
      await updateTaskInHouse(editingTask.id, name, points);
      showToast(t('tasks.taskSaved'), 'success');
      setEditingTask(null);
    } finally {
      setLoadingEdit(false);
    }
  }

  function handleDeletePress(task: Task) {
    const logCount = logs.filter((l) => l.taskId === task.id).length;
    const message = logCount > 0
      ? `${t('tasks.confirmDelete')} "${task.name}"?\n\n${t('tasks.deleteWarning', { count: logCount })}`
      : `${t('tasks.confirmDelete')} "${task.name}"?`;
    Alert.alert(
      t('tasks.confirmDelete'),
      message,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await removeTaskFromHouse(task.id);
            showToast(t('tasks.taskDeleted'), 'success');
          },
        },
      ],
    );
  }

  function openEdit(task: Task) {
    setShowAddForm(false);
    setEditingTask({ id: task.id, name: task.name, points: String(task.points) });
  }

  function renderTask(task: Task, i: number) {
    if (editingTask?.id === task.id) {
      return (
        <TaskForm
          key={task.id}
          initial={editingTask}
          onConfirm={handleEdit}
          onCancel={() => setEditingTask(null)}
          loading={loadingEdit}
        />
      );
    }
    return (
      <TaskCard
        key={task.id}
        task={task}
        onEdit={openEdit}
        onDelete={handleDeletePress}
        onOpen={handleSwipeOpen}
        isFirst={i === 0}
      />
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />

      <ScreenHeader
        title={t('tasks.title')}
        right={
          <TouchableOpacity
            style={styles.addHeaderBtn}
            onPress={() => { setEditingTask(null); setShowAddForm((v) => !v); }}
          >
            <Text style={styles.addHeaderBtnText}>{showAddForm ? '✕' : '+'}</Text>
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {showAddForm && (
          <TaskForm
            onConfirm={handleAdd}
            onCancel={() => setShowAddForm(false)}
            loading={loadingAdd}
          />
        )}

        {tasks.map(renderTask)}

        {tasks.length === 0 && !showAddForm && (
          <EmptyState icon="🧹" text={t('tasks.noTasks')} style={styles.emptyState} />
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  addHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addHeaderBtnText: {
    fontSize: 20,
    color: '#fff',
    lineHeight: 24,
  },
  content: {
    padding: 20,
    gap: 8,
    paddingBottom: 40,
  },
  emptyState: {
    paddingTop: 80,
  },
});
