import { Button } from '@/components/ui/Button';
import { Spacing } from '@/constants/theme';
import { useOnboarding } from '@/context/OnboardingContext';
import { useThemeColors } from '@/context/ThemeContext';
import React, { useRef, useState } from 'react';
import { Dimensions, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function TutorialScreen() {
    const { completeOnboarding } = useOnboarding();
    const colors = useThemeColors();
    const [activeIndex, setActiveIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    const SLIDES = [
    {
        emoji: '👋',
        title: 'Welcome to CampusBarter',
        description: "Trade skills with students on campus — no money needed. Help each other grow using a time-credit system.",
        color: colors.primary,
    },
    {
        emoji: '📋',
        title: 'Post Your Skills',
        description: "Share what you're great at \u2014 coding, design, music, writing, or anything else. Other students can find and request your help.",
        color: colors.secondary,
    },
    {
        emoji: '🔍',
        title: 'Find What You Need',
        description: "Browse skills offered by students. Filter by category, skill, or use Smart Matching to find someone whose strengths cover your weaknesses.",
        color: colors.accent,
    },
    {
        emoji: '🤝',
        title: 'Exchange & Grow',
        description: "Trade skills using time credits — 1 hour = 1 credit. Build your reputation with ratings and reviews from other students.",
        color: '#FACC15',
    },
    {
        emoji: '👤',
        title: 'One-Time Profile Setup',
        description: "After signing in, you'll be asked to complete your profile once — your program, skills, interests, and a photo. This only happens the first time!",
        color: '#6B8F71',
    },
    {
        emoji: '🚀',
        title: "You're All Set!",
        description: "Start posting your skills, find help from classmates, and grow together. Let's build a stronger campus community!",
        color: colors.primary,
    },
];

    const handleNext = () => {
        if (activeIndex < SLIDES.length - 1) {
            const nextIndex = activeIndex + 1;
            flatListRef.current?.scrollToOffset({
                offset: nextIndex * SCREEN_WIDTH,
                animated: true,
            });
            setActiveIndex(nextIndex);
        } else {
            completeOnboarding();
        }
    };

    const handleScroll = (e: any) => {
        const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        if (i >= 0 && i < SLIDES.length) {
            setActiveIndex(i);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.statusSpacer} />

            {/* Skip button */}
            <View style={styles.topRow}>
                <Pressable onPress={completeOnboarding}>
                    <Text style={[styles.skipText, { color: colors.textMuted }]}>Skip</Text>
                </Pressable>
            </View>

            <FlatList
                ref={flatListRef}
                data={SLIDES}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                keyExtractor={(_, i) => String(i)}
                renderItem={({ item }) => (
                    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
                        <View style={[styles.emojiCircle, { backgroundColor: colors.surface, borderColor: item.color + '40' }]}>
                            <Text style={{ fontSize: 56 }}>{item.emoji}</Text>
                        </View>
                        <Text style={[styles.slideTitle, { color: colors.text }]}>{item.title}</Text>
                        <Text style={[styles.slideDesc, { color: colors.textSecondary }]}>{item.description}</Text>
                    </View>
                )}
            />

            {/* Dots + Button */}
            <View style={styles.bottom}>
                <View style={styles.dots}>
                    {SLIDES.map((s, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                { backgroundColor: colors.border },
                                activeIndex === i && { width: 24, backgroundColor: s.color },
                            ]}
                        />
                    ))}
                </View>

                <Button
                    title={activeIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
                    onPress={handleNext}
                    fullWidth
                    size="lg"
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36 },
    topRow: {
        alignItems: 'flex-end',
        paddingHorizontal: Spacing.xl,
        marginBottom: Spacing.xl,
    },
    skipText: {
        fontSize: 15,
        fontWeight: '600',
    },
    slide: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing['3xl'],
        paddingBottom: 60,
    },
    emojiCircle: {
        width: 120, height: 120, borderRadius: 60,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing['3xl'],
    },
    slideTitle: {
        fontSize: 28, fontWeight: '900',
        letterSpacing: -0.5,
        textAlign: 'center',
        marginBottom: Spacing.md,
    },
    slideDesc: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 24,
    },
    bottom: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: Platform.OS === 'ios' ? 50 : 30,
        gap: Spacing.xl,
    },
    dots: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    dot: {
        width: 8, height: 8, borderRadius: 4,
    },
});
