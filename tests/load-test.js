// tests/load-test.js — k6 Performance Load Test
// Run with: k6 run tests/load-test.js
//
// Requirements: Install k6 from https://k6.io/docs/get-started/installation/
// Set environment variable: K6_API_TOKEN=<your Azure AD token>

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ── Config ────────────────────────────────────────────────────
const BASE_URL = __ENV.K6_API_URL || 'https://campusbarter-api-f3b4ascaemgthae3.canadacentral-01.azurewebsites.net';
const TOKEN = __ENV.K6_API_TOKEN || '';

const errorRate = new Rate('errors');
const listingDuration = new Trend('listing_duration');
const chatDuration = new Trend('chat_duration');

// ── Test Scenarios ────────────────────────────────────────────
export const options = {
    scenarios: {
        // Ramp up to 100 concurrent users over 2 minutes
        load_test: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 25 },   // Warm up
                { duration: '1m', target: 100 },    // Peak load
                { duration: '30s', target: 0 },     // Cool down
            ],
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<200'],   // 95% of requests < 200ms
        errors: ['rate<0.01'],               // Error rate < 1%
    },
};

const headers = TOKEN
    ? { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };

// ── Test Functions ────────────────────────────────────────────

export default function () {
    // 1. Health check (no auth)
    const healthRes = http.get(`${BASE_URL}/health`);
    check(healthRes, {
        'health: status 200': (r) => r.status === 200,
        'health: has status field': (r) => JSON.parse(r.body).status === 'ok',
    });

    // 2. Get listings
    const listStart = Date.now();
    const listingsRes = http.get(`${BASE_URL}/api/v1/listings`, { headers });
    listingDuration.add(Date.now() - listStart);
    check(listingsRes, {
        'listings: status 200 or 401': (r) => [200, 401].includes(r.status),
    });
    errorRate.add(listingsRes.status >= 500);

    // 3. Get leaderboard
    const leaderRes = http.get(`${BASE_URL}/api/v1/insights/leaderboard`, { headers });
    check(leaderRes, {
        'leaderboard: status 200 or 401': (r) => [200, 401].includes(r.status),
    });
    errorRate.add(leaderRes.status >= 500);

    // 4. Get market insights
    const insightsRes = http.get(`${BASE_URL}/api/v1/insights/market`, { headers });
    check(insightsRes, {
        'insights: status 200 or 401': (r) => [200, 401].includes(r.status),
    });
    errorRate.add(insightsRes.status >= 500);

    // 5. Get chats
    const chatStart = Date.now();
    const chatsRes = http.get(`${BASE_URL}/api/v1/chats`, { headers });
    chatDuration.add(Date.now() - chatStart);
    check(chatsRes, {
        'chats: status 200 or 401': (r) => [200, 401].includes(r.status),
    });
    errorRate.add(chatsRes.status >= 500);

    // 6. Get notifications
    const notifRes = http.get(`${BASE_URL}/api/v1/notifications`, { headers });
    check(notifRes, {
        'notifications: status 200 or 401': (r) => [200, 401].includes(r.status),
    });
    errorRate.add(notifRes.status >= 500);

    // 7. Get credits balance
    const creditsRes = http.get(`${BASE_URL}/api/v1/credits/balance`, { headers });
    check(creditsRes, {
        'credits: status 200 or 401': (r) => [200, 401].includes(r.status),
    });

    // Wait between iterations to simulate real user behavior
    sleep(1);
}
