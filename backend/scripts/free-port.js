import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function freePort(port = 5000) {
  try {
    console.log(`🔍 Checking for processes using port ${port}...`);
    
    // Windows command to find process using the port
    const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
    
    if (!stdout.trim()) {
      console.log(`✅ Port ${port} is free!`);
      return;
    }

    // Extract PID from netstat output
    const lines = stdout.trim().split('\n');
    const pids = new Set();
    
    lines.forEach(line => {
      const match = line.match(/LISTENING\s+(\d+)/);
      if (match) {
        pids.add(match[1]);
      }
    });

    if (pids.size === 0) {
      console.log(`✅ Port ${port} is free!`);
      return;
    }

    console.log(`⚠️  Found ${pids.size} process(es) using port ${port}:`);
    pids.forEach(pid => console.log(`   PID: ${pid}`));

    // Kill each process
    for (const pid of pids) {
      try {
        await execAsync(`taskkill /F /PID ${pid}`);
        console.log(`✅ Terminated process ${pid}`);
      } catch (error) {
        console.error(`❌ Failed to terminate process ${pid}:`, error.message);
      }
    }

    console.log(`✅ Port ${port} is now free!`);
  } catch (error) {
    if (error.message.includes('findstr')) {
      console.log(`✅ Port ${port} is free!`);
    } else {
      console.error(`❌ Error:`, error.message);
      process.exit(1);
    }
  }
}

const port = process.argv[2] ? parseInt(process.argv[2]) : 5000;

freePort(port).then(() => {
  // If a command is provided as argument, execute it after freeing the port
  const remainingArgs = process.argv.slice(3);
  if (remainingArgs.length > 0) {
    const command = remainingArgs.join(' ');
    console.log(`\n🚀 Executing: ${command}\n`);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error executing command: ${error.message}`);
        process.exit(1);
      }
      if (stdout) process.stdout.write(stdout);
      if (stderr) process.stderr.write(stderr);
    });
  }
}).catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

