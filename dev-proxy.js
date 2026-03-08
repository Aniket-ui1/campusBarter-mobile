// dev-proxy.js
// ─────────────────────────────────────────────────────────────────
// Simple CORS proxy for local web development.
// Forwards /api/* requests to the Azure backend, adding CORS headers.
//
// Usage:  node dev-proxy.js
// Then set:  EXPO_PUBLIC_API_URL=http://localhost:3999
// ─────────────────────────────────────────────────────────────────

const http = require('http');
const https = require('https');
const { URL } = require('url');

const AZURE_API = 'https://campusbarter-api-f3b4ascaemgthae3.canadacentral-01.azurewebsites.net';
const PORT = 3999;

const server = http.createServer((req, res) => {
    // CORS headers — allow everything for development
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Forward the request to Azure
    const target = new URL(req.url, AZURE_API);

    const proxyReq = https.request(target, {
        method: req.method,
        headers: {
            ...req.headers,
            host: target.host, // Override host header
        },
    }, (proxyRes) => {
        // Copy status + headers, then add CORS
        const headers = { ...proxyRes.headers };
        headers['access-control-allow-origin'] = '*';
        delete headers['transfer-encoding']; // Avoid chunked encoding issues

        res.writeHead(proxyRes.statusCode, headers);
        proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
        console.error('[Proxy] Error:', err.message);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
    });

    // Pipe request body (for POST/PUT/PATCH)
    req.pipe(proxyReq, { end: true });
});

server.listen(PORT, () => {
    console.log(`\n🔀 CORS Proxy running on http://localhost:${PORT}`);
    console.log(`   Forwarding to: ${AZURE_API}`);
    console.log(`\n   Set your env: EXPO_PUBLIC_API_URL=http://localhost:${PORT}\n`);
});
