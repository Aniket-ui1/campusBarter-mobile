import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { chatApi } from "../../services/chatApi";

export default function ListingDetail() {
    const { id } = useLocalSearchParams();
    const { getListingById, startChat, reportListing } = useData();
    const { user } = useAuth();
    const listing = getListingById(id as string);
    const router = useRouter();

    if (!listing) {
        return (
            <View style={styles.container}>
                <Text>Listing not found</Text>
            </View>
        );
    }

    const handleContact = async () => {
        if (!user) {
            Alert.alert("Login Required", "You must be logged in to chat.");
            return;
        }
        if (user.id === listing.userId) {
            Alert.alert("Error", "You cannot chat with yourself.");
            return;
        }

<<<<<<< Updated upstream
        try {
            const conv = await chatApi.findOrCreate(listing.userId);
            const convId = (conv as any)?.conversation?.conversationId ?? (conv as any)?.conversationId;
            if (!convId) throw new Error('Invalid conversation response');
            router.push(`/chat/${convId}`);
        } catch {
            try {
                const legacyChatId = await startChat(listing.id, listing.title, [user.id, listing.userId], listing.userId);
                router.push(`/chat/${legacyChatId}`);
            } catch {
                Alert.alert("Error", "Could not start chat.");
            }
        }
=======
        if (listing.status === "CLOSED") {
            Alert.alert("Exchange closed", "This listing has already been completed.");
            return;
        }

        const chatId = startChat(listing.id, listing.title, [
            { id: user.id, name: user.name },
            { id: listing.userId, name: listing.userName },
        ]);
        router.push(`/chat/${chatId}`);
>>>>>>> Stashed changes
    };

    const submitReport = (reason: string) => {
        if (!user) {
            Alert.alert("Login required", "You must be logged in to report a listing.");
            return;
        }

        reportListing(listing.id, user.id, user.name, reason);
        Alert.alert("Report submitted", "Thank you. An admin will review this listing.");
    };

    const handleReportListing = () => {
        if (!user) {
            Alert.alert("Login required", "You must be logged in to report a listing.");
            return;
        }

        if (user.id === listing.userId) {
            Alert.alert("Not allowed", "You cannot report your own listing.");
            return;
        }

        Alert.alert("Report listing", "Select a reason:", [
            {
                text: "Spam",
                onPress: () => submitReport("Spam or duplicate listing"),
            },
            {
                text: "Inappropriate",
                onPress: () => submitReport("Inappropriate or offensive content"),
            },
            {
                text: "Suspicious",
                onPress: () => submitReport("Suspicious or misleading behavior"),
            },
            {
                text: "Cancel",
                style: "cancel",
            },
        ]);
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.card}>
                <View style={styles.header}>
                    <Text style={[styles.badge, listing.type === 'OFFER' ? styles.offerBadge : styles.requestBadge]}>
                        {listing.type}
                    </Text>
                    <Text style={styles.date}>{new Date(listing.createdAt).toLocaleDateString()}</Text>
                </View>

                <Text style={styles.title}>{listing.title}</Text>

                <View style={styles.userInfo}>
                    <Ionicons name="person-circle" size={40} color="#ccc" />
                    <View>
                        <Text style={styles.userName}>{listing.userName}</Text>
                        <Text style={styles.userRole}>Student</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.description}>{listing.description}</Text>

                <View style={styles.costContainer}>
                    <Text style={styles.costLabel}>Cost:</Text>
                    <Text style={styles.costValue}>{listing.credits} Credits</Text>
                </View>
            </View>

            <Pressable style={styles.contactButton} onPress={handleContact}>
                <Ionicons name="chatbubble-ellipses-outline" size={24} color="white" />
                <Text style={styles.contactButtonText}>
                    {listing.status === "CLOSED" ? "Exchange Completed" : `Contact ${listing.userName}`}
                </Text>
            </Pressable>

            {user?.id !== listing.userId && (
                <Pressable style={styles.reportButton} onPress={handleReportListing}>
                    <Ionicons name="flag-outline" size={22} color="#d32f2f" />
                    <Text style={styles.reportButtonText}>Report Listing</Text>
                </Pressable>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
        padding: 20,
    },
    card: {
        backgroundColor: "white",
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        elevation: 2,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    badge: {
        fontSize: 12,
        fontWeight: "bold",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        overflow: "hidden",
    },
    offerBadge: {
        backgroundColor: "#e3f2fd",
        color: "#1976d2",
    },
    requestBadge: {
        backgroundColor: "#fbe4ec",
        color: "#c2185b",
    },
    date: {
        color: "#999",
        fontSize: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 16,
        color: "#333",
    },
    userInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 16,
    },
    userName: {
        fontWeight: "bold",
        fontSize: 16,
    },
    userRole: {
        color: "#666",
        fontSize: 14,
    },
    divider: {
        height: 1,
        backgroundColor: "#eee",
        marginVertical: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 8,
        color: "#333",
    },
    description: {
        fontSize: 16,
        color: "#444",
        lineHeight: 24,
        marginBottom: 20,
    },
    costContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff3e0",
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    costLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: "#ef6c00",
    },
    costValue: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#ef6c00",
    },
    contactButton: {
        backgroundColor: "#333",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        padding: 18,
        borderRadius: 16,
        gap: 10,
        marginBottom: 40,
    },
    contactButtonText: {
        color: "white",
        fontSize: 18,
        fontWeight: "bold",
    },
    reportButton: {
        marginTop: -10,
        marginBottom: 40,
        borderWidth: 1,
        borderColor: "#f3c4c4",
        backgroundColor: "#fff5f5",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        padding: 14,
        borderRadius: 14,
    },
    reportButtonText: {
        color: "#d32f2f",
        fontWeight: "700",
        fontSize: 16,
    },
});
