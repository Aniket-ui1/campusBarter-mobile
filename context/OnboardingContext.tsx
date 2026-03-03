import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@campusbarter_onboarding_seen';

type OnboardingContextType = {
    hasSeenOnboarding: boolean;
    isReady: boolean;
    completeOnboarding: () => void;
};

const OnboardingContext = createContext<OnboardingContextType>({
    hasSeenOnboarding: false,
    isReady: false,
    completeOnboarding: () => { },
});

export function useOnboarding() {
    return useContext(OnboardingContext);
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
    const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
    const [isReady, setIsReady] = useState(false);

    // Load persisted state on mount
    useEffect(() => {
        AsyncStorage.getItem(ONBOARDING_KEY)
            .then((val) => {
                if (val === 'true') setHasSeenOnboarding(true);
            })
            .catch(() => { })
            .finally(() => setIsReady(true));
    }, []);

    const completeOnboarding = useCallback(() => {
        setHasSeenOnboarding(true);
        AsyncStorage.setItem(ONBOARDING_KEY, 'true').catch(() => { });
    }, []);

    return (
        <OnboardingContext.Provider value={{ hasSeenOnboarding, isReady, completeOnboarding }}>
            {children}
        </OnboardingContext.Provider>
    );
}
