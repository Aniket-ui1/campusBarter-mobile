import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    FlatList, KeyboardAvoidingView, Platform, Pressable,
    StyleSheet, Text, TextInput, View,
} from 'react-native';
import { AppColors, Radii, Spacing } from '@/constants/theme';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';
import { subscribeToMessages, sendMessage, getUserProfile } from '@/lib/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Msg { id: string; text: string; senderId: string; createdAt: string; }

function formatMsgTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDateSeparator(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function shouldShowDateSep(msgs: Msg[], index: number): boolean {
    if (index === msgs.length - 1) return true; // oldest message (FlatList inverted)
    const curr = new Date(msgs[index].createdAt).toDateString();
    const next = new Date(msgs[index + 1].createdAt).toDateString();
    return curr !== next;
}

export default function ChatScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuth();
    const [messages, setMessages] = useState<Msg[]>([]);
    const [text, setText] = useState('');
    const [otherName, setOtherName] = useState('');
    const [otherAvatar, setOtherAvatar] = useState<string | undefined>();
    const [listingTitle, setListingTitle] = useState('');
    const listRef = useRef<FlatList>(null);

    // Load chat metadata
    useEffect(() => {
        if (!id || !user?.id) return;
        (async () => {
            try {
                const chatDoc = await getDoc(doc(db, 'chats', id));
                if (!chatDoc.exists()) return;
                const data = chatDoc.data();
                setListingTitle(data?.listingTitle ?? '');
                const otherId = (data?.participants as string[])?.find(p => p !== user.id) ?? '';
                const profile = await getUserProfile(otherId);
                if (profile) {
                    setOtherName(profile.displayName ?? 'User');
                    setOtherAvatar(profile.avatarUrl);
                }
            } catch { }
        })();
    }, [id, user?.id]);

    // Real-time messages
    useEffect(() => {
        if (!id) return;
        return subscribeToMessages(id, (msgs: any[]) => {
            setMessages(msgs.map(m => ({
                id: m.id,
                text: m.text,
                senderId: m.senderId,
                createdAt: m.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
            })).reverse()); // newest first for inverted FlatList
        });
    }, [id]);

    const handleSend = async () => {
        const t = text.trim();
        if (!t || !user?.id || !id) return;
        setText('');
        try {
            await sendMessage(id, user.id, t);
        } catch { }
    };

    const renderMessage = ({ item, index }: { item: Msg; index: number }) => {
        const isMe = item.senderId === user?.id;
        const showDate = shouldShowDateSep(messages, index);

        return (
            <>
                {/* Date separator (rendered after because FlatList is inverted) */}
                {showDate && (
                    <View style={styles.dateSepWrap}>
                        <View style={styles.dateSep}>
                            <Text style={styles.dateSepText}>{formatDateSeparator(item.createdAt)}</Text>
                        </View>
                    </View>
                )}
                <View style={[styles.bubbleRow, isMe ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
                    <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                        <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
                            {item.text}
                        </Text>
                        <View style={styles.bubbleMeta}>
                            <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeThem]}>
                                {formatMsgTime(item.createdAt)}
                            </Text>
                            {isMe && (
                                <Ionicons name="checkmark-done" size={14} color="rgba(255,255,255,0.6)" style={{ marginLeft: 3 }} />
                            )}
                        </View>
                    </View>
                </View>
            </>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.statusSpacer} />

            {/* WhatsApp header */}
            <View style={styles.headerBar}>
                <Pressable onPress={() => router.back()} style={styles.headerBack}>
                    <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                </Pressable>
                <Avatar name={otherName || '?'} uri={otherAvatar} size={38} />
                <View style={styles.headerInfo}>
                    <Text style={styles.headerName} numberOfLines={1}>{otherName || 'Chat'}</Text>
                    {listingTitle ? (
                        <Text style={styles.headerSub} numberOfLines={1}>📌 {listingTitle}</Text>
                    ) : null}
                </View>
            </View>

            {/* Listing context banner */}
            {listingTitle ? (
                <View style={styles.contextBanner}>
                    <Ionicons name="pricetag" size={14} color={AppColors.primary} />
                    <Text style={styles.contextText} numberOfLines={1}>Chatting about: {listingTitle}</Text>
                </View>
            ) : null}

            {/* Messages */}
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
                <View style={styles.chatArea}>
                    <FlatList
                        ref={listRef}
                        data={messages}
                        keyExtractor={(item) => item.id}
                        renderItem={renderMessage}
                        inverted
                        contentContainerStyle={styles.msgList}
                        showsVerticalScrollIndicator={false}
                    />
                </View>

                {/* Input bar */}
                <View style={styles.inputBar}>
                    <View style={styles.inputWrap}>
                        <Ionicons name="happy-outline" size={22} color={AppColors.textMuted} style={{ marginLeft: 4 }} />
                        <TextInput
                            style={styles.textInput}
                            placeholder="Type a message..."
                            placeholderTextColor={AppColors.textMuted}
                            value={text}
                            onChangeText={setText}
                            multiline
                            maxLength={1000}
                        />
                    </View>
                    <Pressable
                        style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
                        onPress={handleSend}
                    >
                        <Ionicons name="send" size={20} color="#FFFFFF" />
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: AppColors.chatBg },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36, backgroundColor: AppColors.primaryDark },

    // WhatsApp header
    headerBar: {
        backgroundColor: AppColors.primaryDark,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    headerBack: {
        width: 36, height: 36, borderRadius: 18,
        alignItems: 'center', justifyContent: 'center',
    },
    headerInfo: { flex: 1 },
    headerName: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 1 },

    // Context banner
    contextBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#FFFFFF', paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: AppColors.border,
    },
    contextText: { fontSize: 12, color: AppColors.textSecondary, fontWeight: '500', flex: 1 },

    // Messages area
    chatArea: { flex: 1 },
    msgList: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },

    // Date separator
    dateSepWrap: { alignItems: 'center', marginVertical: Spacing.md },
    dateSep: {
        backgroundColor: 'rgba(0,0,0,0.08)', paddingHorizontal: 14, paddingVertical: 5,
        borderRadius: Radii.sm,
    },
    dateSepText: { fontSize: 11, color: AppColors.textSecondary, fontWeight: '600' },

    // Bubbles (WhatsApp style)
    bubbleRow: { marginBottom: 3 },
    bubbleRowRight: { alignItems: 'flex-end' },
    bubbleRowLeft: { alignItems: 'flex-start' },
    bubble: {
        maxWidth: '80%',
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 6,
        borderRadius: 12,
    },
    bubbleMe: {
        backgroundColor: AppColors.primary,
        borderBottomRightRadius: 4,
    },
    bubbleThem: {
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 4,
    },
    bubbleText: { fontSize: 15, lineHeight: 21 },
    bubbleTextMe: { color: '#FFFFFF' },
    bubbleTextThem: { color: AppColors.text },
    bubbleMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 2 },
    bubbleTime: { fontSize: 10, fontWeight: '500' },
    bubbleTimeMe: { color: 'rgba(255,255,255,0.6)' },
    bubbleTimeThem: { color: AppColors.textMuted },

    // Input bar
    inputBar: {
        flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm,
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
        backgroundColor: AppColors.background,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: AppColors.border,
    },
    inputWrap: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#FFFFFF', borderRadius: Radii['2xl'],
        paddingHorizontal: Spacing.sm, paddingVertical: Platform.OS === 'ios' ? 8 : 4,
        borderWidth: 1, borderColor: AppColors.border,
        minHeight: 44,
    },
    textInput: {
        flex: 1, fontSize: 15, color: AppColors.text,
        maxHeight: 100, paddingVertical: 0,
    },
    sendBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: AppColors.primary,
        alignItems: 'center', justifyContent: 'center',
    },
    sendBtnDisabled: { opacity: 0.5 },
});
