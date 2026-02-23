import type { User, Listing, ChatThread, ChatMessage, Review, Notification, SkillRequest } from '@/types';

// ─── Users ──────────────────────────────────────────────
export const MOCK_CURRENT_USER: User = {
    id: 'u1',
    email: 'student@edu.sait.ca',
    displayName: 'Alex Chen',
    avatar: undefined,
    program: 'Software Development',
    major: 'Full-Stack',
    semester: 4,
    campus: 'SAIT Main',
    bio: 'Full‑stack dev who loves React Native & TypeScript. Happy to help with coding or trade for design skills!',
    rating: 4.8,
    reviewCount: 12,
    createdAt: '2025-09-01',
};

export const MOCK_USERS: User[] = [
    MOCK_CURRENT_USER,
    { id: 'u2', email: 'sarah@edu.sait.ca', displayName: 'Sarah Kim', program: 'Graphic Design', major: 'UI/UX', semester: 3, campus: 'SAIT Main', bio: 'Figma wizard 🎨', rating: 4.9, reviewCount: 18, createdAt: '2025-08-15' },
    { id: 'u3', email: 'james@edu.sait.ca', displayName: 'James Wright', program: 'Engineering', major: 'Mechanical', semester: 5, campus: 'SAIT Main', bio: 'Math nerd 📐', rating: 4.5, reviewCount: 7, createdAt: '2025-09-10' },
    { id: 'u4', email: 'emily@edu.sait.ca', displayName: 'Emily Ross', program: 'Journalism', major: 'Writing', semester: 2, campus: 'SAIT Main', bio: 'Words are my thing ✍️', rating: 4.7, reviewCount: 9, createdAt: '2025-10-01' },
    { id: 'u5', email: 'daniel@edu.sait.ca', displayName: 'Daniel Lee', program: 'Business Administration', major: 'Marketing', semester: 6, campus: 'SAIT Main', bio: 'Guitar player & marketer 🎸', rating: 4.6, reviewCount: 5, createdAt: '2025-08-20' },
    { id: 'u6', email: 'priya@edu.sait.ca', displayName: 'Priya Patel', program: 'Nursing', major: 'Health Sciences', semester: 4, campus: 'SAIT Main', bio: 'Biology tutor 🧬', rating: 4.9, reviewCount: 22, createdAt: '2025-07-01' },
];

// ─── Listings ───────────────────────────────────────────
export const MOCK_LISTINGS: Listing[] = [
    { id: 'l1', userId: 'u2', userName: 'Sarah Kim', title: 'UI/UX Design Mentoring', description: 'Learn Figma prototyping, color theory, typography, and responsive design principles. Perfect for developers wanting to level up their design game.', category: 'design', availability: 'available', location: 'online', tags: ['figma', 'ui', 'ux'], status: 'active', credits: 1, rating: 4.9, createdAt: '2026-02-10' },
    { id: 'l2', userId: 'u1', userName: 'Alex Chen', title: 'React Native Tutoring', description: 'Build cross-platform mobile apps with React Native & Expo. Covers components, navigation, state management, and deployment.', category: 'coding', availability: 'available', location: 'both', tags: ['react-native', 'expo', 'typescript'], status: 'active', credits: 1, rating: 4.8, createdAt: '2026-02-08' },
    { id: 'l3', userId: 'u3', userName: 'James Wright', title: 'Calculus II Study Sessions', description: 'Integration techniques, series convergence, differential equations. Weekly group sessions or 1-on-1.', category: 'math', availability: 'available', location: 'campus', tags: ['calculus', 'math', 'tutoring'], status: 'active', credits: 1, rating: 4.5, createdAt: '2026-02-05' },
    { id: 'l4', userId: 'u4', userName: 'Emily Ross', title: 'Essay & Report Proofreading', description: 'APA/MLA formatting, grammar, structure, and clarity feedback. Quick turnaround for assignments and reports.', category: 'writing', availability: 'busy', location: 'online', tags: ['writing', 'editing', 'apa'], status: 'active', credits: 1, rating: 4.7, createdAt: '2026-02-12' },
    { id: 'l5', userId: 'u5', userName: 'Daniel Lee', title: 'Acoustic Guitar Lessons', description: 'Beginner to intermediate. Chords, strumming, fingerpicking, and basic music theory.', category: 'music', availability: 'available', location: 'campus', tags: ['guitar', 'music', 'beginner'], status: 'active', credits: 1, rating: 4.6, createdAt: '2026-01-28' },
    { id: 'l6', userId: 'u6', userName: 'Priya Patel', title: 'Biology & Anatomy Tutoring', description: 'Covers cell biology, human anatomy, physiology. Great for nursing and health science students.', category: 'science', availability: 'available', location: 'both', tags: ['biology', 'anatomy', 'science'], status: 'active', credits: 1, rating: 4.9, createdAt: '2026-02-15' },
    { id: 'l7', userId: 'u5', userName: 'Daniel Lee', title: 'Marketing Strategy Workshop', description: 'Social media strategy, brand positioning, and campaign planning for student projects.', category: 'business', availability: 'offline', location: 'online', tags: ['marketing', 'social-media'], status: 'active', credits: 1, rating: 4.4, createdAt: '2026-02-01' },
    { id: 'l8', userId: 'u1', userName: 'Alex Chen', title: 'Python for Beginners', description: 'Learn Python from scratch — variables, loops, functions, OOP, and simple projects.', category: 'coding', availability: 'available', location: 'online', tags: ['python', 'beginner', 'coding'], status: 'draft', credits: 1, rating: 0, createdAt: '2026-02-18' },
];

// ─── Chats ──────────────────────────────────────────────
export const MOCK_CHAT_THREADS: ChatThread[] = [
    { id: 'c1', participantIds: ['u1', 'u2'], participantName: 'Sarah Kim', lastMessage: 'Sure, let\'s schedule for Thursday!', lastMessageAt: '2026-02-20T08:30:00Z', unreadCount: 2 },
    { id: 'c2', participantIds: ['u1', 'u3'], participantName: 'James Wright', lastMessage: 'Thanks for the calc help 🙏', lastMessageAt: '2026-02-19T22:15:00Z', unreadCount: 0 },
    { id: 'c3', participantIds: ['u1', 'u6'], participantName: 'Priya Patel', lastMessage: 'I can help with anatomy if you help me with React?', lastMessageAt: '2026-02-19T18:45:00Z', unreadCount: 1 },
    { id: 'c4', participantIds: ['u1', 'u4'], participantName: 'Emily Ross', lastMessage: 'I can proofread your assignment by tomorrow!', lastMessageAt: '2026-02-18T10:00:00Z', unreadCount: 0 },
    { id: 'c5', participantIds: ['u1', 'u5'], participantName: 'Daniel Lee', lastMessage: 'Happy to do a guitar lesson trade 🎸', lastMessageAt: '2026-02-17T15:00:00Z', unreadCount: 0 },
];

export const MOCK_MESSAGES: Record<string, ChatMessage[]> = {
    c1: [
        { id: 'm1', chatId: 'c1', senderId: 'u1', text: 'Hey Sarah! I\'d love help with Figma for my app.', timestamp: '2026-02-20T08:00:00Z', seen: true },
        { id: 'm2', chatId: 'c1', senderId: 'u2', text: 'Of course! I can show you the basics.', timestamp: '2026-02-20T08:15:00Z', seen: true },
        { id: 'm3', chatId: 'c1', senderId: 'u1', text: 'When are you free this week?', timestamp: '2026-02-20T08:20:00Z', seen: true },
        { id: 'm4', chatId: 'c1', senderId: 'u2', text: 'Sure, let\'s schedule for Thursday!', timestamp: '2026-02-20T08:30:00Z', seen: false },
    ],
    c2: [
        { id: 'm5', chatId: 'c2', senderId: 'u3', text: 'Hey Alex, did you get the integration problem?', timestamp: '2026-02-19T21:00:00Z', seen: true },
        { id: 'm6', chatId: 'c2', senderId: 'u1', text: 'Yeah! The trick was integration by parts.', timestamp: '2026-02-19T22:00:00Z', seen: true },
        { id: 'm7', chatId: 'c2', senderId: 'u3', text: 'Thanks for the calc help 🙏', timestamp: '2026-02-19T22:15:00Z', seen: true },
    ],
    c3: [
        { id: 'm8', chatId: 'c3', senderId: 'u6', text: 'Hi! I saw your React Native listing.', timestamp: '2026-02-19T18:00:00Z', seen: true },
        { id: 'm9', chatId: 'c3', senderId: 'u6', text: 'I can help with anatomy if you help me with React?', timestamp: '2026-02-19T18:45:00Z', seen: false },
    ],
    c4: [
        { id: 'm10', chatId: 'c4', senderId: 'u4', text: 'Hi Alex! I can help proofread your essays.', timestamp: '2026-02-18T09:30:00Z', seen: true },
        { id: 'm11', chatId: 'c4', senderId: 'u1', text: 'That would be great, I have a report due next week!', timestamp: '2026-02-18T09:45:00Z', seen: true },
        { id: 'm12', chatId: 'c4', senderId: 'u4', text: 'I can proofread your assignment by tomorrow!', timestamp: '2026-02-18T10:00:00Z', seen: true },
    ],
    c5: [
        { id: 'm13', chatId: 'c5', senderId: 'u5', text: 'Hey! Saw you do coding — interested in a trade?', timestamp: '2026-02-17T14:30:00Z', seen: true },
        { id: 'm14', chatId: 'c5', senderId: 'u1', text: 'Absolutely! I\'ve always wanted to learn guitar.', timestamp: '2026-02-17T14:45:00Z', seen: true },
        { id: 'm15', chatId: 'c5', senderId: 'u5', text: 'Happy to do a guitar lesson trade 🎸', timestamp: '2026-02-17T15:00:00Z', seen: true },
    ],
};

// ─── Reviews ────────────────────────────────────────────
export const MOCK_REVIEWS: Review[] = [
    { id: 'r1', fromUserId: 'u2', fromUserName: 'Sarah Kim', toUserId: 'u1', rating: 5, comment: 'Alex is an incredible teacher. Explained React Native concepts clearly and patiently.', createdAt: '2026-02-15' },
    { id: 'r2', fromUserId: 'u3', fromUserName: 'James Wright', toUserId: 'u1', rating: 5, comment: 'Great coding help. Helped me debug my entire project in one session!', createdAt: '2026-02-10' },
    { id: 'r3', fromUserId: 'u6', fromUserName: 'Priya Patel', toUserId: 'u1', rating: 4, comment: 'Very knowledgeable. Would have appreciated more examples.', createdAt: '2026-02-05' },
    { id: 'r4', fromUserId: 'u1', fromUserName: 'Alex Chen', toUserId: 'u2', rating: 5, comment: 'Sarah\'s Figma skills are next level. Redesigned my whole app!', createdAt: '2026-02-12' },
];

// ─── Notifications ──────────────────────────────────────
export const MOCK_NOTIFICATIONS: Notification[] = [
    { id: 'n1', type: 'request', title: 'New Request', body: 'Priya Patel wants your help with React Native.', read: false, relatedId: 'l2', createdAt: '2026-02-20T10:00:00Z' },
    { id: 'n2', type: 'message', title: 'New Message', body: 'Sarah Kim sent you a message.', read: false, relatedId: 'c1', createdAt: '2026-02-20T08:30:00Z' },
    { id: 'n3', type: 'review', title: 'New Review', body: 'James Wright left you a 5-star review!', read: true, relatedId: 'r2', createdAt: '2026-02-19T22:20:00Z' },
    { id: 'n4', type: 'accepted', title: 'Request Accepted', body: 'Sarah Kim accepted your design request.', read: true, relatedId: 'l1', createdAt: '2026-02-18T14:00:00Z' },
];

// ─── Requests ───────────────────────────────────────────
export const MOCK_REQUESTS: SkillRequest[] = [
    { id: 'sr1', listingId: 'l2', listingTitle: 'React Native Tutoring', fromUserId: 'u6', fromUserName: 'Priya Patel', toUserId: 'u1', status: 'pending', createdAt: '2026-02-20T10:00:00Z' },
    { id: 'sr2', listingId: 'l1', listingTitle: 'UI/UX Design Mentoring', fromUserId: 'u1', fromUserName: 'Alex Chen', toUserId: 'u2', status: 'accepted', createdAt: '2026-02-18T12:00:00Z' },
    { id: 'sr3', listingId: 'l3', listingTitle: 'Calculus II Study Sessions', fromUserId: 'u1', fromUserName: 'Alex Chen', toUserId: 'u3', status: 'completed', createdAt: '2026-02-10T09:00:00Z' },
];
