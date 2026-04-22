import { Avatar } from '@/components/ui/Avatar';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { chatApi, type ChatMessage } from '@/services/chatApi';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

function formatTime(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function ChatScreen() {
    const params = useLocalSearchParams<{ id: string; recipientId?: string; recipientName?: string }>();
    const conversationId = Array.isArray(params.id) ? params.id[0] : params.id;
    const recipientId = Array.isArray(params.recipientId) ? params.recipientId[0] : params.recipientId;
    const recipientName = Array.isArray(params.recipientName) ? params.recipientName[0] : params.recipientName;

    const router = useRouter();
    const { user } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [text, setText] = useState('');
    const [otherName, setOtherName] = useState(recipientName ?? 'Chat');
    const [lastSeenText, setLastSeenText] = useState<string | null>(null);

    const headerLabel = useMemo(() => otherName || 'Chat', [otherName]);

    useEffect(() => {
        let mounted = true;

        async function loadConversation() {
            if (!conversationId) {
                if (mounted) setLoading(false);
                return;
            }

            try {
                const result = await chatApi.getMessages(conversationId, 1);
                const loadedMessages = result.messages ?? [];
                if (!mounted) return;

                setMessages(loadedMessages);

                const otherMessage = loadedMessages.find((message) => message.senderId !== user?.id);
                if (!recipientName && otherMessage?.senderName) {
                    setOtherName(otherMessage.senderName);
                }

                if (recipientId) {
                    try {
                        const status = await chatApi.getUserStatus(recipientId);
                        if (!mounted) return;
                        setLastSeenText(status.isOnline ? null : status.lastSeenAt ? `last seen ${formatTime(status.lastSeenAt)}` : null);
                    } catch {
                        setLastSeenText(null);
                    }
                }
            } catch (error) {
                console.warn('Failed to load chat messages:', error);
                if (mounted) {
                    Alert.alert('Chat unavailable', 'Could not load this conversation right now.');
                }
            } finally {
                if (mounted) setLoading(false);
            }
        }

        void loadConversation();

        return () => {
            mounted = false;
        };
    }, [conversationId, recipientId, recipientName, user?.id]);

    const handleSend = async () => {
        const trimmed = text.trim();
        if (!conversationId || !trimmed || !user) {
            return;
        }

        setSending(true);
        try {
            const result = await chatApi.sendMessage(conversationId, trimmed, {
                id: user.id,
                name: user.displayName || user.name,
            });
            setMessages((currentMessages) => [result.message, ...currentMessages]);
            setText('');
        } catch (error) {
            console.error('Failed to send message:', error);
            Alert.alert('Message failed', 'Your message could not be sent.');
        } finally {
            setSending(false);
        }
    };

    if (!user) {
        return (
            <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Sign in required</Text>
                <Pressable style={styles.backButton} onPress={() => router.replace('/(auth)/welcome')}>
                    <Text style={styles.backButtonText}>Go to login</Text>
                </Pressable>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={AppColors.primary} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backIcon} hitSlop={12}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </Pressable>
                <Avatar name={headerLabel} size={40} />
                <View style={styles.headerText}>
                    <Text style={styles.headerName} numberOfLines={1}>{headerLabel}</Text>
                    <Text style={styles.headerStatus}>{lastSeenText ?? 'Online chat'}</Text>
                </View>
            </View>

            <FlatList
                style={styles.list}
                contentContainerStyle={styles.listContent}
                data={messages}
                keyExtractor={(item) => item.messageId}
                inverted
                renderItem={({ item }) => {
                    const mine = item.senderId === user.id;
                    return (
                        <View style={[styles.bubble, mine ? styles.mineBubble : styles.theirBubble]}>
                            <Text style={[styles.messageText, mine ? styles.mineText : styles.theirText]}>
                                {item.textContent || item.mediaName || ''}
                            </Text>
                            <Text style={[styles.timestamp, mine ? styles.mineTimestamp : styles.theirTimestamp]}>
                                {formatTime(item.createdAt)}
                            </Text>
                        </View>
                    );
                }}
                ListEmptyComponent={<Text style={styles.emptyMessages}>No messages yet. Start the conversation.</Text>}
            />

            <View style={styles.inputRow}>
                <TextInput
                    style={styles.input}
                    value={text}
                    onChangeText={setText}
                    placeholder="Type a message"
                    placeholderTextColor="#888"
                    multiline
                />
                <Pressable
                    onPress={handleSend}
                    disabled={sending || !text.trim()}
                    style={[styles.sendButton, (sending || !text.trim()) && styles.sendButtonDisabled]}
                >
                    <Ionicons name="send" size={20} color="#fff" />
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ECE5DD',
    },
    loadingState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ECE5DD',
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        backgroundColor: '#ECE5DD',
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#222',
    },
    backButton: {
        backgroundColor: AppColors.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    backButtonText: {
        color: '#fff',
        fontWeight: '700',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: AppColors.primary,
    },
    backIcon: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerText: {
        flex: 1,
    },
    headerName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    headerStatus: {
        color: 'rgba(255,255,255,0.75)',
        marginTop: 2,
        fontSize: 12,
    },
    list: {
        flex: 1,
    },
    listContent: {
        padding: 16,
        gap: 10,
    },
    bubble: {
        maxWidth: '82%',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    mineBubble: {
        alignSelf: 'flex-end',
        backgroundColor: AppColors.primary,
        borderBottomRightRadius: 4,
    },
    theirBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#fff',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#E6E6E6',
    },
    messageText: {
        fontSize: 15,
        lineHeight: 21,
    },
    mineText: {
        color: '#fff',
    },
    theirText: {
        color: '#222',
    },
    timestamp: {
        marginTop: 4,
        fontSize: 11,
    },
    mineTimestamp: {
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'right',
    },
    theirTimestamp: {
        color: '#777',
        textAlign: 'right',
    },
    emptyMessages: {
        textAlign: 'center',
        color: '#666',
        marginTop: 24,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 10,
        padding: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#EAEAEA',
    },
    input: {
        flex: 1,
        minHeight: 44,
        maxHeight: 120,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#E3E3E3',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#F9F9F9',
        color: '#222',
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: AppColors.primary,
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
});
