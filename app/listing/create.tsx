import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";

export default function CreateListing() {
    const router = useRouter();
    const { addListing } = useData();
    const { user } = useAuth();

    const [type, setType] = useState<'OFFER' | 'REQUEST'>('OFFER');
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [credits, setCredits] = useState("1");

    const handleSubmit = () => {
        if (!title || !description || !credits) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        const creditCost = parseInt(credits);
        if (isNaN(creditCost) || creditCost <= 0) {
            Alert.alert("Error", "Credits must be a positive number");
            return;
        }

        if (!user) {
            Alert.alert("Error", "You must be logged in");
            return;
        }

        addListing({
            type,
            title,
            description,
            credits: creditCost,
            userId: user.id,
            userName: user.displayName || user.name,
        });

        router.back();
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.header}>New Post</Text>

            <View style={styles.typeSelector}>
                <Pressable
                    style={[styles.typeButton, type === 'OFFER' && styles.activeType]}
                    onPress={() => setType('OFFER')}
                >
                    <Text style={[styles.typeText, type === 'OFFER' && styles.activeTypeText]}>I'm Offering Help</Text>
                </Pressable>
                <Pressable
                    style={[styles.typeButton, type === 'REQUEST' && styles.activeType]}
                    onPress={() => setType('REQUEST')}
                >
                    <Text style={[styles.typeText, type === 'REQUEST' && styles.activeTypeText]}>I Need Help</Text>
                </Pressable>
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Title</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. Calculus Tutoring"
                    value={title}
                    onChangeText={setTitle}
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Describe what you are offering or need..."
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={4}
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Credits (Cost)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="1"
                    value={credits}
                    onChangeText={setCredits}
                    keyboardType="numeric"
                />
                <Text style={styles.helper}>Typically 1 credit = 1 hour of help</Text>
            </View>

            <Pressable style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>Post Listing</Text>
            </Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        padding: 20,
    },
    header: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 20,
        color: "#333",
    },
    typeSelector: {
        flexDirection: "row",
        marginBottom: 20,
        gap: 10,
    },
    typeButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#ddd",
        alignItems: "center",
    },
    activeType: {
        backgroundColor: "#e3f2fd",
        borderColor: "#2196f3",
    },
    typeText: {
        fontWeight: "600",
        color: "#666",
    },
    activeTypeText: {
        color: "#2196f3",
    },
    formGroup: {
        marginBottom: 16,
    },
    label: {
        fontWeight: "600",
        marginBottom: 8,
        color: "#333",
    },
    input: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: "#f9f9f9",
    },
    textArea: {
        height: 100,
        textAlignVertical: "top",
    },
    helper: {
        fontSize: 12,
        color: "#666",
        marginTop: 4,
    },
    submitButton: {
        backgroundColor: "#d32f2f",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 20,
        marginBottom: 40,
    },
    submitButtonText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 16,
    },
});
