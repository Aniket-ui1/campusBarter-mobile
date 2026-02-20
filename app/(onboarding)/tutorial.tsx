import React, { useRef, useState } from 'react';
import { Dimensions, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { AppColors, Radii, Spacing } from '@/constants/theme';
import { useOnboarding } from '@/context/OnboardingContext';
import { Button } from '@/components/ui/Button';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
    {
        emoji: '📋',
        title: 'Post Your Skills',
        description: "Share what you are great at — coding, design, music, writing, or anything else. Help fellow students and earn time credits.",
        color: AppColors.primary,
    },
    {
        emoji: '🔍',
        title: 'Find What You Need',
        description: "Browse skills offered by students on campus. Filter by category, program, or rating to find the perfect match.",
        color: AppColors.secondary,
    },
    {
        emoji: '🤝',
        title: 'Exchange & Grow',
        description: "Trade skills using time credits — 1 hour = 1 credit. No money needed. Build your reputation with ratings and reviews.",
        color: AppColors.accent,
    },
];

export default function TutorialScreen() {
    const { completeOnboarding } = useOnboarding();
    const [activeIndex, setActiveIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    const handleNext = () => {
        if (activeIndex < SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({ index: activeIndex + 1 });
        } else {
            completeOnboarding();
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.statusSpacer} />

            {/* Skip button */}
            <View style={styles.topRow}>
                <Pressable onPress={completeOnboarding}>
                    <Text style={styles.skipText}>Skip</Text>
                </Pressable>
            </View>

            <FlatList
                ref={flatListRef}
                data={SLIDES}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                    setActiveIndex(i);
                }}
                keyExtractor={(_, i) => String(i)}
                renderItem={({ item }) => (
                    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
                        <View style={[styles.emojiCircle, { borderColor: item.color + '40' }]}>
                            <Text style={{ fontSize: 56 }}>{item.emoji}</Text>
                        </View>
                        <Text style={styles.slideTitle}>{item.title}</Text>
                        <Text style={styles.slideDesc}>{item.description}</Text>
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
    container: { flex: 1, backgroundColor: AppColors.background },
    statusSpacer: { height: Platform.OS === 'ios' ? 54 : 36 },
    topRow: {
        alignItems: 'flex-end',
        paddingHorizontal: Spacing.xl,
        marginBottom: Spacing.xl,
    },
    skipText: {
        color: AppColors.textMuted,
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
        backgroundColor: AppColors.surface,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing['3xl'],
    },
    slideTitle: {
        fontSize: 28, fontWeight: '900',
        color: AppColors.text,
        letterSpacing: -0.5,
        textAlign: 'center',
        marginBottom: Spacing.md,
    },
    slideDesc: {
        fontSize: 15,
        color: AppColors.textSecondary,
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
        backgroundColor: AppColors.border,
    },
});
