// app/chat/start/[recipientId].tsx
// Intermediate screen: finds-or-creates a chat with the given user then redirects.
// Used as the actionUrl for "New skill request" notifications so the provider
// can tap the bell notification and land directly in the chat thread.

import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AppColors } from '@/constants/theme';
import { chatApi } from '@/services/chatApi';

export default function StartChatScreen() {
    const { recipientId, name, exchangeId } = useLocalSearchParams<{
        recipientId: string;
        name?: string;
        exchangeId?: string;
    }>();
    const router = useRouter();

    useEffect(() => {
        if (!recipientId) { router.replace('/(tabs)/chats' as any); return; }

        (async () => {
            try {
                const conv = await chatApi.findOrCreate(recipientId);
                const convId = (conv as any)?.conversation?.conversationId ?? (conv as any)?.conversationId;
                if (!convId) throw new Error('no convId');
                router.replace({
                    pathname: '/chat/[id]' as any,
                    params: {
                        id: convId,
                        recipientId,
                        recipientName: name ?? 'User',
                    },
                });
            } catch {
                // Fallback: if chat can't be created, go to exchanges
                if (exchangeId) {
                    router.replace({ pathname: '/exchange/[id]' as any, params: { id: exchangeId } });
                } else {
                    router.replace('/(tabs)/chats' as any);
                }
            }
        })();
    }, [recipientId, name, exchangeId, router]);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={AppColors.primary} />
            <Text style={styles.text}>Opening chat…</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', gap: 16 },
    text: { fontSize: 14, color: '#888' },
});
