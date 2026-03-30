import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { COLORS } from '../constants';

type Props = {
  icon?: string;
  title?: string;
  text: string;
  style?: StyleProp<ViewStyle>;
};

export function EmptyState({ icon, title, text, style }: Props) {
  return (
    <View style={[styles.container, style]}>
      {icon && <Text style={styles.icon}>{icon}</Text>}
      {title && <Text style={styles.title}>{title}</Text>}
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  icon: { fontSize: 48 },
  title: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 22,
    color: COLORS.text,
    textAlign: 'center',
  },
  text: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
