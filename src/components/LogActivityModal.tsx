import { Modal, View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useSheetDismiss } from '../hooks/useSheetDismiss';
import { useState, useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHouseStore, selectActiveHouse } from '../contexts/HouseContext';
import { useShallow } from 'zustand/react/shallow';
import { showToast } from './Toast';
import { styles } from './log-activity/styles';
import { TaskList } from './log-activity/TaskList';
import { CustomTaskForm } from './log-activity/CustomTaskForm';
import { DateSelector } from './log-activity/DateSelector';
import { maybeShowInterstitial } from '../utils/adManager';
import { trackLogActivity } from '../utils/analytics';

// Persists across modal opens within a session. Resets on cold start (intentional).
let sessionLogCount = 0;

export function LogActivityModal({
  visible,
  onClose,
  editingLogId,
}: {
  visible: boolean;
  onClose: () => void;
  editingLogId?: string;
}) {
  const { t } = useTranslation();
  const house = useHouseStore(selectActiveHouse);
  const { logTaskInHouse, updateLogInHouse, addTaskAndLogInHouse, logs } = useHouseStore(
    useShallow((s) => ({
      logTaskInHouse: s.logTaskInHouse,
      updateLogInHouse: s.updateLogInHouse,
      addTaskAndLogInHouse: s.addTaskAndLogInHouse,
      logs: s.logs,
    }))
  );
  const insets = useSafeAreaInsets();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { translateY, panHandlers } = useSheetDismiss(handleClose);

  // onDismiss is iOS-only — use a visible transition effect for cross-platform support.
  // 350ms matches the default animationType="slide" duration.
  const prevVisibleRef = useRef(visible);
  useEffect(() => {
    if (prevVisibleRef.current && !visible) {
      const timer = setTimeout(handleDismissed, 350);
      return () => clearTimeout(timer);
    }
    prevVisibleRef.current = visible;
  }, [visible]);

  const currentTaskId = editingLogId
    ? logs.find((l) => l.id === editingLogId)?.taskId
    : undefined;

  function handleClose() {
    setShowCustomForm(false);
    setSelectedDate(new Date());
    onClose();
  }

  function handleDismissed() {
    if (sessionLogCount === 0 || sessionLogCount % 3 !== 0) return;
    try { maybeShowInterstitial(); } catch { /* silent */ }
  }

  async function handleSelect(taskId: string) {
    setLoadingId(taskId);
    try {
      if (editingLogId) {
        await updateLogInHouse(editingLogId, taskId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast(t('logActivity.updated'), 'success');
        handleClose();
      } else {
        await logTaskInHouse(taskId, selectedDate.toISOString());
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        sessionLogCount += 1;
        const task = house?.tasks.find((t) => t.id === taskId);
        if (task) trackLogActivity(task.name, task.points);
        showToast(t('logActivity.registered'), 'success');
        handleClose();
      }
    } finally {
      setLoadingId(null);
    }
  }

  async function handleCustomSubmit(name: string, points: number) {
    setLoadingId('custom');
    try {
      await addTaskAndLogInHouse(name, points, selectedDate.toISOString());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      sessionLogCount += 1;
      trackLogActivity(name, points);
      showToast(t('logActivity.taskCreated'), 'success');
      handleClose();
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
      >
        <View style={styles.handle} />
        <Text style={styles.title}>{editingLogId ? t('logActivity.editTitle') : t('logActivity.title')}</Text>

        {!editingLogId && (
          <DateSelector
            date={selectedDate}
            minDate={new Date(house?.periodStart ?? Date.now())}
            onChange={setSelectedDate}
          />
        )}

        <ScrollView showsVerticalScrollIndicator={false} style={styles.list}>
          <TaskList
            tasks={house?.tasks ?? []}
            currentTaskId={currentTaskId}
            loadingId={loadingId}
            onSelect={handleSelect}
          />

          {!editingLogId && (
            showCustomForm ? (
              <CustomTaskForm
                loading={loadingId === 'custom'}
                onSubmit={handleCustomSubmit}
                onCancel={() => setShowCustomForm(false)}
              />
            ) : (
              <TouchableOpacity
                style={styles.customBtn}
                onPress={() => setShowCustomForm(true)}
                disabled={loadingId !== null}
              >
                <Text style={styles.customBtnText}>{t('logActivity.customTask')}</Text>
              </TouchableOpacity>
            )
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
