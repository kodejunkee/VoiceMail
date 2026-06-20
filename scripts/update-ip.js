/**
 * Auto-IP Updater
 *
 * Detects the computer's current local IP address and
 * updates app.json so the phone app can find the backend.
 *
 * Run: node scripts/update-ip.js
 */

const os = require('os');
const fs = require('fs');
const path = require('path');

// Find the local IPv4 address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const alias of iface || []) {
      if (alias.family === 'IPv4' && !alias.internal) {
        return alias.address;
      }
    }
  }
  return 'localhost';
}

// Update app.json with the detected IP
function updateAppJson(ip) {
  const appJsonPath = path.join(__dirname, '..', 'app', 'app.json');
  const raw = fs.readFileSync(appJsonPath, 'utf-8');
  const config = JSON.parse(raw);

  const port = 3001;
  const newUrl = `http://${ip}:${port}`;
  const oldUrl = config.expo?.extra?.API_URL || '(not set)';

  if (config.expo && config.expo.extra) {
    config.expo.extra.API_URL = newUrl;
  }

  fs.writeFileSync(appJsonPath, JSON.stringify(config, null, 2) + '\n');

  console.log('');
  console.log('  ===================================');
  console.log('    VoiceMail Assist - IP Updater');
  console.log('  ===================================');
  console.log('');
  console.log(`  Detected IP:  ${ip}`);
  console.log(`  Old API URL:  ${oldUrl}`);
  console.log(`  New API URL:  ${newUrl}`);
  console.log('');
  console.log('  app.json updated successfully!');
  console.log('');
}

const ip = getLocalIP();
updateAppJson(ip);
