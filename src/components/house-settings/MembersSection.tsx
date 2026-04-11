import { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { JoinRequest } from "../../types";
import { COLORS } from "../../constants";
import { styles } from "./styles";

type Member = { id: string; name: string };

type Props = {
    members: Member[];
    pendingRequests?: JoinRequest[];
    defaultExpanded?: boolean;
    currentUserId?: string;
    onApprove?: (userId: string) => Promise<void>;
    onReject?: (userId: string) => Promise<void>;
    onRemove?: (userId: string) => Promise<void>;
};

export function MembersSection({
    members,
    pendingRequests = [],
    defaultExpanded = false,
    currentUserId,
    onApprove,
    onReject,
    onRemove,
}: Props) {
    const [showMembers, setShowMembers] = useState(defaultExpanded);
    const [loadingId, setLoadingId] = useState<string | null>(null);

    async function handleApprove(userId: string) {
        setLoadingId(userId);
        try {
            await onApprove?.(userId);
        } finally {
            setLoadingId(null);
        }
    }

    async function handleReject(userId: string) {
        setLoadingId(userId);
        try {
            await onReject?.(userId);
        } finally {
            setLoadingId(null);
        }
    }

    return (
        <>
            <TouchableOpacity
                style={styles.option}
                onPress={() => setShowMembers((v) => !v)}
            >
                <Text style={styles.optionIcon}>👥</Text>
                <Text style={styles.optionText}>Ver membros</Text>
                <View style={styles.optionBadges}>
                    {pendingRequests.length > 0 && (
                        <View style={styles.pendingBadge}>
                            <Text style={styles.pendingBadgeText}>
                                {pendingRequests.length}
                            </Text>
                        </View>
                    )}
                    <Text style={styles.optionDetail}>{members.length}</Text>
                </View>
            </TouchableOpacity>

            {showMembers && (
                <>
                    <View style={styles.membersList}>
                        {members.map((m) => {
                            const isLoading = loadingId === m.id;
                            const canRemove = onRemove && m.id !== currentUserId;
                            return (
                                <View key={m.id} style={styles.memberChip}>
                                    <View style={styles.memberAvatar}>
                                        <Text style={styles.memberAvatarText}>
                                            {m.name.slice(0, 2).toUpperCase()}
                                        </Text>
                                    </View>
                                    <Text style={styles.memberName} numberOfLines={1}>
                                        {m.name}
                                    </Text>
                                    {canRemove && (
                                        isLoading ? (
                                            <ActivityIndicator size="small" color={COLORS.textMuted} />
                                        ) : (
                                            <TouchableOpacity
                                                onPress={() => {
                                                    Alert.alert(
                                                        'Remover membro',
                                                        `Deseja remover "${m.name}" da toca?`,
                                                        [
                                                            { text: 'Cancelar', style: 'cancel' },
                                                            {
                                                                text: 'Remover',
                                                                style: 'destructive',
                                                                onPress: () => {
                                                                    setLoadingId(m.id);
                                                                    onRemove(m.id).finally(() => setLoadingId(null));
                                                                },
                                                            },
                                                        ],
                                                    );
                                                }}
                                                disabled={loadingId !== null}
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            >
                                                <Text style={styles.memberRemoveText}>✕</Text>
                                            </TouchableOpacity>
                                        )
                                    )}
                                </View>
                            );
                        })}
                    </View>

                    {pendingRequests.length > 0 && (
                        <View style={styles.pendingSection}>
                            <Text style={styles.pendingSectionLabel}>
                                Aguardando aprovação
                            </Text>
                            {pendingRequests.map((r) => {
                                const isLoading = loadingId === r.userId;
                                return (
                                    <View
                                        key={r.userId}
                                        style={styles.pendingRow}
                                    >
                                        <View style={styles.memberAvatar}>
                                            <Text
                                                style={styles.memberAvatarText}
                                            >
                                                {r.name
                                                    .slice(0, 2)
                                                    .toUpperCase()}
                                            </Text>
                                        </View>
                                        <Text
                                            style={styles.pendingName}
                                            numberOfLines={1}
                                        >
                                            {r.name}
                                        </Text>
                                        {isLoading ? (
                                            <ActivityIndicator
                                                size="small"
                                                color={COLORS.red}
                                            />
                                        ) : (
                                            <View style={styles.pendingActions}>
                                                <TouchableOpacity
                                                    style={styles.approveBtn}
                                                    onPress={() =>
                                                        handleApprove(r.userId)
                                                    }
                                                    disabled={
                                                        loadingId !== null
                                                    }
                                                >
                                                    <Text
                                                        style={
                                                            styles.approveBtnText
                                                        }
                                                    >
                                                        ✓
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.rejectBtn}
                                                    onPress={() =>
                                                        handleReject(r.userId)
                                                    }
                                                    disabled={
                                                        loadingId !== null
                                                    }
                                                >
                                                    <Text
                                                        style={
                                                            styles.rejectBtnText
                                                        }
                                                    >
                                                        ✕
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </>
            )}
        </>
    );
}
