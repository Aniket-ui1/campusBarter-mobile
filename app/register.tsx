import { Link } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../context/AuthContext";

export default function Register() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const { register, isLoading } = useAuth();

    const handleRegister = async () => {
        if (!name || !email || !password) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        // Basic client-side check before sending to context
        if (!email.endsWith("@sait.ca") && !email.endsWith("@edu.sait.ca")) {
            Alert.alert("Invalid Email", "Please use a valid SAIT email address (@sait.ca or @edu.sait.ca)");
            return;
        }

        await register(name, email, password);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join the student community</Text>

            <View style={styles.form}>
                <TextInput
                    placeholder="Full Name"
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                />

                <TextInput
                    placeholder="SAIT Email"
                    style={styles.input}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                />

                <TextInput
                    placeholder="Password"
                    style={styles.input}
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                />

                <Pressable style={styles.button} onPress={handleRegister} disabled={isLoading}>
                    {isLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.buttonText}>Sign Up</Text>
                    )}
                </Pressable>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Already have an account? </Text>
                    <Link href="/login" asChild>
                        <Pressable>
                            <Text style={styles.link}>Sign In</Text>
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
        padding: 20,
        backgroundColor: "#fff",
    },
    title: {
        fontSize: 32,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 8,
        color: "#d32f2f",
    },
    subtitle: {
        fontSize: 16,
        textAlign: "center",
        marginBottom: 40,
        color: "#666",
    },
    form: {
        gap: 16,
    },
    input: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        backgroundColor: "#f9f9f9",
    },
    button: {
        backgroundColor: "#0056b3",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 8,
    },
    buttonText: {
        color: "white",
        fontWeight: "600",
        fontSize: 16,
    },
    footer: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 20,
    },
    footerText: {
        color: "#666",
    },
    link: {
        color: "#0056b3",
        fontWeight: "600",
    },
});
