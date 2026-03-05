import { useThemeColors } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React, { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
    FadeInUp,
    FadeOutUp,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withTiming
} from 'react-native-reanimated';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastData {
  id: number;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}

const ICONS: Record<ToastType, string> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
  warning: 'warning',
};

function ToastItem({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: number) => void }) {
  const colors = useThemeColors();
  const shakeX = useSharedValue(0);

  const typeColors: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
    success: { bg: colors.success + '15', border: colors.success + '40', icon: colors.success, text: colors.success },
    error: { bg: colors.error + '15', border: colors.error + '40', icon: colors.error, text: colors.error },
    info: { bg: colors.info + '15', border: colors.info + '40', icon: colors.info, text: colors.info },
    warning: { bg: colors.warning + '15', border: colors.warning + '40', icon: colors.warning, text: colors.warning },
  };

  React.useEffect(() => {
    if (toast.type === 'error') {
      shakeX.value = withSequence(
        withTiming(8, { duration: 50 }),
        withTiming(-8, { duration: 50 }),
        withTiming(6, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
    }
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, []);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const tc = typeColors[toast.type];

  return (
    <Animated.View
      entering={FadeInUp.springify().damping(18).stiffness(200)}
      exiting={FadeOutUp.duration(200)}
      style={shakeStyle}
    >
      <Pressable
        onPress={() => onDismiss(toast.id)}
        style={[styles.toast, { backgroundColor: tc.bg, borderColor: tc.border }]}
      >
        <Ionicons name={ICONS[toast.type] as any} size={20} color={tc.icon} />
        <Text style={[styles.toastText, { color: tc.text }]} numberOfLines={2}>{toast.message}</Text>
        <Ionicons name="close" size={16} color={tc.text} style={{ opacity: 0.6 }} />
      </Pressable>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev.slice(-2), { id, type, message, duration }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  toastText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
});
