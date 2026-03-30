import { useEffect, useRef } from 'react';
import {
  Animated,
  TouchableWithoutFeedback,
  StyleSheet,
  ActivityIndicator,
  Text,
  ViewStyle,
  TextStyle,
} from 'react-native';

interface Props {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  label: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function AnimatedButton({ onPress, disabled, loading, label, style, textStyle }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(disabled ? 0.5 : 1)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: disabled ? 0.45 : 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [disabled]);

  function handlePressIn() {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 20,
      bounciness: 2,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 12,
      bounciness: 8,
    }).start();
  }

  return (
    <TouchableWithoutFeedback
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
    >
      <Animated.View style={[styles.button, style, { opacity, transform: [{ scale }] }]}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={[styles.label, textStyle]}>{label}</Text>
        }
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 10,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 16,
    color: '#fff',
  },
});
