export type User = {
    id: string;
    email: string;
    displayName: string;
    avatar?: string;
    program: string;
    major: string;
    semester: number;
    campus: string;
    bio: string;
    rating: number;
    reviewCount: number;
    createdAt: string;
};

export type Listing = {
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    title: string;
    description: string;
    category: string;
    availability: 'available' | 'busy' | 'offline';
    location: 'online' | 'campus' | 'both';
    tags: string[];
    status: 'active' | 'draft' | 'completed';
    credits: number;
    rating: number;
    createdAt: string;
};

export type ChatThread = {
    id: string;
    participantIds: string[];
    participantName: string;
    participantAvatar?: string;
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
};

export type ChatMessage = {
    id: string;
    chatId: string;
    senderId: string;
    text: string;
    timestamp: string;
    seen: boolean;
};

export type Review = {
    id: string;
    fromUserId: string;
    fromUserName: string;
    fromUserAvatar?: string;
    toUserId: string;
    rating: number;
    comment: string;
    createdAt: string;
};

export type Notification = {
    id: string;
    type: 'request' | 'accepted' | 'message' | 'review';
    title: string;
    body: string;
    read: boolean;
    relatedId?: string;
    createdAt: string;
};

export type SkillRequest = {
    id: string;
    listingId: string;
    listingTitle: string;
    fromUserId: string;
    fromUserName: string;
    toUserId: string;
    status: 'pending' | 'accepted' | 'completed' | 'declined';
    createdAt: string;
};
