const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3999,
    path: '/api/v1/listings',
    method: 'GET',
    headers: {
        'Authorization': 'Bearer mock-test-user-123'
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('BODY:', data);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
