import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import { runMigrations } from './migrate.js';
import logger from './logger.js';
import { setupWebSocket } from './ws.js';
import { checkAndCreateScheduledTrips, autoMatchScheduledTrips } from './services/rideschedule.js';
import { expireOldPoints } from './services/loyalty.js';

// Routes
import authRoutes from './routes/auth.js';
import walletRoutes from './routes/wallet.js';
import {
  recurringRouter, budgetRouter, standingOrdersRouter,
  savingsRouter, activityRouter, backupCodesRouter,
} from './routes/sync.js';
import ridesRoutes from './routes/rides.js';
import driverRoutes from './routes/driver.js';
import reviewsRoutes from './routes/reviews.js';
import adminRoutes from './routes/admin.js';
import notificationsRoutes from './routes/notifications.js';
import supportRoutes from './routes/support.js';
import safetyRoutes from './routes/safety.js';
import loyaltyRoutes from './routes/loyalty.js';
import referralsRoutes from './routes/referrals.js';
import organizationsRoutes from './routes/organizations.js';
import savedPlacesRoutes from './routes/saved-places.js';
import favoriteRoutes from './routes/favorite-routes.js';
import cargoRoutes from './routes/cargo.js';
import financeRoutes from './routes/finance.js';
import rentalsRoutes from './routes/rentals.js';
import insuranceRoutes from './routes/insurance.js';
import membershipRoutes from './routes/membership.js';
import fleetsRoutes from './routes/fleets.js';
import promosRoutes from './routes/promos.js';
import announcementsRoutes from './routes/announcements.js';
import leaderboardRoutes from './routes/leaderboard.js';
import missionsRoutes from './routes/missions.js';
import splitsRoutes from './routes/splits.js';
import chatRoutes from './routes/chat.js';
import commuteRoutes from './routes/commute.js';
import qrpayRoutes from './routes/qrpay.js';
import dataRoutes from './routes/data.js';
import odometerRoutes from './routes/odometer.js';
import ussdRoutes from './routes/ussd.js';
import aiRoutes from './routes/ai.js';
import paymentsRoutes from './routes/payments.js';
import statementsRoutes from './routes/statements.js';
import tripSharingRoutes from './routes/trip-sharing.js';
import pushRoutes from './routes/push.js';
import kycRoutes from './routes/kyc.js';
import tfaRoutes from './routes/tfa.js';
import applicationsRoutes from './routes/applications.js';
import surgeRoutes from './routes/surge.js';
import vouchersRoutes from './routes/vouchers.js';
import webhooksRoutes from './routes/webhooks.js';
import errorsRoutes from './routes/errors.js';
import seoRoutes from './routes/seo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3100');

// Run migrations
runMigrations();

const app = express();

// Security
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));

// Global rate limit
const globalLimiter = rateLimit({
  windowMs: 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' }
});
app.use('/api', globalLimiter);

// Health
app.get('/api/health', (_req, res) => {
  const maintenance = db.prepare("SELECT value FROM settings WHERE key = 'maintenance_mode'").get() as any;
  if (maintenance?.value === '1') {
    res.json({ status: 'maintenance' });
    return;
  }
  res.json({ status: 'ok', version: '1.0.0', uptime: process.uptime() });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/wallet/standing-orders', standingOrdersRouter);
app.use('/api/wallet/savings', savingsRouter);
app.use('/api/rides/recurring', recurringRouter);
app.use('/api/rides', ridesRoutes);
app.use('/api/budget', budgetRouter);
app.use('/api/activity-log', activityRouter);
app.use('/api/auth/2fa/backup-codes', backupCodesRouter);
app.use('/api/driver', driverRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/safety', safetyRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/referrals', referralsRoutes);
app.use('/api/orgs', organizationsRoutes);
app.use('/api/saved-places', savedPlacesRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/cargo', cargoRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/rentals', rentalsRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/membership', membershipRoutes);
app.use('/api/fleets', fleetsRoutes);
app.use('/api/promos', promosRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/missions', missionsRoutes);
app.use('/api/splits', splitsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/commute', commuteRoutes);
app.use('/api/qrpay', qrpayRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/odometer', odometerRoutes);
app.use('/api/ussd', ussdRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/statements', statementsRoutes);
app.use('/api/share', tripSharingRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/tfa', tfaRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/surge', surgeRoutes);
app.use('/api/vouchers', vouchersRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/errors', errorsRoutes);
app.use('/api', seoRoutes);

// Serve static frontend in production
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Create server
const server = createServer(app);

// Auto-seed in test mode
if (process.env.NODE_ENV === 'test') {
  try {
    const { default: seed } = await import('./seed.js');
    seed();
  } catch {}
}

// Setup WebSocket
setupWebSocket(server);

// Recurring ride scheduler (every 60s)
setInterval(() => {
  try {
    checkAndCreateScheduledTrips();
    autoMatchScheduledTrips();
  } catch (err: any) {
    logger.error({ err: err.message }, 'Scheduler error');
  }
}, 60000);

// Loyalty point expiry (every hour)
setInterval(() => {
  try {
    expireOldPoints();
  } catch (err: any) {
    logger.error({ err: err.message }, 'Loyalty expiry error');
  }
}, 3600000);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down...');
  server.close(() => {
    db.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down...');
  server.close(() => {
    db.close();
    process.exit(0);
  });
});

server.listen(PORT, () => {
  logger.info(`TUONDOKE API running on port ${PORT}`);
});

export { app, server };
