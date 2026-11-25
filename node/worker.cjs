const readline = require('node:readline');
const { spawn } = require('node:child_process');

function reply(message) {
  process.stdout.write(JSON.stringify(message) + '\n');
}

function probeCommand(command, versionArgs) {
  return new Promise((resolve) => {
    let output = '';
    let child;
    let settled = false;
    const unavailable = (reason, message) => resolve({ id: 'pig', available: false, reason, message });
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => {
      if (child && !child.killed) child.kill('SIGTERM');
      unavailable('probe-timeout', '检测 pig 超时');
    }, 10000);
    timer.unref();
    try {
      child = spawn(command, versionArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
      unavailable('not-installed', '无法启动 pig：' + String(error && error.message || error));
      return;
    }
    child.stdout.on('data', (chunk) => { output += chunk.toString('utf8'); });
    child.stderr.on('data', (chunk) => { output += chunk.toString('utf8'); });
    child.on('error', (error) => unavailable('not-installed', '无法启动 pig：' + String(error.message || error)));
    child.on('close', (code) => {
      if (code !== 0) {
        unavailable('probe-failed', 'pig 检测失败：' + output.trim().slice(0, 180));
        return;
      }
      const match = output.match(/\bv?(\d+\.\d+\.\d+(?:[-+][^\s]+)?)/);
      finish({ id: 'pig', available: true, version: match ? match[1] : output.trim().slice(0, 64) });
    });
  });
}

readline.createInterface({ input: process.stdin }).on('line', async (line) => {
  let request;
  try { request = JSON.parse(line); } catch { reply({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid JSON-RPC line' }, result: null }); return; }
  if (!request || typeof request !== 'object' || !Object.prototype.hasOwnProperty.call(request, 'id')) { reply({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Request' }, result: null }); return; }
  try {
    let result;
    if (request.method === 'harness/probe') result = await probeCommand('pig', ['--version']);
    else { reply({ jsonrpc: '2.0', id: request.id, error: { code: -32601, message: 'Method not found' }, result: null }); return; }
    reply({ jsonrpc: '2.0', id: request.id, result });
  } catch (error) { reply({ jsonrpc: '2.0', id: request.id, error: { code: -32603, message: String(error && error.message || error) }, result: null }); }
});

