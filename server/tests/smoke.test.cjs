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

  // === Recurring rides (/api/rides/recurring) ===
  r = await req('POST', '/api/rides/recurring', {
    origin: 'Masaki', destination: 'Kariakoo', vehicle_type: 'boda', time: '07:30', days: [1, 3, 5], interval: 'weekly',
  }, authH);
  assert(r.status === 201, 'POST /rides/recurring returns 201');
  const ruleId = r.body.id;
  assert(Array.isArray(r.body.days) && r.body.days.length === 3, 'Recurring rule stores parsed days');
  assert(r.body.active === true, 'Recurring rule created active');

  r = await req('GET', '/api/rides/recurring', null, authH);
  assert(r.status === 200, 'GET /rides/recurring returns 200');
  assert(r.body.length === 1, 'Recurring list has one rule');

  r = await req('POST', '/api/rides/recurring', {
    origin: 'A', destination: 'B', time: '99:99', days: [1],
  }, authH);
  assert(r.status === 400, 'Recurring rule rejects invalid time');

  r = await req('POST', '/api/rides/recurring', { origin: 'A', destination: 'B', time: '07:30', days: [] }, authH);
  assert(r.status === 400, 'Recurring rule rejects empty days');

  r = await req('PUT', `/api/rides/recurring/${ruleId}`, { destination: 'Kisumu' }, authH);
  assert(r.status === 200 && r.body.destination === 'Kisumu', 'PUT /rides/recurring/:id updates destination');

  r = await req('POST', `/api/rides/recurring/${ruleId}/toggle`, {}, authH);
  assert(r.status === 200 && r.body.active === false, 'Toggle deactivates recurring rule');

  r = await req('POST', `/api/rides/recurring/${ruleId}/toggle`, {}, authH);
  assert(r.status === 200 && r.body.active === true, 'Toggle reactivates recurring rule');

  r = await req('GET', '/api/rides/recurring', null, { Authorization: `Bearer ${driverToken}` });
  assert(r.status === 200 && r.body.length === 0, 'Recurring rules are scoped per user');

  r = await req('DELETE', `/api/rides/recurring/${ruleId}`, null, authH);
  assert(r.status === 200, 'DELETE /rides/recurring/:id returns 200');

  r = await req('GET', '/api/rides/recurring', null, authH);
  assert(r.body.length === 0, 'Recurring list empty after delete');

  // === Budget (/api/budget) ===
  r = await req('GET', '/api/budget', null, authH);
  assert(r.status === 200 && r.body.monthly_limit === 0, 'GET /budget defaults to zero limit');

  r = await req('POST', '/api/budget', { monthly_limit: 50000 }, authH);
  assert(r.status === 200 && r.body.monthly_limit === 50000, 'POST /budget saves monthly limit');

  r = await req('POST', '/api/budget', { monthly_limit: -5 }, authH);
  assert(r.status === 400, 'POST /budget rejects negative limit');

  r = await req('GET', '/api/budget', null, authH);
  assert(r.body.monthly_limit === 50000, 'GET /budget returns saved limit');

  r = await req('DELETE', '/api/budget', null, authH);
  assert(r.status === 200, 'DELETE /budget resets budget');

  r = await req('GET', '/api/budget', null, authH);
  assert(r.body.monthly_limit === 0, 'Budget reset clears the limit');

  // === Standing orders (/api/wallet/standing-orders) ===
  r = await req('POST', '/api/wallet/standing-orders', {
    recipient_phone: '0712345678', amount: 5000, frequency: 'monthly', start_date: '2026-01-01',
  }, authH);
  assert(r.status === 201, 'POST /wallet/standing-orders returns 201');
  const orderId = r.body.id;
  assert(r.body.status === 'active', 'Standing order starts active');

  r = await req('POST', '/api/wallet/standing-orders', {
    recipient_phone: '0712345678', amount: 5000, frequency: 'yearly', start_date: '2026-01-01',
  }, authH);
  assert(r.status === 400, 'Standing order rejects invalid frequency');

  r = await req('GET', '/api/wallet/standing-orders', null, authH);
  assert(r.status === 200 && r.body.length === 1, 'GET /wallet/standing-orders lists orders');

  r = await req('PUT', `/api/wallet/standing-orders/${orderId}`, { amount: 7500 }, authH);
  assert(r.status === 200 && r.body.amount === 7500, 'PUT standing order updates amount');

  r = await req('POST', `/api/wallet/standing-orders/${orderId}/suspend`, {}, authH);
  assert(r.status === 200 && r.body.status === 'suspended', 'Suspend sets status suspended');

  r = await req('POST', `/api/wallet/standing-orders/${orderId}/suspend`, {}, authH);
  assert(r.status === 404, 'Suspending a non-active order returns 404');

  r = await req('POST', `/api/wallet/standing-orders/${orderId}/activate`, {}, authH);
  assert(r.status === 200 && r.body.status === 'active', 'Activate restores status active');

  r = await req('DELETE', `/api/wallet/standing-orders/${orderId}`, null, authH);
  assert(r.status === 200, 'DELETE standing order returns 200');

  // === Savings (/api/wallet/savings) ===
  r = await req('GET', '/api/wallet/balance', null, authH);
  const spendable = r.body.balance;
  r = await req('POST', '/api/wallet/deposit', { amount: 20000, method: 'test' }, authH);
  const before = (await req('GET', '/api/wallet/balance', null, authH)).body.balance;

  r = await req('POST', '/api/wallet/savings/topup', { amount: 5000 }, authH);
  assert(r.status === 200 && r.body.balance === 5000, 'Savings top-up moves wallet balance into savings');

  r = await req('GET', '/api/wallet/balance', null, authH);
  assert(r.body.balance === before - 5000, 'Wallet balance reduced by savings top-up');

  r = await req('POST', '/api/wallet/savings/topup', { amount: 99999999 }, authH);
  assert(r.status === 400, 'Savings top-up rejects amount exceeding wallet balance');

  r = await req('GET', '/api/wallet/savings/transactions', null, authH);
  assert(r.status === 200 && r.body.balance === 5000, 'Savings transactions returns balance');
  assert(r.body.transactions.length === 1 && r.body.transactions[0].kind === 'topup', 'Savings ledger records top-up');

  r = await req('POST', '/api/wallet/savings/withdraw', { amount: 2000 }, authH);
  assert(r.status === 200 && r.body.balance === 3000, 'Savings withdrawal reduces savings');

  r = await req('GET', '/api/wallet/balance', null, authH);
  assert(r.body.balance === before - 3000, 'Wallet balance credited by savings withdrawal');

  r = await req('POST', '/api/wallet/savings/withdraw', { amount: 99999999 }, authH);
  assert(r.status === 400, 'Savings withdrawal rejects amount above savings balance');

  r = await req('GET', '/api/wallet/savings/transactions', null, authH);
  assert(r.body.transactions.length === 2 && r.body.transactions[0].kind === 'withdraw', 'Savings ledger records withdrawal');

  // === Activity log (/api/activity-log) ===
  r = await req('POST', '/api/activity-log', { action: 'sync_test', details: 'from smoke' }, authH);
  assert(r.status === 201, 'POST /activity-log returns 201');

  r = await req('POST', '/api/activity-log', { details: 'no action' }, authH);
  assert(r.status === 400, 'POST /activity-log rejects missing action');

  r = await req('GET', '/api/activity-log?limit=10&offset=0', null, authH);
  assert(r.status === 200 && r.body.total >= 1, 'GET /activity-log returns logs with total');
  assert(r.body.logs[0].action === 'sync_test', 'Newest activity log is first');

  r = await req('GET', '/api/activity-log', null, { Authorization: `Bearer ${driverToken}` });
  assert(r.body.total === 0, 'Activity logs are scoped per user');

  r = await req('DELETE', '/api/activity-log/clear', null, authH);
  assert(r.status === 200 && r.body.deleted >= 1, 'DELETE /activity-log/clear removes logs');

  r = await req('GET', '/api/activity-log', null, authH);
  assert(r.body.total === 0, 'Activity log empty after clear');

  // === 2FA backup codes (/api/auth/2fa/backup-codes) ===
  r = await req('POST', '/api/auth/2fa/backup-codes/generate', { count: 5 }, authH);
  assert(r.status === 200 && r.body.codes.length === 5, 'Generate returns requested backup codes');
  const firstCode = r.body.codes[0];

  r = await req('GET', '/api/auth/2fa/backup-codes', null, authH);
  assert(r.status === 200 && r.body.length === 5, 'Backup code list returns 5 entries');
  assert(r.body.every(c => c.code_hash === undefined), 'Backup codes are never returned in plaintext on list');

  r = await req('POST', '/api/auth/2fa/backup-codes/verify', { code: '00000000' }, authH);
  assert(r.status === 401, 'Verify rejects an unknown backup code');

  r = await req('POST', '/api/auth/2fa/backup-codes/verify', { code: firstCode }, authH);
  assert(r.status === 200 && r.body.valid === true, 'Verify accepts a valid backup code');

  r = await req('POST', '/api/auth/2fa/backup-codes/verify', { code: firstCode }, authH);
  assert(r.status === 401, 'Backup codes are single use');

  r = await req('GET', '/api/auth/2fa/backup-codes', null, authH);
  assert(r.body.filter(c => c.used).length === 1, 'Used backup code is flagged');

  r = await req('POST', '/api/auth/2fa/backup-codes/generate', {}, authH);
  assert(r.status === 200 && r.body.codes.length === 10, 'Generate defaults to 10 codes');

  // Unauthenticated access is rejected on every new surface
  r = await req('GET', '/api/rides/recurring');
  assert(r.status === 401, 'GET /rides/recurring requires auth');
  r = await req('GET', '/api/budget');
  assert(r.status === 401, 'GET /budget requires auth');
  r = await req('GET', '/api/wallet/standing-orders');
  assert(r.status === 401, 'GET /wallet/standing-orders requires auth');
  r = await req('GET', '/api/wallet/savings/transactions');
  assert(r.status === 401, 'GET /wallet/savings/transactions requires auth');
  r = await req('GET', '/api/activity-log');
  assert(r.status === 401, 'GET /activity-log requires auth');
  r = await req('GET', '/api/auth/2fa/backup-codes');
  assert(r.status === 401, 'GET /backup-codes requires auth');

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


