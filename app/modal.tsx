import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      {/* Glow blob */}
      <View style={styles.glowBlob} />

      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Text style={{ fontSize: 28 }}>🌿</Text>
        </View>
        <Text style={styles.title}>Campus Barter</Text>
        <Text style={styles.subtitle}>
          This modal can be used for additional content, settings, or notifications.
        </Text>

        <Link href="/" dismissTo asChild>
          <Pressable style={styles.button}>
            <Ionicons name="home-outline" size={18} color={AppColors.dark} />
            <Text style={styles.buttonText}>Go to home screen</Text>
          </Pressable>
        </Link>
      </View>

      <Text style={styles.footer}>© 2026 Campus Barter — SAIT Student Project</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: AppColors.dark,
  },
  glowBlob: {
    position: 'absolute',
    top: '20%',
    left: '10%',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(52,86,53,0.25)',
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(52,86,53,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(107,143,113,0.2)',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: AppColors.forest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: AppColors.cream,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    color: AppColors.mist,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
    fontWeight: '300',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: AppColors.sage,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    shadowColor: AppColors.sage,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  buttonText: {
    color: AppColors.dark,
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    color: AppColors.forest,
    fontSize: 10,
  },
});
