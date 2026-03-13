// Quick API smoke test — run with: node test-api.js
const https = require('https');

const BASE = 'campusbarter-api-f3b4ascaemgthae3.canadacentral-01.azurewebsites.net';
const HDRS = {
    'Authorization': 'Bearer mock-test-001',
    'x-dev-user-id': 'test-dev-001',
    'x-dev-email': 'test@edu.sait.ca',
    'x-dev-name': 'Test Dev User',
    'Content-Type': 'application/json',
};

function req(method, path, body) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const opts = {
            hostname: BASE, port: 443, path, method,
            headers: { ...HDRS, ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) },
            timeout: 15000,
        };
        const r = https.request(opts, res => {
            let s = '';
            res.on('data', c => s += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(s) }); }
                catch { resolve({ status: res.statusCode, body: s }); }
            });
        });
        r.on('timeout', () => { r.destroy(); reject(new Error('TIMEOUT')); });
        r.on('error', reject);
        if (data) r.write(data);
        r.end();
    });
}

async function run() {
    console.log('\n=== CampusBarter API Smoke Test ===\n');

    // 1. Health
    try {
        const r = await req('GET', '/health', null);
        console.log(`✅ GET /health       → ${r.status} — ${JSON.stringify(r.body)}`);
    } catch (e) { console.log(`❌ GET /health       → ${e.message}`); }

    // 2. GET listings
    try {
        const r = await req('GET', '/api/v1/listings', null);
        console.log(`✅ GET /listings     → ${r.status} — ${r.body.length ?? 0} listings`);
    } catch (e) { console.log(`❌ GET /listings     → ${e.message}`); }

    // 3. POST listing
    try {
        const r = await req('POST', '/api/v1/listings', {
            type: 'OFFER', title: 'Test Listing via API',
            description: 'This is a test listing created by the smoke test to verify posting works correctly.',
            credits: 1,
        });
        console.log(`✅ POST /listings    → ${r.status} — id: ${r.body?.id}`);
    } catch (e) { console.log(`❌ POST /listings    → ${e.message}`); }

    // 4. PATCH profile
    try {
        const r = await req('PATCH', '/api/v1/users/me', {
            program: 'ITS', major: 'Full-Stack', semester: 2, profileComplete: true,
        });
        console.log(`✅ PATCH /users/me   → ${r.status} — ${JSON.stringify(r.body)}`);
    } catch (e) { console.log(`❌ PATCH /users/me   → ${e.message}`); }

    // 5. GET leaderboard
    try {
        const r = await req('GET', '/api/v1/insights/leaderboard', null);
        console.log(`✅ GET /leaderboard  → ${r.status} — ${r.body.length ?? 0} entries`);
    } catch (e) { console.log(`❌ GET /leaderboard  → ${e.message}`); }

    console.log('\n=== Done ===\n');
}

run().catch(console.error);
