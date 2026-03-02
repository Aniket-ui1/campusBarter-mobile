// backend/src/monitoring.ts
// ─────────────────────────────────────────────────────────────
// Azure Application Insights integration for CampusBarter API
// Tracks: requests, exceptions, dependencies, custom events
//
// Requires: npm install applicationinsights
// Connection string read from APPLICATIONINSIGHTS_CONNECTION_STRING
// (auto-set by Azure App Service when Application Insights is enabled)
// ─────────────────────────────────────────────────────────────

import appInsights from 'applicationinsights';

/**
 * Initialize Application Insights.
 * Must be called BEFORE importing express or any other module
 * so it can instrument all dependencies automatically.
 */
export function initMonitoring(): void {
    const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

    if (!connectionString) {
        console.warn('[Monitoring] APPLICATIONINSIGHTS_CONNECTION_STRING not set — monitoring disabled');
        return;
    }

    appInsights
        .setup(connectionString)
        .setAutoDependencyCorrelation(true)   // correlate requests across services
        .setAutoCollectRequests(true)          // log every HTTP request
        .setAutoCollectExceptions(true)        // log every uncaught exception
        .setAutoCollectDependencies(true)      // log SQL queries, HTTP calls
        .setAutoCollectConsole(true, true)     // capture console.log/error
        .setAutoCollectPerformance(true)       // CPU, memory, response time
        .setSendLiveMetrics(true)              // real-time dashboard in Azure
        .start();

    console.log('[Monitoring] Application Insights initialized ✅');
}

/**
 * Track a custom security event (e.g. failed login, suspicious activity).
 * Visible in Application Insights → Custom Events.
 */
export function trackSecurityEvent(
    name: string,
    properties: Record<string, string> = {}
): void {
    const client = appInsights.defaultClient;
    if (!client) return;

    client.trackEvent({
        name: `Security:${name}`,
        properties: {
            ...properties,
            service: 'campusbarter-api',
            timestamp: new Date().toISOString(),
        },
    });
}

/**
 * Track a failed login attempt — feeds into Azure Monitor alerts.
 */
export function trackFailedLogin(email: string, reason: string, ip: string): void {
    trackSecurityEvent('FailedLogin', { email, reason, ip });
}

/**
 * Track a successful login — useful for anomaly detection.
 */
export function trackLogin(userId: string, email: string): void {
    trackSecurityEvent('Login', { userId, email });
}
