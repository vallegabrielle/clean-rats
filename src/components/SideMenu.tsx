import {
    View,
    Text,
    TouchableOpacity,
    Animated,
    TouchableWithoutFeedback,
    ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHouseStore, selectActiveHouse } from "../contexts/HouseContext";
import { useShallow } from "zustand/react/shallow";
import { useAuth } from "../contexts/AuthContext";
import { useOnboarding } from "../contexts/OnboardingContext";
import { RootStackParamList } from "../../App";
import { MENU_WIDTH, styles } from "./side-menu/styles";
import { useDrawerAnimation } from "./side-menu/useDrawerAnimation";
import { UserSection } from "./side-menu/UserSection";
import { HouseList } from "./side-menu/HouseList";

interface Props {
    visible: boolean;
    onOpen: () => void;
    onClose: () => void;
}

export default function SideMenu({ visible, onOpen, onClose }: Props) {
    const insets = useSafeAreaInsets();
    const activeHouse = useHouseStore(selectActiveHouse);
    const { houses, pendingHouses, setActiveHouseId, removeAllData, renameCurrentUserInHouses, seedMockData } = useHouseStore(
        useShallow((s) => ({
            houses: s.houses,
            pendingHouses: s.pendingHouses,
            setActiveHouseId: s.setActiveHouseId,
            removeAllData: s.removeAllData,
            renameCurrentUserInHouses: s.renameCurrentUserInHouses,
            seedMockData: s.seedMockData,
        }))
    );
    const { logout, user, updateDisplayName } = useAuth();
    const { resetOnboarding } = useOnboarding();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    const { translateX, overlayOpacity, edgePan, drawerPan, snapToClose } =
        useDrawerAnimation(visible, onOpen, onClose);

    async function handleSaveName(name: string) {
        await updateDisplayName(name);
        await renameCurrentUserInHouses(name);
    }

    function handleNavigate(screen: "CreateHouse" | "JoinHouse") {
        snapToClose();
        navigation.navigate(screen);
    }

    function handleSelectHouse(id: string) {
        setActiveHouseId(id);
        snapToClose();
    }

    return (
        <View style={styles.container} pointerEvents="box-none">
            <TouchableWithoutFeedback onPress={snapToClose}>
                <Animated.View
                    style={[styles.overlay, { opacity: overlayOpacity, pointerEvents: visible ? "auto" : "none" }]}
                />
            </TouchableWithoutFeedback>

            {!visible && <View style={styles.edgeZone} {...edgePan.panHandlers} />}

            <Animated.View
                style={[styles.drawer, {
                    width: MENU_WIDTH,
                    transform: [{ translateX }],
                    paddingTop: insets.top + 16,
                    paddingBottom: insets.bottom + 16,
                }]}
                {...drawerPan.panHandlers}
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    <UserSection
                        displayName={user?.displayName ?? 'Usuário'}
                        email={user?.email ?? ''}
                        onSaveName={handleSaveName}
                    />

                    <View style={styles.divider} />

                    <HouseList
                        houses={houses}
                        pendingHouses={pendingHouses}
                        activeHouseId={activeHouse?.id}
                        onSelectHouse={handleSelectHouse}
                        onNavigate={handleNavigate}
                    />
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.tourBtn}
                        onPress={() => { snapToClose(); resetOnboarding(); }}
                    >
                        <Text style={styles.tourBtnText}>Ver tour</Text>
                    </TouchableOpacity>
                    {!!activeHouse && (
                        <TouchableOpacity
                            style={styles.seedBtn}
                            onPress={() => { snapToClose(); seedMockData(); }}
                        >
                            <Text style={styles.seedBtnText}>Injetar dados de teste</Text>
                        </TouchableOpacity>
                    )}
                    <View style={styles.divider} />
                    <TouchableOpacity
                        style={styles.logoutBtn}
                        onPress={() => { snapToClose(); removeAllData(); logout(); }}
                    >
                        <Text style={styles.logoutText}>Sair</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    );
}
