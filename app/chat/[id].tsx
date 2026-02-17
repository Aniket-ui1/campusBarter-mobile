import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

export default function ChatScreen() {
    const { id } = useLocalSearchParams();
    const { getChatById, sendMessage } = useData();
    const { user } = useAuth();
    const [text, setText] = useState('');
    const flatListRef = useRef<FlatList>(null);

    const chat = getChatById(id as string);

    useEffect(() => {
        // Scroll to bottom on open
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }, [chat?.messages]);

    if (!chat) return <Text>Chat not found</Text>;

    const handleSend = () => {
        if (!text.trim() || !user) return;
        sendMessage(chat.id, text, user.id);
        setText('');
    };

    const renderMessage = ({ item }: { item: any }) => {
        const isMe = item.senderId === user?.id;
        return (
            <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
                <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
                    {item.text}
                </Text>
                <Text style={styles.timestamp}>
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{chat.listingTitle}</Text>
            </View>

            <FlatList
                ref={flatListRef}
                data={chat.messages}
                renderItem={renderMessage}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
            />

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    value={text}
                    onChangeText={setText}
                />
                <Pressable onPress={handleSend} style={styles.sendButton}>
                    <Ionicons name="send" size={24} color="white" />
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        elevation: 2,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    list: {
        padding: 16,
        paddingBottom: 20,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
        marginBottom: 8,
    },
    myMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#007bff',
        borderBottomRightRadius: 4,
    },
    theirMessage: {
        alignSelf: 'flex-start',
        backgroundColor: 'white',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#eee',
    },
    messageText: {
        fontSize: 16,
    },
    myMessageText: {
        color: 'white',
    },
    theirMessageText: {
        color: '#333',
    },
    timestamp: {
        fontSize: 10,
        marginTop: 4,
        alignSelf: 'flex-end',
        opacity: 0.7,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 10,
        backgroundColor: 'white',
        alignItems: 'center',
        gap: 10,
    },
    input: {
        flex: 1,
        backgroundColor: '#f9f9f9',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#eee',
    },
    sendButton: {
        backgroundColor: '#007bff',
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
