import { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import { styles } from "./styles";

type Props = {
    displayName: string;
    email: string;
    onSaveName: (name: string) => Promise<void>;
};

export function UserSection({ displayName, email, onSaveName }: Props) {
    const [editing, setEditing] = useState(false);
    const [input, setInput] = useState("");
    const [saving, setSaving] = useState(false);

    const initials = displayName.slice(0, 2).toUpperCase();

    async function handleSave() {
        const trimmed = input.trim();
        if (!trimmed) return;
        setSaving(true);
        try {
            await onSaveName(trimmed);
            setEditing(false);
        } finally {
            setSaving(false);
        }
    }

    return (
        <View style={styles.userSection}>
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
            </View>

            {editing ? (
                <>
                    <TextInput
                        style={styles.nameInput}
                        value={input}
                        onChangeText={setInput}
                        autoFocus
                        maxLength={50}
                        placeholderTextColor="#888"
                    />
                    <Text style={styles.nameCharCount}>{input.length}/50</Text>
                    <View style={styles.nameEditActions}>
                        <TouchableOpacity
                            style={[
                                styles.nameSaveBtn,
                                (!input.trim() || saving) &&
                                    styles.nameBtnDisabled,
                            ]}
                            onPress={handleSave}
                            disabled={!input.trim() || saving}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.nameSaveBtnText}>
                                    Salvar
                                </Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.nameCancelBtn}
                            onPress={() => {
                                setEditing(false);
                                setInput("");
                            }}
                            disabled={saving}
                        >
                            <Text style={styles.nameCancelBtnText}>
                                Cancelar
                            </Text>
                        </TouchableOpacity>
                    </View>
                </>
            ) : (
                <TouchableOpacity
                    style={styles.nameRow}
                    onPress={() => {
                        setInput(displayName);
                        setEditing(true);
                    }}
                >
                    <Text style={styles.userName} numberOfLines={1}>
                        {displayName}
                    </Text>
                    <Text style={styles.nameEditIcon}>✎</Text>
                </TouchableOpacity>
            )}

            <Text style={styles.userEmail}>{email}</Text>
        </View>
    );
}
