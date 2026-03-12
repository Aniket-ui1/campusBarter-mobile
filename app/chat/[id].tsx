// app/chat/[id].tsx  — WhatsApp-style chat screen (Chat System v2)
import { Avatar } from '@/components/ui/Avatar';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { type FSMessage, useData } from '@/context/DataContext';
import { chatApi, type ChatMessage } from '@/services/chatApi';
import {
    createTypingEmitter,
    joinConversation,
    leaveConversation,
    onReceiveMessage,
    onMessagesSeen,
    onUserTyping,
} from '@/services/socketService';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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

// ── Helpers ──────────────────────────────────────────────────────
function formatTime(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDateLabel(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function needsDateSep(msgs: ChatMessage[], index: number): boolean {
    if (index === msgs.length - 1) return true;
    const a = new Date(msgs[index].createdAt).toDateString();
    const b = new Date(msgs[index + 1].createdAt).toDateString();
    return a !== b;
}

// ── Component ─────────────────────────────────────────────────────
export default function ChatScreen() {
    const { id, recipientId: paramRecipientId, recipientName: paramRecipientName }
        = useLocalSearchParams<{ id: string; recipientId?: string; recipientName?: string }>();
    const router = useRouter();
    const { user } = useAuth();
    const {
        getChatById,
        loadOlderMessages,
        sendMessage: sendLegacyMessage,
        markChatRead,
        subscribeToMessages,
    } = useData();

    const [otherName, setOtherName] = useState(paramRecipientName ?? 'Chat');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLegacyMode, setIsLegacyMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [typingName, setTypingName] = useState<string | null>(null);
    const [recipientId, setRecipientId] = useState(paramRecipientId ?? '');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingOlder, setLoadingOlder] = useState(false);

    const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const listRef = useRef<FlatList>(null);
    const typingEmitter = useRef<ReturnType<typeof createTypingEmitter> | null>(null);

    const mapLegacyMessage = useCallback((m: FSMessage): ChatMessage => ({
        messageId: m.id,
        conversationId: id,
        senderId: m.senderId,
        senderName: m.senderName,
        messageType: 'text',
        textContent: m.text,
        mediaUrl: null,
        mediaName: null,
        isRead: false,
        readAt: null,
        isDeleted: false,
        createdAt: m.sentAt,
    }), [id]);

    // ── Load initial messages ────────────────────────────────────
    const loadMessages = useCallback(async (p: number) => {
        if (!id) return;
        if (!isLegacyMode) {
            try {
                const data = await chatApi.getMessages(id, p);
                const msgs = data.messages ?? [];
                if (p === 1) {
                    setMessages(msgs);
                    setHasMore(msgs.length >= 30);
                    setLoading(false);
                    if (!paramRecipientName) {
                        const otherMsg = msgs.find(m => m.senderId !== user?.id);
                        if (otherMsg?.senderName) setOtherName(otherMsg.senderName);
                        if (otherMsg?.senderId && !recipientId) setRecipientId(otherMsg.senderId);
                    }
                } else {
                    setMessages(prev => [...msgs, ...prev]);
                    setHasMore(msgs.length >= 30);
                }
                return;
            } catch {
                // Fall back to legacy chat API/data context.
                setIsLegacyMode(true);
            }
        }

        try {
            const legacyMsgs = await loadOlderMessages(id, p, 30);
            const mapped = legacyMsgs.map(mapLegacyMessage);
            if (p === 1) {
                setMessages(mapped);
                setHasMore(mapped.length >= 30);
                setLoading(false);
                const legacyChat = getChatById(id);
                if (legacyChat) {
                    if (!paramRecipientName && legacyChat.otherUserName) setOtherName(legacyChat.otherUserName);
                    if (!recipientId && legacyChat.otherUserId) setRecipientId(legacyChat.otherUserId);
                }
            } else {
                setMessages(prev => [...mapped, ...prev]);
                setHasMore(mapped.length >= 30);
            }
        } catch {
            setLoading(false);
        }
    }, [id, isLegacyMode, paramRecipientName, user?.id, recipientId, loadOlderMessages, mapLegacyMessage, getChatById]);

    useEffect(() => {
        void loadMessages(1);
    }, [loadMessages]);

    // ── Mark as read ─────────────────────────────────────────────
    useEffect(() => {
        if (!id) return;
        if (isLegacyMode) {
            void markChatRead(id).catch(() => undefined);
            return;
        }
        void chatApi.markRead(id).catch(() => undefined);
    }, [id, isLegacyMode, markChatRead]);

    // ── Socket: join room & subscribe to messages ────────────────
    useEffect(() => {
        if (!id) return;

        if (isLegacyMode) {
            const unsubLegacy = subscribeToMessages(id, (legacyMsgs) => {
                setMessages(legacyMsgs.map(mapLegacyMessage));
            });
            return () => {
                unsubLegacy();
            };
        }

        joinConversation(id);
        typingEmitter.current = createTypingEmitter(id);

        const unsubMsg = onReceiveMessage((msg) => {
            if (msg.conversationId !== id) return;
            setMessages(prev => {
                // Dedup by messageId
                if (prev.some(m => m.messageId === msg.messageId)) return prev;
                return [...prev, msg as ChatMessage];
            });
            void chatApi.markRead(id).catch(() => undefined);
        });

        const unsubSeen = onMessagesSeen(({ conversationId }) => {
            if (conversationId !== id) return;
            setMessages(prev => prev.map(m =>
                m.senderId === user?.id ? { ...m, isRead: true } : m
            ));
        });

        const unsubTyping = onUserTyping(({ displayName }) => {
            if (!displayName || displayName === user?.displayName) return;
            setTypingName(displayName);
            if (typingTimer.current) clearTimeout(typingTimer.current);
            typingTimer.current = setTimeout(() => setTypingName(null), 3000);
        });

        return () => {
            leaveConversation(id);
            typingEmitter.current?.cleanup();
            unsubMsg();
            unsubSeen();
            unsubTyping();
        };
    }, [id, isLegacyMode, user?.id, user?.displayName, subscribeToMessages, mapLegacyMessage]);

    // ── Send message ─────────────────────────────────────────────
    const handleSend = async () => {
        const t = text.trim();
        if (!t || !user?.id || !id || sending) return;

        // Optimistic update
        const optimisticMsg: ChatMessage = {
            messageId:      `opt-${Date.now()}`,
            conversationId: id,
            senderId:       user.id,
            senderName:     user.displayName,
            messageType:    'text',
            textContent:    t,
            mediaUrl:       null,
            mediaName:      null,
            isRead:         false,
            readAt:         null,
            isDeleted:      false,
            createdAt:      new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimisticMsg]);
        setText('');
        setSending(true);

        try {
            if (isLegacyMode) {
                await sendLegacyMessage(id, t, user.id);
                setMessages(prev => prev.filter(m => m.messageId !== optimisticMsg.messageId));
                await loadMessages(1);
            } else {
                const { message } = await chatApi.sendMessage(id, t);
                setMessages(prev => prev.map(m =>
                    m.messageId === optimisticMsg.messageId ? message : m
                ));
            }
        } catch (error) {
            setMessages(prev => prev.filter(m => m.messageId !== optimisticMsg.messageId));
            setText(t);
            const message = (error as { message?: string })?.message || 'Message could not be sent. Please try again.';
            Alert.alert('Send failed', message);
        } finally {
            setSending(false);
        }
    };

    // ── Typing emit ──────────────────────────────────────────────
    const handleTyping = (val: string) => {
        setText(val);
        typingEmitter.current?.onInput();
    };

    const handleLoadOlder = async () => {
        if (!id || loadingOlder || !hasMore) return;
        setLoadingOlder(true);
        try {
            const nextPage = page + 1;
            await loadMessages(nextPage);
            setPage(nextPage);
        } finally {
            setLoadingOlder(false);
        }
    };

    // ── Render message bubble ────────────────────────────────────
    const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
        const isMe = item.senderId === user?.id;
        const msgTime = item.createdAt;
        const isOptimistic = item.messageId.startsWith('opt-');

        // Date separator (shown below in inverted list = visually above)
        const showDate = needsDateSep(messages, index);

        return (
            <>
                {showDate && (
                    <View style={styles.dateSepWrap}>
                        <View style={styles.dateSep}>
                            <Text style={styles.dateSepText}>{formatDateLabel(msgTime)}</Text>
                        </View>
                    </View>
                )}

                <View style={[styles.bubbleRow, isMe ? styles.rowRight : styles.rowLeft]}>
                    {/* Avatar for other user */}
                    {!isMe && (
                        <View style={styles.avatarWrap}>
                            <Avatar name={item.senderName || otherName} size={28} />
                        </View>
                    )}

                    <Pressable
                        style={[
                            styles.bubble,
                            isMe ? styles.bubbleMe : styles.bubbleThem,
                            isOptimistic && styles.bubbleOptimistic,
                        ]}
                        onLongPress={() => Alert.alert('Message', item.textContent ?? '', [
                            { text: 'Copy', onPress: () => { } },
                            { text: 'Cancel', style: 'cancel' },
                        ])}
                    >
                        {/* Sender name (group-chat style for received messages) */}
                        {!isMe && (
                            <Text style={styles.senderName}>{item.senderName || otherName}</Text>
                        )}

                        {/* Message text */}
                        <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
                            {item.textContent}
                        </Text>

                        {/* Time + tick */}
                        <View style={styles.meta}>
                            <Text style={[styles.time, isMe && styles.timeMe]}>
                                {formatTime(msgTime)}
                            </Text>
                            {isMe && (
                                <Ionicons
                                    name={isOptimistic ? 'checkmark' : (item.isRead ? 'checkmark-done' : 'checkmark')}
                                    size={13}
                                    color={isOptimistic ? 'rgba(255,255,255,0.5)' : (item.isRead ? '#4FC3F7' : 'rgba(0,0,0,0.4)')}
                                    style={{ marginLeft: 2 }}
                                />
                            )}
                        </View>
                    </Pressable>
                </View>
            </>
        );
    };

    // ── Render ───────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            {/* Status bar spacer with header colour */}
            <View style={styles.statusBar} />

            {/* WhatsApp-style header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
                    <Ionicons name="arrow-back" size={22} color="#FFF" />
                </Pressable>

                <Pressable
                    style={styles.headerCenter}
                    onPress={() => recipientId && router.push({
                        pathname: '/user/[id]' as any,
                        params: { id: recipientId },
                    })}
                >
                    <Avatar name={otherName} size={40} />
                    <View style={styles.headerText}>
                        <Text style={styles.headerName} numberOfLines={1}>{otherName}</Text>
                        {typingName ? (
                            <Text style={styles.typingText}>typing…</Text>
                        ) : (
                            <Text style={styles.headerSub}>CampusBarter</Text>
                        )}
                    </View>
                </Pressable>

                {/* Header actions */}
                <View style={styles.headerActions}>
                    <Pressable style={styles.headerIcon} hitSlop={10}
                        onPress={() => Alert.alert('Coming soon', 'Voice calls will be available in a future update.')}>
                        <Ionicons name="call-outline" size={20} color="#FFF" />
                    </Pressable>
                    <Pressable style={styles.headerIcon} hitSlop={10}
                        onPress={() => Alert.alert('Coming soon', 'Video calls will be available in a future update.')}>
                        <Ionicons name="videocam-outline" size={21} color="#FFF" />
                    </Pressable>
                </View>
            </View>

            {/* Chat wallpaper background + messages */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <View style={styles.chatArea}>
                    {loading ? (
                        <View style={styles.loadingWrap}>
                            <ActivityIndicator color={AppColors.primary} size="large" />
                        </View>
                    ) : messages.length === 0 ? (
                        <View style={styles.emptyWrap}>
                            <Text style={styles.emptyEmoji}>👋</Text>
                            <Text style={styles.emptyTitle}>Say Hello!</Text>
                            <Text style={styles.emptySub}>
                                This is the start of your conversation with{'\n'}
                                <Text style={{ fontWeight: '700' }}>{otherName}</Text>
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            ref={listRef}
                            data={messages}
                            keyExtractor={item => item.messageId}
                            renderItem={renderMessage}
                            inverted
                            onEndReached={handleLoadOlder}
                            onEndReachedThreshold={0.2}
                            ListFooterComponent={loadingOlder ? (
                                <View style={styles.loadingOlderWrap}>
                                    <ActivityIndicator color={AppColors.primary} size="small" />
                                </View>
                            ) : null}
                            contentContainerStyle={styles.msgList}
                            showsVerticalScrollIndicator={false}
                            keyboardDismissMode="interactive"
                            keyboardShouldPersistTaps="handled"
                        />
                    )}
                </View>

                {/* Input bar */}
                <View style={styles.inputBar}>
                    <View style={styles.inputWrap}>
                        <Pressable hitSlop={8}
                            onPress={() => Alert.alert('Emoji picker', 'Will appear here soon!')}>
                            <Ionicons name="happy-outline" size={23} color={AppColors.textMuted} />
                        </Pressable>

                        <TextInput
                            style={styles.textInput}
                            placeholder="Message"
                            placeholderTextColor={AppColors.textMuted}
                            value={text}
                            onChangeText={handleTyping}
                            multiline
                            maxLength={2000}
                            returnKeyType="default"
                            blurOnSubmit={false}
                        />

                        <Pressable hitSlop={8}
                            onPress={() => Alert.alert('Attachment', 'File/image sending coming soon!')}>
                            <Ionicons name="attach-outline" size={23} color={AppColors.textMuted}
                                style={{ transform: [{ rotate: '45deg' }] }} />
                        </Pressable>
                    </View>

                    {/* Send / mic button — morphs like WhatsApp */}
                    <Pressable
                        style={[styles.sendBtn, !text.trim() && styles.micBtn]}
                        onPress={text.trim() ? handleSend : undefined}
                    >
                        {sending ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            <Ionicons
                                name={text.trim() ? 'send' : 'mic'}
                                size={20}
                                color="#FFF"
                            />
                        )}
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ECE5DD' }, // WhatsApp wallpaper bg

    statusBar: {
        height: Platform.OS === 'ios' ? 54 : 36,
        backgroundColor: '#1A5C38', // deep green
    },

    // Header
    header: {
        backgroundColor: '#1A5C38',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 10,
        gap: 4,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    backBtn: {
        width: 36, height: 36,
        alignItems: 'center', justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerText: { flex: 1 },
    headerName: {
        fontSize: 16, fontWeight: '700', color: '#FFF',
    },
    headerSub: {
        fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 1,
    },
    typingText: {
        fontSize: 11, color: '#90EE90', marginTop: 1, fontStyle: 'italic',
    },
    headerActions: {
        flexDirection: 'row', gap: 4,
    },
    headerIcon: {
        width: 36, height: 36,
        alignItems: 'center', justifyContent: 'center',
    },

    // Chat area
    chatArea: { flex: 1 },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingOlderWrap: { paddingVertical: 12 },
    msgList: { paddingHorizontal: 8, paddingVertical: 12 },

    // Empty state
    emptyWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 20, fontWeight: '700', color: '#333', marginBottom: 8 },
    emptySub: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22 },

    // Date separator
    dateSepWrap: {
        alignItems: 'center',
        marginVertical: 10,
    },
    dateSep: {
        backgroundColor: 'rgba(225,245,254,0.92)',
        paddingHorizontal: 14,
        paddingVertical: 5,
        borderRadius: 20,
    },
    dateSepText: { fontSize: 11, color: '#555', fontWeight: '600' },

    // Message bubbles
    bubbleRow: {
        flexDirection: 'row',
        marginBottom: 2,
        maxWidth: '85%',
    },
    rowRight: {
        alignSelf: 'flex-end',
        flexDirection: 'row-reverse',
    },
    rowLeft: {
        alignSelf: 'flex-start',
    },
    avatarWrap: {
        marginRight: 6,
        alignSelf: 'flex-end',
        marginBottom: 4,
    },
    bubble: {
        paddingHorizontal: 11,
        paddingTop: 7,
        paddingBottom: 5,
        borderRadius: 12,
        maxWidth: '100%',
    },
    bubbleMe: {
        backgroundColor: '#DCF8C6',    // WhatsApp sent green
        borderBottomRightRadius: 3,
    },
    bubbleThem: {
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 3,
    },
    bubbleOptimistic: {
        opacity: 0.75,
    },
    senderName: {
        fontSize: 12,
        fontWeight: '700',
        color: AppColors.primary,
        marginBottom: 2,
    },
    bubbleText: {
        fontSize: 15,
        lineHeight: 21,
        color: '#111',
    },
    bubbleTextMe: {
        color: '#111',
    },
    meta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 3,
        gap: 1,
    },
    time: {
        fontSize: 10,
        color: '#888',
    },
    timeMe: {
        color: '#6B8F71',
    },

    // Input bar
    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
        paddingHorizontal: 8,
        paddingVertical: 8,
        backgroundColor: '#F0F0F0',
    },
    inputWrap: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 10 : 6,
        minHeight: 48,
        borderWidth: 0,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
    },
    textInput: {
        flex: 1,
        fontSize: 15,
        color: '#111',
        maxHeight: 120,
        paddingVertical: 0,
        lineHeight: 20,
    },
    sendBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#25D366', // WhatsApp green
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
    },
    micBtn: {
        backgroundColor: '#25D366',
    },
});
