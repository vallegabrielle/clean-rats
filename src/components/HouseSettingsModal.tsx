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
import { useTranslation } from 'react-i18next';
import { useSheetDismiss } from '../hooks/useSheetDismiss';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHouseStore, selectActiveHouse } from '../contexts/HouseContext';
import { useAuth } from '../contexts/AuthContext';
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
  const { t } = useTranslation();
  const house = useHouseStore(selectActiveHouse);
  const { user } = useAuth();
  const { renameHouse, updateHousePrize, updateHousePeriod, leaveHouse, removeMemberFromHouse, approveJoinRequest, rejectJoinRequest, logs } = useHouseStore(
    useShallow((s) => ({
      renameHouse: s.renameHouse,
      updateHousePrize: s.updateHousePrize,
      updateHousePeriod: s.updateHousePeriod,
      leaveHouse: s.leaveHouse,
      removeMemberFromHouse: s.removeMemberFromHouse,
      approveJoinRequest: s.approveJoinRequest,
      rejectJoinRequest: s.rejectJoinRequest,
      logs: s.logs,
    }))
  );
  const insets = useSafeAreaInsets();
  const [loadingLeave, setLoadingLeave] = useState(false);
  const { translateY, panHandlers } = useSheetDismiss(onClose);

  async function handleShare() {
    if (!house) return;
    await Share.share({
      message: t('house.inviteMessage', { name: house.name, code: house.code }) + '\nBaixe o app: https://apps.apple.com/app/id6761021340',
      url: `cleanrats://join/${house.code}`,
    });
  }

  function handleLeave() {
    if (!house) return;
    Alert.alert(
      t('house.leaveTitle'),
      t('house.leaveConfirm', { name: house.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('house.leaveConfirmBtn'),
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
          <Text style={styles.subtitle}>{`${t('house.code')}: ${house.code}`}</Text>

          <View style={styles.options}>
            <MembersSection
              members={house.members}
              pendingRequests={house.pendingRequests}
              defaultExpanded={openToRequests}
              currentUserId={user?.uid}
              onApprove={(userId) => approveJoinRequest(house.id, userId)}
              onReject={(userId) => rejectJoinRequest(house.id, userId)}
              onRemove={(userId) => removeMemberFromHouse(house.id, userId)}
            />
            <RenameOption currentName={house.name} onRename={renameHouse} />
            <PrizeOption currentPrize={house.prize} onUpdate={updateHousePrize} />
            <PeriodOption currentPeriod={house.period} logCount={logs.length} onUpdate={updateHousePeriod} />

            <TouchableOpacity style={styles.option} onPress={handleShare}>
              <Text style={styles.optionIcon}>↑</Text>
              <Text style={styles.optionText}>{t('house.shareCode')}</Text>
              <Text style={styles.optionDetail}>{house.code}</Text>
            </TouchableOpacity>

            {/* {__DEV__ && (
              <TouchableOpacity
                style={styles.seedBtn}
                onPress={async () => { await seedMockData(); onClose(); }}
              >
                <Text style={styles.seedBtnText}>🧪 Inserir dados mock</Text>
              </TouchableOpacity>
            )} */}

            <TouchableOpacity
              style={[styles.leaveBtn, loadingLeave && styles.disabledBtn]}
              disabled={loadingLeave}
              onPress={handleLeave}
            >
              {loadingLeave
                ? <ActivityIndicator color={COLORS.danger} size="small" />
                : <Text style={styles.leaveBtnText}>{t('house.leaveTitle')}</Text>
              }
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
