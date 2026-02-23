import { View, Text, StyleSheet, Pressable } from "react-native";
import { Link } from "expo-router";

export default function HomePage() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Campus Barter</Text>
        <Text style={styles.subtitle}>Building Student Connections</Text>

        <View style={styles.buttonRow}>
          <Link href="/login" asChild>
            <Pressable style={styles.outlineButton}>
              <Text style={styles.outlineButtonText}>Sign In</Text>
            </Pressable>
          </Link>

          <Link href="/register" asChild>
            <Pressable style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Register</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center" },
  subtitle: { fontSize: 14, textAlign: "center", marginTop: 8, opacity: 0.8 },
  buttonRow: { marginTop: 18, gap: 12 },
  outlineButton: { paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  outlineButtonText: { fontSize: 16, fontWeight: "600" },
  primaryButton: { paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  primaryButtonText: { fontSize: 16, fontWeight: "700" },
});