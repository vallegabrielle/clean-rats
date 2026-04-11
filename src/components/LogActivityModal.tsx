import { Modal, Animated, View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSheetDismiss } from '../hooks/useSheetDismiss';
import { useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHouseStore, selectActiveHouse } from '../contexts/HouseContext';
import { useShallow } from 'zustand/react/shallow';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { showToast } from './Toast';
import { styles } from './log-activity/styles';
import { TaskList } from './log-activity/TaskList';
import { CustomTaskForm } from './log-activity/CustomTaskForm';
import { DateSelector } from './log-activity/DateSelector';

// ─── Interstitial ad setup ────────────────────────────────────────────────────

const PROD_INTERSTITIAL_IOS_ID = process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS_ID ?? '';
const INTERSTITIAL_AD_UNIT_ID =
  Platform.OS !== 'ios'
    ? TestIds.INTERSTITIAL // Android not configured yet — test ID as safe fallback
    : __DEV__
    ? TestIds.INTERSTITIAL
    : PROD_INTERSTITIAL_IOS_ID;

// Persists across modal opens within a session.
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

  // Interstitial — load once when the modal mounts (iOS only).
  const interstitialRef = useRef<InterstitialAd | null>(null);
  const interstitialLoaded = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const ad = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID);
    interstitialRef.current = ad;
    interstitialLoaded.current = false;

    const unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      interstitialLoaded.current = true;
    });
    const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      interstitialLoaded.current = false;
    });

    ad.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
    };
  }, []);

  const currentTaskId = editingLogId
    ? logs.find((l) => l.id === editingLogId)?.taskId
    : undefined;

  function handleClose() {
    setShowCustomForm(false);
    setSelectedDate(new Date());
    onClose();
  }

  function maybeShowInterstitial() {
    // Only count new logs, not edits.
    sessionLogCount += 1;
    if (sessionLogCount % 3 === 0 && interstitialLoaded.current && interstitialRef.current) {
      interstitialRef.current.show();
    }
  }

  async function handleSelect(taskId: string) {
    setLoadingId(taskId);
    try {
      if (editingLogId) {
        await updateLogInHouse(editingLogId, taskId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('Atividade atualizada!', 'success');
      } else {
        await logTaskInHouse(taskId, selectedDate.toISOString());
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('Atividade registrada!', 'success');
        maybeShowInterstitial();
      }
      handleClose();
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
      maybeShowInterstitial();
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
