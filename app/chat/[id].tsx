import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppColors, Radii, Spacing } from '@/constants/theme';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';
import { MOCK_MESSAGES, MOCK_CHAT_THREADS } from '@/data/mock';

export default function ChatWindowScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuth();
    const [message, setMessage] = useState('');

    const thread = MOCK_CHAT_THREADS.find((t) => t.id === id);
    const messages = MOCK_MESSAGES[id || ''] || [];

    const formatTime = (ts: string) => {
        const d = new Date(ts);
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.statusSpacer} />

            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={AppColors.text} />
                </Pressable>
                <Avatar name={thread?.participantName || ''} size={36} />
                <View style={{ flex: 1 }}>
                    <Text style={styles.chatName}>{thread?.participantName}</Text>
                    <Text style={styles.chatStatus}>Online</Text>
                </View>
                <Pressable style={styles.headerAction} onPress={() => router.push('/report')}>
                    <Ionicons name="ellipsis-vertical" size={20} color={AppColors.textMuted} />
                </Pressable>
            </View>

            {/* Messages */}
            <FlatList
                data={messages}
                keyExtractor={(m) => m.id}
                contentContainerStyle={styles.messagesContent}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                    const isMe = item.senderId === user?.id;
                    return (
                        <View style={[styles.bubbleRow, isMe && styles.bubbleRowMe]}>
                            {!isMe && <Avatar name={thread?.participantName || ''} size={28} />}
                            <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                                <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.text}</Text>
                                <View style={styles.bubbleMeta}>
                                    <Text style={[styles.timeText, isMe && styles.timeTextMe]}>{formatTime(item.timestamp)}</Text>
                                    {isMe && item.seen && <Ionicons name="checkmark-done" size={14} color={AppColors.primary} />}
                                </View>
                            </View>
                        </View>
                    );
                }}
            />

            {/* Input */}
            <View style={styles.inputBar}>
                <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    placeholderTextColor={AppColors.textMuted}
                    value={message}
                    onChangeText={setMessage}
                    multiline
                />
                <Pressable style={[styles.sendBtn, !message.trim() && styles.sendBtnDisabled]}
                    disabled={!message.trim()}
                    onPress={() => { setMessage(''); }}>
                    <Ionicons name="send" size={20} color={message.trim() ? '#FFFFFF' : AppColors.textMuted} />
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: AppColors.background },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36 },
    header: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
        borderBottomWidth: 1, borderBottomColor: AppColors.border,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: AppColors.surface, alignItems: 'center', justifyContent: 'center',
    },
    chatName: { fontSize: 16, fontWeight: '700', color: AppColors.text },
    chatStatus: { fontSize: 11, color: AppColors.success },
    headerAction: { padding: 4 },

    messagesContent: { padding: Spacing.xl, gap: Spacing.md },
    bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
    bubbleRowMe: { justifyContent: 'flex-end' },
    bubble: {
        maxWidth: '75%',
        borderRadius: Radii.lg, padding: Spacing.md,
    },
    bubbleMe: {
        backgroundColor: AppColors.primary,
        borderBottomRightRadius: 4,
    },
    bubbleOther: {
        backgroundColor: AppColors.surfaceLight,
        borderBottomLeftRadius: 4,
    },
    bubbleText: { fontSize: 14, color: AppColors.text, lineHeight: 20 },
    bubbleTextMe: { color: '#FFFFFF' },
    bubbleMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, alignSelf: 'flex-end' },
    timeText: { fontSize: 10, color: AppColors.textMuted },
    timeTextMe: { color: 'rgba(255,255,255,0.7)' },

    inputBar: {
        flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm,
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
        borderTopWidth: 1, borderTopColor: AppColors.border,
        paddingBottom: Platform.OS === 'ios' ? 30 : Spacing.md,
    },
    input: {
        flex: 1, backgroundColor: AppColors.surface,
        borderWidth: 1, borderColor: AppColors.border, borderRadius: Radii.lg,
        paddingHorizontal: Spacing.lg, paddingVertical: 10, color: AppColors.text,
        fontSize: 15, maxHeight: 100,
    },
    sendBtn: {
        width: 44, height: 44, borderRadius: 14,
        backgroundColor: AppColors.primary,
        alignItems: 'center', justifyContent: 'center',
    },
    sendBtnDisabled: { backgroundColor: AppColors.surface },
});
