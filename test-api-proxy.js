// Debug: test what ALLOW_DEV_AUTH path is actually being taken
const https = require('https');
const BASE = 'campusbarter-api-f3b4ascaemgthae3.canadacentral-01.azurewebsites.net';

function req(method, path, body, headers) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const opts = {
            hostname: BASE, port: 443, path, method,
            headers: {
                'Content-Type': 'application/json', ...headers,
                ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
            },
            timeout: 20000,
        };
        const r = https.request(opts, res => {
            let s = '';
            res.on('data', c => s += c);
            res.on('end', () => resolve({ status: res.statusCode, raw: s }));
        });
        r.on('timeout', () => { r.destroy(); reject(new Error('TIMEOUT')); });
        r.on('error', reject);
        if (data) r.write(data);
        r.end();
    });
}

async function run() {
    console.log('\n=== Auth Bypass Debug ===\n');

    // Test 1: x-dev-user-id only (no Authorization header)
    try {
        const r = await req('GET', '/api/v1/users/me', null, {
            'x-dev-user-id': 'debug-user-001',
            'x-dev-email': 'debug@edu.sait.ca',
            'x-dev-name': 'Debug User',
        });
        console.log(`1. x-dev-user-id only (no auth): HTTP ${r.status} — ${r.raw}`);
    } catch (e) { console.log(`1. ERROR: ${e.message}`); }

    // Test 2: Bearer mock-X
    try {
        const r = await req('GET', '/api/v1/users/me', null, {
            'Authorization': 'Bearer mock-someuser',
        });
        console.log(`2. Bearer mock-X only: HTTP ${r.status} — ${r.raw}`);
    } catch (e) { console.log(`2. ERROR: ${e.message}`); }

    // Test 3: Both headers
    try {
        const r = await req('GET', '/api/v1/users/me', null, {
            'Authorization': 'Bearer mock-debug-001',
            'x-dev-user-id': 'debug-user-001',
            'x-dev-email': 'debug@edu.sait.ca',
            'x-dev-name': 'Debug User',
        });
        console.log(`3. Both headers: HTTP ${r.status} — ${r.raw}`);
    } catch (e) { console.log(`3. ERROR: ${e.message}`); }

    // Test 4: No auth at all
    try {
        const r = await req('GET', '/api/v1/users/me', null, {});
        console.log(`4. No auth at all: HTTP ${r.status} — ${r.raw}`);
    } catch (e) { console.log(`4. ERROR: ${e.message}`); }

    // Test 5: POST listing with user that should now exist
    try {
        const r = await req('POST', '/api/v1/listings', {
            type: 'OFFER', title: 'Debug Listing Test',
            description: 'Testing if posting works now after user upsert in auth middleware.',
            credits: 1,
        }, {
            'Authorization': 'Bearer mock-debug-001',
            'x-dev-user-id': 'debug-user-001',
            'x-dev-email': 'debug@edu.sait.ca',
            'x-dev-name': 'Debug User',
        });
        console.log(`5. POST /listings: HTTP ${r.status} — ${r.raw}`);
    } catch (e) { console.log(`5. POST ERROR: ${e.message}`); }
}

run().catch(console.error);
