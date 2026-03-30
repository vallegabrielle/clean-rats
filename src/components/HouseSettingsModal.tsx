import { useState } from 'react';
import {
  Modal,
  Animated,
  View,
  Text,
  TouchableOpacity,
  Share,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSheetDismiss } from '../hooks/useSheetDismiss';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHouseStore, selectActiveHouse } from '../contexts/HouseContext';
import { useShallow } from 'zustand/react/shallow';
import { COLORS } from '../constants';
import { styles } from './house-settings/styles';
import { MembersSection } from './house-settings/MembersSection';
import { RenameOption } from './house-settings/RenameOption';
import { PrizeOption } from './house-settings/PrizeOption';
import { PeriodOption } from './house-settings/PeriodOption';

export function HouseSettingsModal({
  visible,
  onClose,
  openToRequests = false,
}: {
  visible: boolean;
  onClose: () => void;
  openToRequests?: boolean;
}) {
  const house = useHouseStore(selectActiveHouse);
  const { renameHouse, updateHousePrize, updateHousePeriod, leaveHouse, seedMockData, approveJoinRequest, rejectJoinRequest } = useHouseStore(
    useShallow((s) => ({
      renameHouse: s.renameHouse,
      updateHousePrize: s.updateHousePrize,
      updateHousePeriod: s.updateHousePeriod,
      leaveHouse: s.leaveHouse,
      seedMockData: s.seedMockData,
      approveJoinRequest: s.approveJoinRequest,
      rejectJoinRequest: s.rejectJoinRequest,
    }))
  );
  const insets = useSafeAreaInsets();
  const [loadingLeave, setLoadingLeave] = useState(false);
  const { translateY, panHandlers } = useSheetDismiss(onClose);

  async function handleShare() {
    if (!house) return;
    await Share.share({
      message: `Entre na minha toca "${house.name}" no Clean Rats! Código: ${house.code}`,
    });
  }

  function handleLeave() {
    if (!house) return;
    Alert.alert(
      'Sair da toca',
      `Deseja sair de "${house.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            setLoadingLeave(true);
            try {
              await leaveHouse(house.id);
            } finally {
              setLoadingLeave(false);
            }
            onClose();
          },
        },
      ],
    );
  }

  if (!house) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 16, transform: [{ translateY }] }]}>
          <View style={styles.handle} {...panHandlers} />

          <Text style={styles.title}>{house.name}</Text>
          <Text style={styles.subtitle}>Código: {house.code}</Text>

          <View style={styles.options}>
            <MembersSection
              members={house.members}
              pendingRequests={house.pendingRequests}
              defaultExpanded={openToRequests}
              onApprove={(userId) => approveJoinRequest(house.id, userId)}
              onReject={(userId) => rejectJoinRequest(house.id, userId)}
            />
            <RenameOption currentName={house.name} onRename={renameHouse} />
            <PrizeOption currentPrize={house.prize} onUpdate={updateHousePrize} />
            <PeriodOption currentPeriod={house.period} onUpdate={updateHousePeriod} />

            <TouchableOpacity style={styles.option} onPress={handleShare}>
              <Text style={styles.optionIcon}>↑</Text>
              <Text style={styles.optionText}>Compartilhar código</Text>
              <Text style={styles.optionDetail}>{house.code}</Text>
            </TouchableOpacity>

            {__DEV__ && (
              <TouchableOpacity
                style={styles.seedBtn}
                onPress={async () => { await seedMockData(); onClose(); }}
              >
                <Text style={styles.seedBtnText}>🧪 Inserir dados mock</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.leaveBtn, loadingLeave && styles.disabledBtn]}
              disabled={loadingLeave}
              onPress={handleLeave}
            >
              {loadingLeave
                ? <ActivityIndicator color={COLORS.danger} size="small" />
                : <Text style={styles.leaveBtnText}>Sair da toca</Text>
              }
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
