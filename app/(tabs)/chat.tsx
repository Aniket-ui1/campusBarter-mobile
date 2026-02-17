import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Chat, useData } from '../../context/DataContext';

export default function ChatListScreen() {
    const { chats } = useData();
    const { user } = useAuth();
    const router = useRouter();

    // Filter chats where user is a participant
    const myChats = chats.filter(c => c.participants.includes(user?.id || ''));

    const renderItem = ({ item }: { item: Chat }) => (
        <Link href={`/chat/${item.id}`} asChild>
            <Pressable style={styles.chatItem}>
                <Ionicons name="person-circle" size={50} color="#ccc" />
                <View style={styles.chatInfo}>
                    <Text style={styles.chatTitle}>{item.listingTitle}</Text>
                    <Text style={styles.lastMessage} numberOfLines={1}>
                        {item.messages.length > 0
                            ? item.messages[item.messages.length - 1].text
                            : "No messages yet"}
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </Pressable>
        </Link>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Messages</Text>
            <FlatList
                data={myChats}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
                        <Text style={styles.emptyText}>No messages yet.</Text>
                        <Text style={styles.emptySubText}>Start a conversation from a listing!</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: 50,
    },
    header: {
        fontSize: 28,
        fontWeight: 'bold',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    list: {
        paddingHorizontal: 20,
    },
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        gap: 12,
    },
    chatInfo: {
        flex: 1,
    },
    chatTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    lastMessage: {
        color: '#666',
        fontSize: 14,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
        gap: 10,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#666',
    },
    emptySubText: {
        color: '#999',
    }
});
