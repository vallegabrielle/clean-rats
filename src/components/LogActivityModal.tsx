import { Modal, View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSheetDismiss } from '../hooks/useSheetDismiss';
import { useState } from 'react';
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

  // Called by Modal's onDismiss — fires after the slide animation completes.
  // Safer than setTimeout: guaranteed the UIViewController is gone before
  // presenting the interstitial on top.
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
        showToast('Atividade atualizada!', 'success');
        handleClose();
      } else {
        await logTaskInHouse(taskId, selectedDate.toISOString());
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Increment only after a successful write.
        sessionLogCount += 1;
        showToast(`Atividade registrada! (${sessionLogCount}/3)`, 'success');
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
      // Increment only after a successful write.
      sessionLogCount += 1;
      showToast(`Tarefa criada e registrada! (${sessionLogCount}/3)`, 'success');
      handleClose();
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose} onDismiss={handleDismissed}>
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
