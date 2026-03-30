import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants';

type ToastType = 'error' | 'success';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

const MAX_TOASTS = 4;

let counter = 0;
let showToastFn: ((message: string, type?: ToastType) => void) | null = null;

export function showToast(message: string, type: ToastType = 'error') {
  showToastFn?.(message, type);
}

function ToastEntry({ item, onDone }: { item: ToastItem; onDone: (id: number) => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 16, stiffness: 130 }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -16, duration: 300, useNativeDriver: true }),
      ]).start(() => onDone(item.id));
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[
        styles.toast,
        item.type === 'success' ? styles.toastSuccess : styles.toastError,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <Text style={styles.toastText}>{item.message}</Text>
    </Animated.View>
  );
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    showToastFn = (message, type = 'error') => {
      setToasts((prev) => {
        const next = [...prev, { id: ++counter, message, type }];
        return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
      });
    };
    return () => { showToastFn = null; };
  }, []);

  function remove(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  if (toasts.length === 0) return null;

  return (
    <View
      style={[styles.container, { top: insets.top + 12 }]}
      pointerEvents="none"
    >
      {toasts.map((t) => (
        <ToastEntry key={t.id} item={t} onDone={remove} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 9999,
    gap: 8,
  },
  toast: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  toastError: {
    backgroundColor: COLORS.danger,
  },
  toastSuccess: {
    backgroundColor: '#2ecc71',
  },
  toastText: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
  },
});
