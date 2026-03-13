import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test('api starts and serves health endpoint', async () => {
  const port = 39091;
  const child = spawn(process.execPath, ['dist/server.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'test',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const logs = [];
  child.stdout.on('data', (chunk) => logs.push(String(chunk)));
  child.stderr.on('data', (chunk) => logs.push(String(chunk)));

  try {
    let response;
    for (let i = 0; i < 25; i += 1) {
      try {
        response = await fetch(`http://127.0.0.1:${port}/health`);
        if (response.ok) break;
      } catch {
        // server not ready yet
      }
      await wait(250);
    }

    assert.ok(response, `No response from server. Logs:\n${logs.join('')}`);
    assert.equal(response.status, 200);

    const json = await response.json();
    assert.equal(json.status, 'ok');
    assert.equal(typeof json.allowDevAuth, 'undefined');
  } finally {
    child.kill('SIGTERM');
    await wait(250);
    if (!child.killed) {
      child.kill('SIGKILL');
    }
  }
});
