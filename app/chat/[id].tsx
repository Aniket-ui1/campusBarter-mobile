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
    onMessageDeleted,
    onMessagesSeen,
    onReactionAdded,
    onReactionRemoved,
    onReceiveMessage,
    onUserTyping,
} from '@/services/socketService';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import EmojiSelector from 'react-native-emoji-selector';
// import { useActionSheet } from '@expo/react-native-action-sheet';
import { getApiBase, getApiToken } from '@/lib/api';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Linking,
    Modal,
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
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatLastSeen(iso: string | null): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (d.toDateString() === today.toDateString()) {
        return `last seen today at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    }
    if (d.toDateString() === yesterday.toDateString()) {
        return 'last seen yesterday';
    }
    return `last seen ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function getLocalDateKey(isoString: string): string {
    const d = new Date(isoString);
    // Return YYYY-MM-DD in local timezone for accurate day comparison
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function needsDateSep(msgs: ChatMessage[], index: number): boolean {
    // Always show date for the oldest message (last in array, displayed at top)
    if (index === msgs.length - 1) return true;

    const current = msgs[index].createdAt;
    const next = msgs[index + 1].createdAt;

    // Compare dates only if both are valid
    if (!current || !next) return false;

    // Compare local calendar dates (YYYY-MM-DD format)
    return getLocalDateKey(current) !== getLocalDateKey(next);
}

function getMessageTimestamp(message: Pick<ChatMessage, 'createdAt'>): number {
    const parsed = new Date(message.createdAt).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
}

function sortMessagesNewestFirst(messages: ChatMessage[]): ChatMessage[] {
    return [...messages].sort((left, right) => {
        const timeDiff = getMessageTimestamp(right) - getMessageTimestamp(left);
        if (timeDiff !== 0) return timeDiff;
        return right.messageId.localeCompare(left.messageId);
    });
}

function mergeMessages(messages: ChatMessage[]): ChatMessage[] {
    const unique = new Map<string, ChatMessage>();
    for (const message of messages) {
        unique.set(message.messageId, message);
    }
    return sortMessagesNewestFirst(Array.from(unique.values()));
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
    // const { showActionSheetWithOptions } = useActionSheet();

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
    const [onlineStatus, setOnlineStatus] = useState<{ isOnline: boolean; lastSeenText: string | null }>({
        isOnline: false,
        lastSeenText: null,
    });
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<ChatMessage[]>([]);
    const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
    const [, forceUpdate] = useState(0); // For forcing re-render at midnight
    const [reactingToMessageId, setReactingToMessageId] = useState<string | null>(null);

    const searchDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const listRef = useRef<FlatList>(null);
    const typingEmitter = useRef<ReturnType<typeof createTypingEmitter> | null>(null);
    const midnightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const scrollToLatest = useCallback((animated = true) => {
        requestAnimationFrame(() => {
            listRef.current?.scrollToOffset({ offset: 0, animated });
        });
    }, []);

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
                const msgs = sortMessagesNewestFirst(data.messages ?? []);
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
                    setMessages(prev => mergeMessages([...prev, ...msgs]));
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
            const mapped = sortMessagesNewestFirst(legacyMsgs.map(mapLegacyMessage));
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
                setMessages(prev => mergeMessages([...prev, ...mapped]));
                setHasMore(mapped.length >= 30);
            }
        } catch {
            setLoading(false);
        }
    }, [id, isLegacyMode, paramRecipientName, user?.id, recipientId, loadOlderMessages, mapLegacyMessage, getChatById]);

    const loadedChatId = useRef<string | null>(null);

    useEffect(() => {
        if (!id || loadedChatId.current === id) return;
        loadedChatId.current = id;
        void loadMessages(1);
    }, [id, loadMessages]);

    // ── Schedule midnight update for date labels ─────────────────
    useEffect(() => {
        const scheduleMidnightUpdate = () => {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0); // Set to midnight

            const msUntilMidnight = tomorrow.getTime() - now.getTime();

            midnightTimer.current = setTimeout(() => {
                // Force re-render to update "Today" → "Yesterday" labels
                forceUpdate(prev => prev + 1);
                // Schedule next midnight update
                scheduleMidnightUpdate();
            }, msUntilMidnight);
        };

        scheduleMidnightUpdate();

        return () => {
            if (midnightTimer.current) clearTimeout(midnightTimer.current);
        };
    }, []);

    // ── Mark as read ─────────────────────────────────────────────
    const markedReadId = useRef<string | null>(null);

    useEffect(() => {
        if (!id || markedReadId.current === id) return;
        markedReadId.current = id;
        // Always use DataContext's markChatRead - it updates both DB and local state
        void markChatRead(id).catch(() => undefined);
    }, [id, markChatRead]);

    // ── Fetch online status ──────────────────────────────────────
    useEffect(() => {
        if (!recipientId || isLegacyMode) return;
        
        void (async () => {
            try {
                const status = await chatApi.getUserStatus(recipientId);
                if (status.isOnline) {
                    setOnlineStatus({ isOnline: true, lastSeenText: null });
                } else {
                    const lastSeen = formatLastSeen(status.lastSeenAt);
                    setOnlineStatus({ isOnline: false, lastSeenText: lastSeen });
                }
            } catch {
                // Fail silently  — status is optional
            }
        })();
    }, [recipientId, isLegacyMode]);

    // ── Search with debounce ─────────────────────────────────────
    useEffect(() => {
        if (!isSearching) return;
        
        if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);

        if (!searchQuery.trim()) {
            setSearchResults([]);
            setHighlightedMessageId(null);
            return;
        }

        searchDebounceTimer.current = setTimeout(() => {
            void (async () => {
                try {
                    const result = await chatApi.searchConversation(id, searchQuery);
                    setSearchResults(result.results as ChatMessage[]);
                    if (result.results && result.results.length > 0) {
                        setHighlightedMessageId((result.results[0] as ChatMessage).messageId);
                    }
                } catch {
                    setSearchResults([]);
                }
            })();
        }, 300);

        return () => {
            if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);
        };
    }, [searchQuery, isSearching, id]);

    // ── Socket: join room & subscribe to messages ────────────────
    useEffect(() => {
        if (!id) return;

        if (isLegacyMode) {
            const unsubLegacy = subscribeToMessages(id, (legacyMsgs) => {
                setMessages(sortMessagesNewestFirst(legacyMsgs.map(mapLegacyMessage)));
            });
            return () => {
                unsubLegacy();
            };
        }

        joinConversation(id);
        typingEmitter.current = createTypingEmitter(id);

        const unsubMsg = onReceiveMessage((msg) => {
            console.log('[ChatScreen] 📨 Received message:', msg.conversationId, 'Current chat:', id);
            if (msg.conversationId !== id) {
                console.log('[ChatScreen] ⏭️ Skipping - message for different conversation');
                return;
            }
            console.log('[ChatScreen] 🔄 Updating messages state...');
            setMessages(prev => {
                const isDuplicate = prev.some(m => m.messageId === msg.messageId);
                console.log('[ChatScreen] Current messages count:', prev.length, 'Is duplicate:', isDuplicate);
                if (isDuplicate) {
                    console.log('[ChatScreen] ⏭️ Duplicate message, skipping');
                    return prev;
                }
                const updated = mergeMessages([msg as ChatMessage, ...prev]);
                console.log('[ChatScreen] ✅ State updated! New count:', updated.length);
                return updated;
            });
            scrollToLatest();
            // Automatically marking read on receive is removed to save API calls
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

        const unsubDeleted = onMessageDeleted(({ messageId: deletedMessageId, conversationId: deletedConvId }) => {
            if (deletedConvId !== id) return;
            setMessages(prev => prev.map(m =>
                m.messageId === deletedMessageId
                    ? { ...m, isDeleted: true, textContent: null }
                    : m
            ));
        });

        const unsubReactionAdded = onReactionAdded(({ messageId, userId, emoji }) => {
            setMessages(prev => prev.map(m => {
                if (m.messageId === messageId) {
                    const reactions = m.reactions || [];
                    const newReaction = { emoji, userId };
                    return { ...m, reactions: [...reactions, newReaction] };
                }
                return m;
            }));
        });

        const unsubReactionRemoved = onReactionRemoved(({ messageId, userId, emoji }) => {
            setMessages(prev => prev.map(m => {
                if (m.messageId === messageId) {
                    const reactions = (m.reactions || []).filter(r => !(r.userId === userId && r.emoji === emoji));
                    return { ...m, reactions };
                }
                return m;
            }));
        });

        return () => {
            leaveConversation(id);
            typingEmitter.current?.cleanup();
            unsubMsg();
            unsubSeen();
            unsubTyping();
            unsubDeleted();
            unsubReactionAdded();
            unsubReactionRemoved();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, isLegacyMode, user?.id, user?.displayName]);

    // ── Send message ─────────────────────────────────────────────
    const [sendingMedia, setSendingMedia] = useState(false);
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // ── Pick & send image ─────────────────────────────────────────
    const pickAndSendImage = async () => {
        if (!user?.id || !id || sendingMedia) return;

        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please allow access to your photo library to send images.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.8,
        });

        if (result.canceled || !result.assets?.[0]) return;

        const asset = result.assets[0];
        const fileName = asset.fileName ?? asset.uri.split('/').pop() ?? 'photo.jpg';
        const mimeType = asset.mimeType ?? 'image/jpeg';

        // Optimistic image bubble
        const optimisticId = `opt-img-${Date.now()}`;
        const optimisticMsg: ChatMessage = {
            messageId:      optimisticId,
            conversationId: id,
            senderId:       user.id,
            senderName:     user.displayName,
            messageType:    'image',
            textContent:    null,
            mediaUrl:       asset.uri,   // local URI for instant preview
            mediaName:      fileName,
            isRead:         false,
            readAt:         null,
            isDeleted:      false,
            createdAt:      new Date().toISOString(),
        };
        setMessages(prev => mergeMessages([optimisticMsg, ...prev]));
        scrollToLatest(false);
        setSendingMedia(true);

        try {
            console.log('🖼️ [1/4] Building FormData...');
            // Build multipart form (platform-specific)
            const formData = new FormData();

            if (Platform.OS === 'web') {
                // Web: fetch the blob from the URI first
                const response = await fetch(asset.uri);
                const blob = await response.blob();
                formData.append('image', blob, fileName);
            } else {
                // Native: use uri/name/type format
                formData.append('image', {
                    uri:  asset.uri,
                    name: fileName,
                    type: mimeType,
                } as any);
            }

            console.log('🖼️ [2/4] Uploading to /api/upload...');
            const token = getApiToken();
            const uploadRes = await fetch(`${getApiBase()}/api/upload`, {
                method:  'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body:    formData,
            });

            if (!uploadRes.ok) {
                const err = await uploadRes.json().catch(() => ({ error: 'Upload failed' }));
                console.error('❌ Upload failed:', err);
                throw new Error(err?.error ?? 'Upload failed');
            }

            const { url } = await uploadRes.json() as { url: string };
            console.log('✅ [3/4] Upload success! URL:', url);

            console.log('🖼️ [4/4] Sending media message...');
            const { message } = await chatApi.sendMedia(id, url, fileName, 'image');
            console.log('✅ Media message sent!', message);
            const stableMsg: ChatMessage = {
                ...message,
                messageId:  message.messageId || optimisticId,
                senderId:   message.senderId  || user.id,
                senderName: message.senderName || user.displayName,
                mediaUrl:   message.mediaUrl  ?? url,
                createdAt:  message.createdAt || optimisticMsg.createdAt,
            };
            setMessages(prev => mergeMessages(prev.map(m =>
                m.messageId === optimisticId ? stableMsg : m
            )));
            scrollToLatest(false);
        } catch (error) {
            console.error('❌ Image send FAILED:', error);
            setMessages(prev => prev.filter(m => m.messageId !== optimisticId));
            const msg = (error as { message?: string })?.message || 'Image could not be sent. Please try again.';
            Alert.alert('Send failed', msg);
        } finally {
            setSendingMedia(false);
        }
    };

    const pickAndSendDocument = async () => {
        if (!user?.id || !id || sendingMedia) return;

        const result = await DocumentPicker.getDocumentAsync({
            type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            copyToCacheDirectory: true,
        });

        if (result.canceled || !result.assets?.[0]) return;

        const asset = result.assets[0];
        const fileName = asset.name;
        const mimeType = asset.mimeType ?? 'application/pdf';

        // Optimistic file bubble
        const optimisticId = `opt-file-${Date.now()}`;
        const optimisticMsg: ChatMessage = {
            messageId:      optimisticId,
            conversationId: id,
            senderId:       user.id,
            senderName:     user.displayName,
            messageType:    'file',
            textContent:    null,
            mediaUrl:       asset.uri,
            mediaName:      fileName,
            isRead:         false,
            readAt:         null,
            isDeleted:      false,
            createdAt:      new Date().toISOString(),
        };
        setMessages(prev => mergeMessages([optimisticMsg, ...prev]));
        scrollToLatest(false);
        setSendingMedia(true);

        try {
            console.log('📄 [1/4] Building FormData for document...');
            const formData = new FormData();

            if (Platform.OS === 'web') {
                const response = await fetch(asset.uri);
                const blob = await response.blob();
                formData.append('image', blob, fileName);
            } else {
                formData.append('image', {
                    uri:  asset.uri,
                    name: fileName,
                    type: mimeType,
                } as any);
            }

            console.log('📄 [2/4] Uploading to /api/upload...');
            const token = getApiToken();
            const uploadRes = await fetch(`${getApiBase()}/api/upload`, {
                method:  'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body:    formData,
            });

            if (!uploadRes.ok) {
                const err = await uploadRes.json().catch(() => ({ error: 'Upload failed' }));
                console.error('❌ Upload failed:', err);
                throw new Error(err?.error ?? 'Upload failed');
            }

            const { url } = await uploadRes.json() as { url: string };
            console.log('✅ [3/4] Upload success! URL:', url);

            console.log('📄 [4/4] Sending file message...');
            const { message } = await chatApi.sendMedia(id, url, fileName, 'file');
            console.log('✅ File message sent!', message);

            const stableMsg: ChatMessage = {
                ...message,
                messageId:  message.messageId || optimisticId,
                senderId:   message.senderId  || user.id,
                senderName: message.senderName || user.displayName,
                mediaUrl:   message.mediaUrl  ?? url,
                createdAt:  message.createdAt || optimisticMsg.createdAt,
            };
            setMessages(prev => mergeMessages(prev.map(m =>
                m.messageId === optimisticId ? stableMsg : m
            )));
            scrollToLatest(false);
        } catch (error) {
            console.error('❌ Document send FAILED:', error);
            setMessages(prev => prev.filter(m => m.messageId !== optimisticId));
            const msg = (error as { message?: string })?.message || 'Document could not be sent. Please try again.';
            Alert.alert('Send failed', msg);
        } finally {
            setSendingMedia(false);
        }
    };


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
        setMessages(prev => mergeMessages([optimisticMsg, ...prev]));
        scrollToLatest(false);
        setText('');
        setSending(true);

        try {
            if (isLegacyMode) {
                await sendLegacyMessage(id, t, user.id);
                setMessages(prev => prev.filter(m => m.messageId !== optimisticMsg.messageId));
                await loadMessages(1);
            } else {
                const { message } = await chatApi.sendMessage(id, t, {
                    id: user.id,
                    name: user.displayName,
                });
                const stableMessage: ChatMessage = {
                    ...message,
                    messageId: message.messageId || optimisticMsg.messageId,
                    senderId: message.senderId || user.id,
                    senderName: message.senderName || user.displayName,
                    textContent: message.textContent ?? t,
                    createdAt: message.createdAt || optimisticMsg.createdAt,
                };
                setMessages(prev => mergeMessages(prev.map(m =>
                    m.messageId === optimisticMsg.messageId ? stableMessage : m
                )));
                scrollToLatest(false);
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

    // ── Reactions ────────────────────────────────────────────────
    const handleReaction = async (messageId: string, emoji: string) => {
        try {
            await chatApi.addReaction(messageId, emoji);
            // Socket will update the state in real-time
        } catch (error) {
            console.error('Failed to add reaction:', error);
            Alert.alert('Error', 'Could not add reaction');
        }
        setReactingToMessageId(null);
    };

    // ── Message Actions Menu ─────────────────────────────────────
    const handleMessageLongPress = (message: ChatMessage) => {
        if (message.isDeleted) return;

        const isMe = message.senderId === user?.id;

        // Simple Alert.alert menu (temporary until ActionSheet is fixed)
        Alert.alert('Message Actions', 'Choose an action', [
            {
                text: 'Reply',
                onPress: () => Alert.alert('Reply', 'Reply feature coming soon!'),
            },
            ...(isMe && message.messageType === 'text' ? [{
                text: 'Edit',
                onPress: () => Alert.alert('Edit', 'Edit feature coming soon!'),
            }] : []),
            {
                text: 'Pin',
                onPress: () => Alert.alert('Pin', 'Pin feature coming soon!'),
            },
            {
                text: 'Delete for me',
                style: 'destructive' as const,
                onPress: async () => {
                    try {
                        await chatApi.deleteMessage(message.messageId, false);
                        setMessages(prev => prev.map(m =>
                            m.messageId === message.messageId
                                ? { ...m, isDeleted: true, textContent: null }
                                : m
                        ));
                    } catch (e) {
                        Alert.alert('Error', 'Failed to delete message');
                    }
                },
            },
            ...(isMe ? [{
                text: 'Delete for everyone',
                style: 'destructive' as const,
                onPress: async () => {
                    try {
                        await chatApi.deleteMessage(message.messageId, true);
                        setMessages(prev => prev.map(m =>
                            m.messageId === message.messageId
                                ? { ...m, isDeleted: true, textContent: null }
                                : m
                        ));
                    } catch (e) {
                        Alert.alert('Error', 'Failed to delete message for everyone');
                    }
                },
            }] : []),
            {
                text: 'Cancel',
                style: 'cancel' as const,
            },
        ]);
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

        // Date separator (shown after message in JSX = visually above in inverted list)
        const showDate = needsDateSep(messages, index);

        return (
            <>
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
                            item.isDeleted && styles.bubbleDeleted,
                            highlightedMessageId === item.messageId && styles.bubbleHighlighted,
                        ]}
                        onLongPress={() => handleMessageLongPress(item)}
                    >
                        {/* Show deleted placeholder or message content */}
                        {item.isDeleted ? (
                            <Text style={[styles.bubbleText, styles.deletedText]}>
                                This message was deleted
                            </Text>
                        ) : (
                            <>
                                {/* Sender name (group-chat style for received messages) */}
                                {!isMe && (
                                    <Text style={styles.senderName}>{item.senderName || otherName}</Text>
                                )}

                                {/* Image bubble */}
                                {item.messageType === 'image' && item.mediaUrl ? (
                                    <Pressable onPress={() => setViewingImage(item.mediaUrl)}>
                                        <Image
                                            source={{ uri: item.mediaUrl }}
                                            style={styles.msgImage}
                                            resizeMode="cover"
                                        />
                                    </Pressable>
                                ) : item.messageType === 'file' && item.mediaUrl ? (
                                    /* File card */
                                    <Pressable
                                        style={styles.fileCard}
                                        onPress={() => Linking.openURL(item.mediaUrl!)}
                                    >
                                        <Ionicons name="document-outline" size={32} color={AppColors.primary} />
                                        <View style={styles.fileInfo}>
                                            <Text style={styles.fileName} numberOfLines={1}>
                                                {item.mediaName || 'Document'}
                                            </Text>
                                            <Text style={styles.fileAction}>Tap to open</Text>
                                        </View>
                                    </Pressable>
                                ) : (item.messageType as any) === 'audio' && item.mediaUrl ? (
                                    /* Audio playback card */
                                    <Pressable
                                        style={styles.audioCard}
                                        onPress={() => Linking.openURL(item.mediaUrl!)}
                                    >
                                        <Ionicons name="play-circle" size={32} color={AppColors.primary} />
                                        <View style={styles.audioInfo}>
                                            <Text style={styles.audioText}>Voice message</Text>
                                            <Text style={styles.audioAction}>Tap to play</Text>
                                        </View>
                                        <Ionicons name="volume-medium-outline" size={20} color={AppColors.textMuted} />
                                    </Pressable>
                                ) : (
                                    /* Message text */
                                    <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
                                        {item.textContent}
                                    </Text>
                                )}
                            </>
                        )}

                        {/* Reactions */}
                        {!item.isDeleted && item.reactions && item.reactions.length > 0 && (
                            <View style={styles.reactionsRow}>
                                {Object.entries(
                                    item.reactions.reduce((acc, r) => {
                                        acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                        return acc;
                                    }, {} as Record<string, number>)
                                ).map(([emoji, count]) => (
                                    <Pressable
                                        key={emoji}
                                        style={[
                                            styles.reactionBubble,
                                            item.reactions?.some(r => r.emoji === emoji && r.userId === user?.id)
                                                && styles.reactionBubbleActive
                                        ]}
                                        onPress={() => handleReaction(item.messageId, emoji)}
                                    >
                                        <Text style={styles.reactionEmoji}>{emoji}</Text>
                                        {count > 1 && <Text style={styles.reactionCount}>{count}</Text>}
                                    </Pressable>
                                ))}
                                <Pressable
                                    style={styles.addReactionBtn}
                                    onPress={() => setReactingToMessageId(item.messageId)}
                                >
                                    <Ionicons name="add-circle-outline" size={16} color={AppColors.textMuted} />
                                </Pressable>
                            </View>
                        )}

                        {/* Add reaction button (when no reactions) */}
                        {!item.isDeleted && (!item.reactions || item.reactions.length === 0) && (
                            <Pressable
                                style={styles.addReactionBtn}
                                onPress={() => setReactingToMessageId(item.messageId)}
                            >
                                <Ionicons name="add-circle-outline" size={16} color={AppColors.textMuted} />
                            </Pressable>
                        )}

                        {/* Time + tick */}
                        <View style={styles.meta}>
                            <Text style={[styles.time, isMe && styles.timeMe]}>
                                {formatTime(msgTime)}
                            </Text>
                            {isMe && !item.isDeleted && (
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

                {showDate && (
                    <View style={styles.dateSepWrap}>
                        <View style={styles.dateSep}>
                            <Text style={styles.dateSepText}>{formatDateLabel(msgTime)}</Text>
                        </View>
                    </View>
                )}
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
                        ) : onlineStatus.isOnline ? (
                            <View style={styles.onlineStatus}>
                                <View style={styles.onlineDot} />
                                <Text style={styles.onlineText}>online</Text>
                            </View>
                        ) : onlineStatus.lastSeenText ? (
                            <Text style={styles.headerSub}>{onlineStatus.lastSeenText}</Text>
                        ) : (
                            <Text style={styles.headerSub}>CampusBarter</Text>
                        )}
                    </View>
                </Pressable>

                {/* Header actions */}
                <View style={styles.headerActions}>
                    <Pressable style={styles.headerIcon} hitSlop={10}
                        onPress={() => setIsSearching(!isSearching)}>
                        <Ionicons name="search" size={20} color="#FFF" />
                    </Pressable>
                </View>
            </View>

            {/* Search bar */}
            {isSearching && (
                <View style={styles.searchBar}>
                    <Pressable style={styles.searchCloseBtn} onPress={() => {
                        setIsSearching(false);
                        setSearchQuery('');
                        setSearchResults([]);
                        setHighlightedMessageId(null);
                    }}>
                        <Ionicons name="close" size={20} color={AppColors.textMuted} />
                    </Pressable>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search messages"
                        placeholderTextColor={AppColors.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus
                    />
                    {searchResults.length > 0 && (
                        <Text style={styles.searchResultCount}>
                            {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}
                        </Text>
                    )}
                </View>
            )}

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
                            maintainVisibleContentPosition={{ minIndexForVisible: 0, autoscrollToTopThreshold: 10 }}
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
                            onKeyPress={(e) => {
                                // On web, send on Enter (without Shift)
                                if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter') {
                                    const webEvent = e.nativeEvent as any;
                                    if (!webEvent.shiftKey) {
                                        e.preventDefault();
                                        if (text.trim()) {
                                            handleSend();
                                        }
                                    }
                                }
                            }}
                        />

                        {/* Emoji button */}
                        <Pressable hitSlop={8} onPress={() => setShowEmojiPicker(!showEmojiPicker)}>
                            <Ionicons name={showEmojiPicker ? "close-circle" : "happy-outline"} size={23} color={AppColors.textMuted} />
                        </Pressable>

                        {/* Attachment button */}
                        <Pressable hitSlop={8} onPress={() => setShowAttachMenu(true)} disabled={sendingMedia}>
                            {sendingMedia ? (
                                <ActivityIndicator size="small" color={AppColors.textMuted} />
                            ) : (
                                <Ionicons name="attach-outline" size={23} color={AppColors.textMuted}
                                    style={{ transform: [{ rotate: '45deg' }] }} />
                            )}
                        </Pressable>
                    </View>

                    {/* Send button */}
                    <Pressable
                        style={styles.sendBtn}
                        onPress={handleSend}
                        disabled={!text.trim() || sending || sendingMedia}
                    >
                        {sending || sendingMedia ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            <Ionicons
                                name="send"
                                size={20}
                                color="#FFF"
                            />
                        )}
                    </Pressable>
                </View>
            </KeyboardAvoidingView>

            {/* Emoji Picker */}
            {showEmojiPicker && (
                <View style={styles.emojiPickerContainer}>
                    <EmojiSelector
                        onEmojiSelected={(emoji) => {
                            setText(text + emoji);
                            setShowEmojiPicker(false);
                        }}
                        showSearchBar={false}
                        showHistory={false}
                        showSectionTitles={false}
                        columns={8}
                    />
                </View>
            )}

            {/* Attachment menu */}
            <Modal
                visible={showAttachMenu}
                transparent
                animationType="slide"
                onRequestClose={() => setShowAttachMenu(false)}
            >
                <Pressable
                    style={styles.attachMenuOverlay}
                    onPress={() => setShowAttachMenu(false)}
                >
                    <View style={styles.attachMenuContent}>
                        <Pressable
                            style={styles.attachOption}
                            onPress={() => {
                                setShowAttachMenu(false);
                                pickAndSendImage();
                            }}
                        >
                            <Ionicons name="image-outline" size={24} color={AppColors.primary} />
                            <Text style={styles.attachOptionText}>Gallery</Text>
                        </Pressable>

                        <Pressable
                            style={styles.attachOption}
                            onPress={() => {
                                setShowAttachMenu(false);
                                pickAndSendDocument();
                            }}
                        >
                            <Ionicons name="document-outline" size={24} color={AppColors.primary} />
                            <Text style={styles.attachOptionText}>Document</Text>
                        </Pressable>

                        <Pressable
                            style={[styles.attachOption, styles.attachCancel]}
                            onPress={() => setShowAttachMenu(false)}
                        >
                            <Text style={styles.attachCancelText}>Cancel</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>

            {/* Full-screen image viewer */}
            <Modal
                visible={!!viewingImage}
                transparent
                animationType="fade"
                onRequestClose={() => setViewingImage(null)}
            >
                <Pressable
                    style={styles.imageViewerOverlay}
                    onPress={() => setViewingImage(null)}
                >
                    <Image
                        source={{ uri: viewingImage || '' }}
                        style={styles.imageViewerImage}
                        resizeMode="contain"
                    />
                    <Pressable
                        style={styles.imageViewerClose}
                        onPress={() => setViewingImage(null)}
                    >
                        <Ionicons name="close" size={32} color="#FFF" />
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Reaction Picker */}
            <Modal
                visible={!!reactingToMessageId}
                transparent
                animationType="fade"
                onRequestClose={() => setReactingToMessageId(null)}
            >
                <Pressable
                    style={styles.reactionPickerOverlay}
                    onPress={() => setReactingToMessageId(null)}
                >
                    <View style={styles.reactionPickerContent}>
                        {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                            <Pressable
                                key={emoji}
                                style={styles.reactionOption}
                                onPress={() => reactingToMessageId && handleReaction(reactingToMessageId, emoji)}
                            >
                                <Text style={styles.reactionOptionEmoji}>{emoji}</Text>
                            </Pressable>
                        ))}
                    </View>
                </Pressable>
            </Modal>
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
    onlineStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 1,
    },
    onlineDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#90EE90',
    },
    onlineText: {
        fontSize: 11,
        color: '#90EE90',
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

    // Search bar
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#F0F0F0',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    searchCloseBtn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#111',
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        height: 36,
    },
    searchResultCount: {
        fontSize: 12,
        color: AppColors.textMuted,
        fontWeight: '500',
    },

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
    bubbleDeleted: {
        backgroundColor: 'rgba(200, 200, 200, 0.3)',
    },
    bubbleHighlighted: {
        borderWidth: 2,
        borderColor: AppColors.primary,
        backgroundColor: 'rgba(26, 92, 56, 0.1)',
    },
    deletedText: {
        color: '#999',
        fontStyle: 'italic',
        fontSize: 13,
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
    msgImage: {
        width: 200,
        height: 200,
        borderRadius: 10,
        backgroundColor: '#e0e0e0',
    },
    fileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        padding: 12,
        borderRadius: 10,
        minWidth: 200,
        maxWidth: 250,
    },
    fileInfo: {
        marginLeft: 12,
        flex: 1,
    },
    fileName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
        marginBottom: 4,
    },
    fileAction: {
        fontSize: 12,
        color: AppColors.primary,
    },
    audioCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        padding: 12,
        borderRadius: 10,
        minWidth: 220,
        maxWidth: 250,
    },
    audioInfo: {
        marginLeft: 12,
        flex: 1,
    },
    audioText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
        marginBottom: 4,
    },
    audioAction: {
        fontSize: 12,
        color: AppColors.primary,
    },
    imageViewerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageViewerImage: {
        width: '100%',
        height: '100%',
    },
    imageViewerClose: {
        position: 'absolute',
        top: 50,
        right: 20,
        padding: 10,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    attachMenuOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    attachMenuContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        paddingTop: 10,
    },
    attachOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    attachOptionText: {
        fontSize: 16,
        marginLeft: 16,
        color: '#000',
    },
    attachCancel: {
        borderBottomWidth: 0,
        marginTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    attachCancelText: {
        fontSize: 16,
        color: '#FF3B30',
        textAlign: 'center',
        width: '100%',
    },
    emojiPickerContainer: {
        height: 300,
        backgroundColor: '#FFF',
    },
    recordingOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    },
    recordingContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    recordingText: {
        color: '#FFF',
        fontSize: 16,
        marginLeft: 12,
        fontWeight: '600',
    },
    recordingCancel: {
        marginLeft: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#FF3B30',
        borderRadius: 20,
    },
    recordingCancelText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    recordingHint: {
        color: '#AAA',
        fontSize: 12,
        textAlign: 'center',
    },
    reactionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginTop: 4,
        marginBottom: 2,
    },
    reactionBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    reactionBubbleActive: {
        backgroundColor: AppColors.primaryLight,
        borderColor: AppColors.primary,
    },
    reactionEmoji: {
        fontSize: 14,
    },
    reactionCount: {
        fontSize: 11,
        marginLeft: 3,
        color: '#666',
        fontWeight: '600',
    },
    addReactionBtn: {
        marginTop: 4,
        padding: 4,
    },
    reactionPickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    reactionPickerContent: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        flexDirection: 'row',
        padding: 12,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5,
    },
    reactionOption: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#F5F5F5',
    },
    reactionOptionEmoji: {
        fontSize: 32,
    },
});
