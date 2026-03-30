import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { House } from "../../types";
import { styles } from "./styles";

function HouseItem({ house, active }: { house: House; active?: boolean }) {
    return (
        <View style={[styles.houseItem, active && styles.houseItemActive]}>
            <View style={styles.houseIcon}>
                <Text style={styles.houseIconText}>🐀</Text>
            </View>
            <View style={styles.houseInfo}>
                <Text style={styles.houseName} numberOfLines={1}>{house.name}</Text>
                <Text style={styles.houseMeta}>{house.members.length} membro(s) · código {house.code}</Text>
            </View>
            {active && <Text style={styles.houseActiveIndicator}>●</Text>}
        </View>
    );
}

type Props = {
    houses: House[];
    pendingHouses?: House[];
    activeHouseId: string | undefined;
    onSelectHouse: (id: string) => void;
    onNavigate: (screen: "CreateHouse" | "JoinHouse") => void;
};

export function HouseList({ houses, pendingHouses = [], activeHouseId, onSelectHouse, onNavigate }: Props) {
    const [addExpanded, setAddExpanded] = useState(false);

    return (
        <>
            <Text style={styles.sectionLabel}>Minhas Tocas</Text>

            {houses.length > 0 ? (
                houses.map((h) => (
                    <TouchableOpacity key={h.id} onPress={() => onSelectHouse(h.id)} activeOpacity={0.7}>
                        <HouseItem house={h} active={h.id === activeHouseId} />
                    </TouchableOpacity>
                ))
            ) : (
                <Text style={styles.emptyText}>Você ainda não participa de nenhuma toca.</Text>
            )}

            {pendingHouses.length > 0 && (
                <>
                    <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Aguardando aprovação</Text>
                    {pendingHouses.map((h) => (
                        <View key={h.id} style={styles.pendingHouseItem}>
                            <View style={styles.houseIcon}>
                                <Text style={styles.houseIconText}>⏳</Text>
                            </View>
                            <View style={styles.houseInfo}>
                                <Text style={styles.houseName} numberOfLines={1}>{h.name}</Text>
                                <Text style={styles.houseMeta}>código {h.code}</Text>
                            </View>
                        </View>
                    ))}
                </>
            )}

            <TouchableOpacity style={styles.addHouseBtn} onPress={() => setAddExpanded((v) => !v)}>
                <Text style={styles.addHouseBtnText}>
                    {addExpanded ? "✕ Cancelar" : "+ Adicionar toca"}
                </Text>
            </TouchableOpacity>

            {addExpanded && (
                <View style={styles.addHouseOptions}>
                    <TouchableOpacity style={styles.addHouseOption} onPress={() => onNavigate("CreateHouse")}>
                        <Text style={styles.addHouseOptionText}>Criar nova toca</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addHouseOption} onPress={() => onNavigate("JoinHouse")}>
                        <Text style={styles.addHouseOptionText}>Entrar com código</Text>
                    </TouchableOpacity>
                </View>
            )}
        </>
    );
}
