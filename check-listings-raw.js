const https = require('https');

const BASE = 'campusbarter-api-f3b4ascaemgthae3.canadacentral-01.azurewebsites.net';
const HDRS = {
    'Authorization': 'Bearer mock-test-001',
    'x-dev-user-id': 'test-dev-001',
    'x-dev-email': 'test@edu.sait.ca',
    'x-dev-name': 'Test Dev User',
    'Content-Type': 'application/json',
};

function req(path) {
    return new Promise((resolve, reject) => {
        const opts = {
            hostname: BASE, port: 443, path, method: 'GET',
            headers: HDRS, timeout: 15000,
        };
        const r = https.request(opts, res => {
            let s = '';
            res.on('data', c => s += c);
            res.on('end', () => {
                console.log(`Status: ${res.statusCode}`);
                console.log('Raw Response:', s);
                try { resolve(JSON.parse(s)); }
                catch { reject(new Error('Failed to parse JSON')); }
            });
        });
        r.on('error', reject);
        r.end();
    });
}

async function run() {
    console.log('Fetching raw listings from /api/v1/listings...\n');
    try {
        const data = await req('/api/v1/listings');
        console.log('\nParsed data count:', data.length);
        if (data.length > 0) {
            console.log('First listing keys:', Object.keys(data[0]));
            console.log('First listing status:', data[0].status);
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

run();
