import { Link } from "expo-router";
import { useContext } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AuthContext } from "../context/AuthContext";

export default function HomePage() {
  // 3. This gets the real user data (which might be empty right now)
  const { user: realUser } = useContext(AuthContext);

  // --- DEVELOPER BYPASS START ---
  // We rename the real user and use this fake 'user' instead for testing.
  // Change 'role' to 'Student' if you want to test the button disappearing!
  const user = { role: 'Admin', email: 'daniel@edu.sait.ca' }; 
  // --- DEVELOPER BYPASS END ---

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

          {/* Dev/Admin Section */}
          <View style={styles.devSection}>
             <Text style={styles.devText}>--- Roles & Actions ---</Text>
             
             {/* 4. Only show the Admin Dashboard if the user role is 'Admin' */}
             {user?.role === 'Admin' && (
                <Link href="/AdminDashboard" asChild>
                   <Pressable style={[styles.outlineButton, { borderColor: '#CC0633' }]}>
                      <Text style={[styles.outlineButtonText, { color: '#CC0633' }]}>Admin Dashboard Panel</Text>
                   </Pressable>
                </Link>
             )}

             <Link href="/ReviewsScreen" asChild>
                <Pressable style={styles.outlineButton}>
                   <Text style={styles.outlineButtonText}>Leave a Review</Text>
                </Pressable>
             </Link>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "#fff" },
  card: { width: "100%", maxWidth: 420, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: "#eee" },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center" },
  subtitle: { fontSize: 14, textAlign: "center", marginTop: 8, opacity: 0.8 },
  buttonRow: { marginTop: 18, gap: 12 },
  outlineButton: { paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: "center", borderColor: "#ccc" },
  outlineButtonText: { fontSize: 16, fontWeight: "600" },
  primaryButton: { paddingVertical: 12, borderRadius: 12, alignItems: "center", backgroundColor: "#000" },
  primaryButtonText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  devSection: { marginTop: 20, gap: 10, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 20 },
  devText: { fontSize: 12, textAlign: 'center', color: '#999', marginBottom: 5 },
});