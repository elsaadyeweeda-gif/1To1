const { spawn } = require('child_process');

console.log('[Dev Server Runner] Starting backend and frontend...');

// 1. Start the Express backend on port 4000
const backend = spawn('npx', ['tsx', '--watch', 'src/server.ts'], {
  stdio: 'pipe',
  env: { ...process.env, PORT: '4000' }
});

backend.stdout.on('data', (data) => {
  process.stdout.write(`[Backend] ${data}`);
});

backend.stderr.on('data', (data) => {
  process.stderr.write(`[Backend Error] ${data}`);
});

// 2. Start the Angular frontend on port 3000
const frontendArgs = ['serve', '--port=3000', '--host=0.0.0.0', '--allowed-hosts=true'];
if (process.env.DISABLE_HMR) {
  frontendArgs.push('--live-reload=false');
}

const frontend = spawn('npx', ['ng', ...frontendArgs], {
  stdio: 'pipe',
  env: process.env
});

frontend.stdout.on('data', (data) => {
  process.stdout.write(`[Frontend] ${data}`);
});

frontend.stderr.on('data', (data) => {
  process.stderr.write(`[Frontend Error] ${data}`);
});

// Handle termination of both processes
function terminate(code) {
  console.log(`[Dev Server Runner] Terminating children (exit code ${code})...`);
  try {
    backend.kill('SIGTERM');
  } catch (e) {}
  try {
    frontend.kill('SIGTERM');
  } catch (e) {}
  process.exit(code);
}

backend.on('close', (code) => {
  console.log(`[Dev Server Runner] Backend exited with code ${code}`);
  terminate(code || 0);
});

frontend.on('close', (code) => {
  console.log(`[Dev Server Runner] Frontend exited with code ${code}`);
  terminate(code || 0);
});

process.on('SIGINT', () => terminate(0));
process.on('SIGTERM', () => terminate(0));
