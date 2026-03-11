// Quick API test with mock token
const fetch = require('node-fetch');

const API_BASE = 'https://campusbarter-api-f3b4ascaemgthae3.canadacentral-01.azurewebsites.net';
const mockToken = 'mock-test-user-123';

async function testCreateListing() {
    console.log('Testing createListing with mock token...\n');
    
    try {
        const res = await fetch(`${API_BASE}/api/v1/listings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${mockToken}`,
            },
            body: JSON.stringify({
                type: 'OFFER',
                title: 'Test Listing',
                description: 'This is a test listing from the API test script',
                credits: 1,
            }),
        });
        
        console.log('Status:', res.status, res.statusText);
        console.log('Headers:', res.headers.raw());
        
        const body = await res.text();
        console.log('\nResponse body:', body);
        
        if (res.ok) {
            console.log('\n✅ SUCCESS! Listing created.');
        } else {
            console.log('\n❌ FAILED! Check error above.');
        }
    } catch (err) {
        console.error('❌ Network error:', err.message);
    }
}

testCreateListing();
