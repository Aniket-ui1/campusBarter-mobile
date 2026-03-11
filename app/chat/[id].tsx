// app/chat/[id].tsx  — WhatsApp-style chat screen
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
    Alert,
} from 'react-native';
import { AppColors } from '@/constants/theme';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';
import { useData, FSMessage } from '@/context/DataContext';
import { emitTyping, onTyping } from '@/lib/socket';

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

function needsDateSep(msgs: FSMessage[], index: number): boolean {
    if (index === msgs.length - 1) return true;
    const a = new Date(msgs[index].sentAt ?? (msgs[index] as any).timestamp).toDateString();
    const b = new Date(msgs[index + 1].sentAt ?? (msgs[index + 1] as any).timestamp).toDateString();
    return a !== b;
}

// resolve sentAt from either field name the backend returns
function getMsgTime(msg: FSMessage): string {
    return (msg.sentAt || (msg as any).timestamp || new Date().toISOString());
}

// ── Component ─────────────────────────────────────────────────────
export default function ChatScreen() {
    const { id, recipientId: paramRecipientId, recipientName: paramRecipientName }
        = useLocalSearchParams<{ id: string; recipientId?: string; recipientName?: string }>();
    const router = useRouter();
    const { user } = useAuth();
    const { chats, sendMessage, subscribeToMessages } = useData();

    // Find chat metadata
    const chat = chats.find(c => c.id === id);

    // Other user display info (resolved from listing or passed via params)
    const [otherName, setOtherName] = useState(
        paramRecipientName ?? chat?.listingTitle ?? 'Chat'
    );

    const [messages, setMessages] = useState<FSMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [typingName, setTypingName] = useState<string | null>(null);
    const [recipientId, setRecipientId] = useState(paramRecipientId ?? '');

    const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const listRef = useRef<FlatList>(null);

    // ── Resolve the other person's name from finding the first message not from me
    useEffect(() => {
        // If we have a recipientName in params, use it directly
        if (paramRecipientName) {
            setOtherName(paramRecipientName);
        }
    }, [paramRecipientName]);

    // Once messages load, pick the other person's name from senderId
    const resolveOtherUser = useCallback((msgs: FSMessage[]) => {
        if (paramRecipientName) return; // already resolved
        const otherMsg = msgs.find(m => m.senderId !== user?.id);
        if (otherMsg?.senderName) {
            setOtherName(otherMsg.senderName);
        }
        if (otherMsg?.senderId && !recipientId) {
            setRecipientId(otherMsg.senderId);
        }
    }, [user?.id, paramRecipientName, recipientId]);

    // ── Subscribe to messages ────────────────────────────────────
    useEffect(() => {
        if (!id) return;
        setLoading(true);
        const unsub = subscribeToMessages(id, (msgs) => {
            // Normalize timestamp field — DB returns timestamp, socket uses sentAt
            const normalized = msgs.map(m => ({
                ...m,
                sentAt: m.sentAt || (m as any).timestamp || new Date().toISOString(),
            }));
            setMessages([...normalized].reverse()); // newest first for inverted FlatList
            setLoading(false);
            resolveOtherUser(normalized);
        });
        return unsub;
    }, [id]);

    // ── Typing indicator ─────────────────────────────────────────
    useEffect(() => {
        const cleanup = onTyping(({ displayName }) => {
            if (displayName === user?.displayName) return;
            setTypingName(displayName);
            if (typingTimer.current) clearTimeout(typingTimer.current);
            typingTimer.current = setTimeout(() => setTypingName(null), 3000);
        });
        return cleanup;
    }, []);

    // ── Send message ─────────────────────────────────────────────
    const handleSend = async () => {
        const t = text.trim();
        if (!t || !user?.id || !id || sending) return;

        // Optimistic update — add message to UI immediately
        const optimisticMsg: FSMessage = {
            id: `opt-${Date.now()}`,
            senderId: user.id,
            senderName: user.displayName,
            text: t,
            sentAt: new Date().toISOString(),
        };
        setMessages(prev => [optimisticMsg, ...prev]);
        setText('');
        setSending(true);

        try {
            await sendMessage(id, t, recipientId);
        } catch {
            // Remove optimistic message on failure
            setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
            setText(t);
            Alert.alert('Send failed', 'Message could not be sent. Please try again.');
        } finally {
            setSending(false);
        }
    };

    // ── Typing emit ──────────────────────────────────────────────
    const handleTyping = (val: string) => {
        setText(val);
        if (id) emitTyping(id);
    };

    // ── Render message bubble ────────────────────────────────────
    const renderMessage = ({ item, index }: { item: FSMessage; index: number }) => {
        const isMe = item.senderId === user?.id;
        const msgTime = getMsgTime(item);
        const isOptimistic = item.id.startsWith('opt-');

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
                        onLongPress={() => Alert.alert('Message', item.text, [
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
                            {item.text}
                        </Text>

                        {/* Time + tick */}
                        <View style={styles.meta}>
                            <Text style={[styles.time, isMe && styles.timeMe]}>
                                {formatTime(msgTime)}
                            </Text>
                            {isMe && (
                                <Ionicons
                                    name={isOptimistic ? 'checkmark' : 'checkmark-done'}
                                    size={13}
                                    color={isOptimistic ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.85)'}
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
                            <Text style={styles.headerSub}>
                                {chat?.listingTitle ? `📌 ${chat.listingTitle}` : 'CampusBarter'}
                            </Text>
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
                                This is the start of your conversation about{'\n'}
                                <Text style={{ fontWeight: '700' }}>&quot;{chat?.listingTitle ?? 'a skill'}&quot;</Text>
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            ref={listRef}
                            data={messages}
                            keyExtractor={item => item.id}
                            renderItem={renderMessage}
                            inverted
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
