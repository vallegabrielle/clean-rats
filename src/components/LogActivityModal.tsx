import { Modal, View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSheetDismiss } from '../hooks/useSheetDismiss';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHouseStore, selectActiveHouse } from '../contexts/HouseContext';
import { useShallow } from 'zustand/react/shallow';
import { showToast } from './Toast';
import { styles } from './log-activity/styles';
import { TaskList } from './log-activity/TaskList';
import { CustomTaskForm } from './log-activity/CustomTaskForm';
import { DateSelector } from './log-activity/DateSelector';
import { maybeShowInterstitial } from '../utils/adManager';

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

  const currentTaskId = editingLogId
    ? logs.find((l) => l.id === editingLogId)?.taskId
    : undefined;

  function handleClose() {
    setShowCustomForm(false);
    setSelectedDate(new Date());
    onClose();
  }

  function maybeShowInterstitialAfterClose() {
    if (sessionLogCount % 3 !== 0) return;
    // Small delay to let the modal close animation start before the ad appears.
    setTimeout(() => {
      try { maybeShowInterstitial(); } catch { /* silent */ }
    }, 16);
  }

  async function handleSelect(taskId: string) {
    setLoadingId(taskId);
    try {
      if (editingLogId) {
        await updateLogInHouse(editingLogId, taskId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('Atividade atualizada!', 'success');
        handleClose();
      } else {
        await logTaskInHouse(taskId, selectedDate.toISOString());
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('Atividade registrada!', 'success');
        // Increment only after a successful write.
        sessionLogCount += 1;
        handleClose();
        maybeShowInterstitialAfterClose();
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
      showToast('Tarefa criada e registrada!', 'success');
      // Increment only after a successful write.
      sessionLogCount += 1;
      handleClose();
      maybeShowInterstitialAfterClose();
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
        <Text style={styles.title}>{editingLogId ? 'Editar atividade' : 'Registrar atividade'}</Text>

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
                <Text style={styles.customBtnText}>+ Tarefa personalizada</Text>
              </TouchableOpacity>
            )
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
