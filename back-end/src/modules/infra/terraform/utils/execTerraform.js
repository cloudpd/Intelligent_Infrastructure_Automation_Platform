const { spawn } = require('child_process');

/**
 * Runs one terraform subcommand in a given directory, with extra env vars
 * (used to inject the user's decrypted AWS credentials without touching
 * the server's own AWS config/environment).
 */
function run(args, { cwd, env }) {
  return new Promise((resolve, reject) => {
    const child = spawn('terraform', args, {
      cwd,
      env: { ...process.env, ...env },
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr || `terraform ${args[0]} exited with code ${code}`));
    });

    child.on('error', reject); // e.g. terraform binary not found on PATH
  });
}

module.exports = { run };