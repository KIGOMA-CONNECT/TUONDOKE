const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = 3199;
const BASE = `http://localhost:${PORT}`;
let server;
let passed = 0;
let failed = 0;

function req(method, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json', ...headers }
    };
    const r = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

function assert(condition, msg) {
  if (condition) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.error(`  ✗ ${msg}`); }
}

async function runTests() {
  console.log('\n=== TUONDOKE Smoke Tests ===\n');

  // Health
  let r = await req('GET', '/api/health');
  assert(r.status === 200, 'Health check returns 200');
  assert(r.body.status === 'ok', 'Health status is ok');

  // Register
  r = await req('POST', '/api/auth/register', { phone: '0799990001', password: 'test1234', name: 'Test User' });
  assert(r.status === 200, 'Register returns 200');
  const userId = r.body.id;

  // Login
  r = await req('POST', '/api/auth/login', { phone: '0799990001', password: 'test1234' });
  assert(r.status === 200, 'Login returns 200');
  assert(r.body.token, 'Login returns token');
  const token = r.body.token;

  const authH = { Authorization: `Bearer ${token}` };

  // Me
  r = await req('GET', '/api/auth/me', null, authH);
  assert(r.status === 200, 'GET /auth/me returns 200');
  assert(r.body.phone === '0799990001', 'Me returns correct phone');

  // Wallet
  r = await req('GET', '/api/wallet/balance', null, authH);
  assert(r.status === 200, 'GET /wallet/balance returns 200');
  assert(typeof r.body.balance === 'number', 'Balance is a number');

  // Deposit
  r = await req('POST', '/api/wallet/deposit', { amount: 1000, method: 'test' }, authH);
  assert(r.status === 200, 'Deposit returns 200');
  assert(r.body.balance === 1000, 'Balance after deposit is 1000');

  // Transactions
  r = await req('GET', '/api/wallet/transactions', null, authH);
  assert(r.status === 200, 'GET /wallet/transactions returns 200');
  assert(r.body.transactions.length > 0, 'Has transactions');

  // Book ride
  r = await req('POST', '/api/rides/book', { origin: 'Test Origin', destination: 'Test Destination', vehicle_type: 'boda' }, authH);
  assert(r.status === 200, 'Book ride returns 200');
  const tripId = r.body.id;

  // Estimate
  r = await req('POST', '/api/rides/estimate', { origin: 'A', destination: 'B', vehicle_type: 'boda' }, authH);
  assert(r.status === 200, 'Ride estimate returns 200');
  assert(r.body.estimated_fare > 0, 'Estimated fare > 0');

  // My trips
  r = await req('GET', '/api/rides/mine', null, authH);
  assert(r.status === 200, 'GET /rides/mine returns 200');

  // Ride detail
  r = await req('GET', `/api/rides/${tripId}`, null, authH);
  assert(r.status === 200, 'GET ride detail returns 200');

  // Notifications
  r = await req('GET', '/api/notifications', null, authH);
  assert(r.status === 200, 'GET /notifications returns 200');

  // Saved places
  r = await req('POST', '/api/saved-places', { place_name: 'Home', address: '123 Street', lat: -6.79, lng: 39.28 }, authH);
  assert(r.status === 200, 'Create saved place returns 200');

  r = await req('GET', '/api/saved-places', null, authH);
  assert(r.status === 200, 'GET /saved-places returns 200');
  assert(r.body.length > 0, 'Has saved places');

  // Favorites
  r = await req('POST', '/api/favorites', { from_zone: 'downtown', to_zone: 'airport', label: 'Work' }, authH);
  assert(r.status === 200, 'Create favorite route returns 200');

  // Safety contacts
  r = await req('POST', '/api/safety/contacts', { name: 'Emergency', phone: '0710000000', relationship: 'Friend' }, authH);
  assert(r.status === 200, 'Add emergency contact returns 200');

  r = await req('GET', '/api/safety/contacts', null, authH);
  assert(r.status === 200, 'GET /safety/contacts returns 200');

  // Cargo
  r = await req('POST', '/api/cargo', { origin: 'Dar', destination: 'Dodoma', vehicle_type: 'pickup', weight_kg: 50 }, authH);
  assert(r.status === 200, 'Post cargo returns 200');

  r = await req('GET', '/api/cargo/mine', null, authH);
  assert(r.status === 200, 'GET /cargo/mine returns 200');

  // Loyalty
  r = await req('GET', '/api/loyalty', null, authH);
  assert(r.status === 200, 'GET /loyalty returns 200');

  // Referrals
  r = await req('GET', '/api/referrals', null, authH);
  assert(r.status === 200, 'GET /referrals returns 200');
  assert(r.body.referral_code, 'Has referral code');

  // Leaderboard
  r = await req('GET', '/api/leaderboard', null, authH);
  assert(r.status === 200, 'GET /leaderboard returns 200');

  // Missions
  r = await req('GET', '/api/missions', null, authH);
  assert(r.status === 200, 'GET /missions returns 200');

  // Announcements
  r = await req('GET', '/api/announcements', null, authH);
  assert(r.status === 200, 'GET /announcements returns 200');

  // Insurance plans
  r = await req('GET', '/api/insurance/plans', null, authH);
  assert(r.status === 200, 'GET /insurance/plans returns 200');

  // Membership plans
  r = await req('GET', '/api/membership/plans', null, authH);
  assert(r.status === 200, 'GET /membership/plans returns 200');

  // Surge multipliers
  r = await req('GET', '/api/surge/multipliers', null, authH);
  assert(r.status === 200, 'GET /surge/multipliers returns 200');

  // Finance
  r = await req('GET', '/api/finance/fd-rates', null, authH);
  assert(r.status === 200, 'GET /finance/fd-rates returns 200');

  // QR pay
  r = await req('GET', '/api/qrpay/my-code', null, authH);
  assert(r.status === 200, 'GET /qrpay/my-code returns 200');

  // Odometer
  r = await req('POST', '/api/odometer/log', { start_reading: 1000, start_date: '2026-08-26' }, authH);
  assert(r.status === 200, 'Add odometer log returns 200');

  // AI
  r = await req('POST', '/api/ai/chat', { message: 'help' }, authH);
  assert(r.status === 200, 'AI chat returns 200');

  // USSD
  r = await req('POST', '/api/ussd', { phone: '0799990001', session: 'test1', input: '' });
  assert(r.status === 200, 'USSD handler returns 200');
  assert(typeof r.body === 'string' || typeof r.body === 'object', 'USSD returns text');

  // SEO
  r = await req('GET', '/api/sitemap.xml');
  assert(r.status === 200, 'GET /sitemap.xml returns 200');

  r = await req('GET', '/api/robots.txt');
  assert(r.status === 200, 'GET /robots.txt returns 200');

  // KYC
  r = await req('POST', '/api/kyc', { document_type: 'national_id' }, authH);
  assert(r.status === 200, 'Submit KYC returns 200');

  // Admin login
  r = await req('POST', '/api/auth/login', { phone: '0710000000', password: '1234' });
  assert(r.status === 200, 'Admin login returns 200');
  const adminToken = r.body.token;
  const adminH = { Authorization: `Bearer ${adminToken}` };

  // Admin dashboard
  r = await req('GET', '/api/admin/dashboard', null, adminH);
  assert(r.status === 200, 'Admin dashboard returns 200');
  assert(r.body.total_users > 0, 'Has users');

  // Admin users
  r = await req('GET', '/api/admin/users', null, adminH);
  assert(r.status === 200, 'Admin users returns 200');

  // Admin analytics
  r = await req('GET', '/api/admin/analytics', null, adminH);
  assert(r.status === 200, 'Admin analytics returns 200');

  // Admin feature flags
  r = await req('GET', '/api/admin/feature-flags', null, adminH);
  assert(r.status === 200, 'Admin feature flags returns 200');

  // Admin system stats
  r = await req('GET', '/api/admin/system-stats', null, adminH);
  assert(r.status === 200, 'Admin system stats returns 200');

  // Admin promos
  r = await req('GET', '/api/admin/promos', null, adminH);
  assert(r.status === 200, 'Admin promos returns 200');

  // Admin metrics
  r = await req('GET', '/api/admin/metrics', null, adminH);
  assert(r.status === 200, 'Admin metrics returns 200');

  // Admin announcements
  r = await req('GET', '/api/admin/announcements', null, adminH);
  assert(r.status === 200, 'Admin announcements returns 200');

  // Admin audit
  r = await req('GET', '/api/admin/audit', null, adminH);
  assert(r.status === 200, 'Admin audit returns 200');

  // Admin drivers online
  r = await req('GET', '/api/admin/drivers-online', null, adminH);
  assert(r.status === 200, 'Admin drivers online returns 200');

  // Admin kyc queue
  r = await req('GET', '/api/admin/kyc-queue', null, adminH);
  assert(r.status === 200, 'Admin KYC queue returns 200');

  // Admin support tickets
  r = await req('GET', '/api/admin/support/tickets', null, adminH);
  assert(r.status === 200, 'Admin support tickets returns 200');

  // Admin SOS
  r = await req('GET', '/api/admin/safety/sos', null, adminH);
  assert(r.status === 200, 'Admin SOS returns 200');

  // Admin orgs
  r = await req('GET', '/api/admin/orgs', null, adminH);
  assert(r.status === 200, 'Admin orgs returns 200');

  // Admin fleets
  r = await req('GET', '/api/admin/fleets', null, adminH);
  assert(r.status === 200, 'Admin fleets returns 200');

  // Admin applications
  r = await req('GET', '/api/admin/applications', null, adminH);
  assert(r.status === 200, 'Admin applications returns 200');

  // Admin USSD config
  r = await req('GET', '/api/admin/ussd-sms-config', null, adminH);
  assert(r.status === 200, 'Admin USSD config returns 200');

  // Support ticket
  r = await req('POST', '/api/support/tickets', { subject: 'Test Issue', message: 'Test message', priority: 'high' }, authH);
  assert(r.status === 200, 'Create support ticket returns 200');

  // Driver login
  r = await req('POST', '/api/auth/login', { phone: '0712000001', password: '1234' });
  assert(r.status === 200, 'Driver login returns 200');
  const driverToken = r.body.token;
  const driverH = { Authorization: `Bearer ${driverToken}` };

  // Driver stats
  r = await req('GET', '/api/driver/stats', null, driverH);
  assert(r.status === 200, 'Driver stats returns 200');

  // Driver vehicles
  r = await req('GET', '/api/driver/vehicles', null, driverH);
  assert(r.status === 200, 'Driver vehicles returns 200');

  // Driver schedule
  r = await req('GET', '/api/driver/schedule', null, driverH);
  assert(r.status === 200, 'Driver schedule returns 200');

  // Driver earnings
  r = await req('GET', '/api/driver/earnings', null, driverH);
  assert(r.status === 200, 'Driver earnings returns 200');

  // Driver expenses
  r = await req('GET', '/api/driver/expenses', null, driverH);
  assert(r.status === 200, 'Driver expenses returns 200');

  // Driver advances
  r = await req('GET', '/api/driver/advances', null, driverH);
  assert(r.status === 200, 'Driver advances returns 200');

  // Driver performance
  r = await req('GET', '/api/driver/perf', null, driverH);
  assert(r.status === 200, 'Driver performance returns 200');

  // Driver online sessions
  r = await req('GET', '/api/driver/sessions', null, driverH);
  assert(r.status === 200, 'Driver sessions returns 200');

  // Driver earnings goal
  r = await req('GET', '/api/driver/earnings-goal', null, driverH);
  assert(r.status === 200, 'Driver earnings goal returns 200');

  // Open rides
  r = await req('GET', '/api/rides/open', null, driverH);
  assert(r.status === 200, 'GET /rides/open returns 200');

  // Reviews received
  r = await req('GET', '/api/reviews/received', null, driverH);
  assert(r.status === 200, 'GET /reviews/received returns 200');

  // Data export
  r = await req('GET', '/api/data/export', null, authH);
  assert(r.status === 200, 'Data export returns 200');

  // Change password
  r = await req('POST', '/api/auth/change-password', { oldPassword: 'test1234', newPassword: 'newpass123' }, authH);
  assert(r.status === 200, 'Change password returns 200');

  // Refresh token
  r = await req('POST', '/api/auth/refresh', { refreshToken: r.body.refreshToken || 'invalid' });
  assert(r.status === 200 || r.status === 401, 'Refresh token returns 200 or 401');

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

async function start() {
  // Delete existing DB for clean seed
  const dbPath = path.join(__dirname, '..', 'data', 'tuondoke.db');
  try { fs.unlinkSync(dbPath); } catch {}

  server = spawn(process.execPath, ['--import', 'tsx', path.join(__dirname, '..', 'index.ts')], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: PORT.toString(), NODE_ENV: 'test' },
    stdio: 'pipe'
  });

  server.stdout.pipe(process.stdout);
  server.stderr.pipe(process.stderr);

  // Wait for server to start
  let retries = 30;
  while (retries > 0) {
    try {
      await req('GET', '/api/health');
      break;
    } catch {
      retries--;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  if (retries === 0) {
    console.error('Server failed to start');
    process.exit(1);
  }

  await runTests();
}

start().catch(err => {
  console.error(err);
  process.exit(1);
});
