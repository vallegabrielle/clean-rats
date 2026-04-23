import { Modal, View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useSheetDismiss } from '../hooks/useSheetDismiss';
import { useState, useRef, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHouseStore, selectActiveHouse } from '../contexts/HouseContext';
import { useShallow } from 'zustand/react/shallow';
import { showToast } from './Toast';
import { styles } from './log-activity/styles';
import { TaskList } from './log-activity/TaskList';
import { CustomTaskForm } from './log-activity/CustomTaskForm';
import { DateSelector } from './log-activity/DateSelector';
import { showInterstitial } from '../utils/adManager';
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
  const pendingAd = useRef(false);
  useSheetDismiss(handleClose);

  // Fallback: fires on Android (no onDismiss) and as safety net on iOS.
  // pendingAd.current check ensures only one path shows the ad.
  useEffect(() => {
    if (!visible && pendingAd.current) {
      const timer = setTimeout(() => {
        if (pendingAd.current) {
          pendingAd.current = false;
          showInterstitial();
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const currentTaskId = editingLogId
    ? logs.find((l) => l.id === editingLogId)?.taskId
    : undefined;

  function handleClose() {
    setShowCustomForm(false);
    setSelectedDate(new Date());
    onClose();
  }

  // iOS: onDismiss fires after the modal VC is fully removed from the iOS
  // presentation hierarchy — the only safe moment to present an interstitial.
  function handleModalDismiss() {
    if (pendingAd.current) {
      pendingAd.current = false;
      showInterstitial();
    }
  }

  function scheduleAdIfDue() {
    const due = sessionLogCount % 3 === 0;
    showToast(`log #${sessionLogCount} due=${due}`, 'success');
    if (due) pendingAd.current = true;
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
        scheduleAdIfDue();
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
      scheduleAdIfDue();
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose} onDismiss={handleModalDismiss}>
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
