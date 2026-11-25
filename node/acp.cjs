const { spawn } = require('node:child_process');

function fail(message) {
  console.error(message);
  process.exit(1);
}

const agent = spawn('pig-acp', [], { stdio: ['pipe', 'pipe', 'inherit'] });

agent.on('error', (error) => fail('无法启动 pig-acp：' + String(error && error.message || error)));
agent.on('exit', (code, signal) => {
  if (signal) console.error('pig-acp 被信号终止：' + signal);
  process.exit(typeof code === 'number' ? code : 1);
});

process.stdin.pipe(agent.stdin);
agent.stdout.pipe(process.stdout);

