import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type OnboardingContextType = {
    hasSeenOnboarding: boolean;
    completeOnboarding: () => void;
};

const OnboardingContext = createContext<OnboardingContextType>({
    hasSeenOnboarding: false,
    completeOnboarding: () => { },
});

export function useOnboarding() {
    return useContext(OnboardingContext);
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
    const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

    const completeOnboarding = useCallback(() => {
        setHasSeenOnboarding(true);
        // TODO: Persist to AsyncStorage
    }, []);

    return (
        <OnboardingContext.Provider value={{ hasSeenOnboarding, completeOnboarding }}>
            {children}
        </OnboardingContext.Provider>
    );
}
