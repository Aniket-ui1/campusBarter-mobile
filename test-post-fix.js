// test-post-fix.js
// Verification script for the posting fix
const fetch = require('node-fetch');

const API_BASE = 'https://campusbarter-api-f3b4ascaemgthae3.canadacentral-01.azurewebsites.net';
const mockUserId = 'verify-fix-user-' + Math.floor(Math.random() * 10000);
const mockToken = `dev-${mockUserId}`; // Use dev- prefix for backend dev bypass

async function verifyFix() {
    console.log(`🚀 Starting verification with User ID: ${mockUserId}\n`);

    try {
        // Step 1: Sync User (PUT /me)
        console.log('Step 1: Syncing user (PUT /api/v1/users/me)...');
        const syncRes = await fetch(`${API_BASE}/api/v1/users/me`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${mockToken}`,
            },
            body: JSON.stringify({
                email: `${mockUserId}@edu.sait.ca`,
                displayName: 'Verification User',
                bio: 'Testing the posting fix',
                profileComplete: true
            }),
        });

        console.log('Sync Status:', syncRes.status, syncRes.statusText);
        const syncBody = await syncRes.json();
        console.log('Sync Response:', JSON.stringify(syncBody, null, 2));

        if (!syncRes.ok) {
            console.error('❌ User sync failed. Halting.');
            return;
        }
        console.log('✅ User sync successful!\n');

        // Step 2: Post Listing (POST /listings)
        console.log('Step 2: Creating a listing (POST /api/v1/listings)...');
        const postRes = await fetch(`${API_BASE}/api/v1/listings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${mockToken}`,
            },
            body: JSON.stringify({
                type: 'OFFER',
                title: 'Verification Listing',
                description: 'This is a test listing to verify the database fix.',
                credits: 5,
                category: 'tutor'
            }),
        });

        console.log('Post Status:', postRes.status, postRes.statusText);
        const postBody = await postRes.json();
        console.log('Post Response:', JSON.stringify(postBody, null, 2));

        if (postRes.ok) {
            console.log('\n✨ SUCCESS! The root cause has been resolved.');
        } else {
            console.log('\n❌ FAILED! The listing could not be created.');
        }

    } catch (err) {
        console.error('❌ Verification Error:', err.message);
    }
}

verifyFix();
