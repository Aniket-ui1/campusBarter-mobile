import type { Href, Router } from 'expo-router';

const DEFAULT_FALLBACK: Href = '/(tabs)';

export function safeGoBack(router: Router, fallback: Href = DEFAULT_FALLBACK): void {
    if (router.canGoBack()) {
        router.back();
        return;
    }

    router.replace(fallback);
}
