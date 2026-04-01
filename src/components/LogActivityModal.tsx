import { Modal, Animated, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useSheetDismiss } from '../hooks/useSheetDismiss';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHouseStore, selectActiveHouse } from '../contexts/HouseContext';
import { useShallow } from 'zustand/react/shallow';

import { showToast } from './Toast';
import { styles } from './log-activity/styles';
import { TaskList } from './log-activity/TaskList';
import { CustomTaskForm } from './log-activity/CustomTaskForm';

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
  const { logTaskInHouse, updateLogInHouse, addTaskAndLogInHouse } = useHouseStore(
    useShallow((s) => ({
      logTaskInHouse: s.logTaskInHouse,
      updateLogInHouse: s.updateLogInHouse,
      addTaskAndLogInHouse: s.addTaskAndLogInHouse,
    }))
  );
  const insets = useSafeAreaInsets();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const { translateY, panHandlers } = useSheetDismiss(handleClose);

  const currentTaskId = editingLogId
    ? house?.logs.find((l) => l.id === editingLogId)?.taskId
    : undefined;

  function handleClose() {
    setShowCustomForm(false);
    onClose();
  }

  async function handleSelect(taskId: string) {
    setLoadingId(taskId);
    try {
      if (editingLogId) {
        await updateLogInHouse(editingLogId, taskId);
        showToast('Atividade atualizada!', 'success');
      } else {
        await logTaskInHouse(taskId);
        showToast('Atividade registrada!', 'success');
      }
      handleClose();
    } finally {
      setLoadingId(null);
    }
  }

  async function handleCustomSubmit(name: string, points: number) {
    setLoadingId('custom');
    try {
      await addTaskAndLogInHouse(name, points);
      showToast('Tarefa criada e registrada!', 'success');
      handleClose();
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>{editingLogId ? 'Editar atividade' : 'Registrar atividade'}</Text>

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
      </View>
    </Modal>
  );
}
