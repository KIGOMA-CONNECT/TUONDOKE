import bcrypt from 'bcryptjs';
import db from './db.js';
import { runMigrations } from './migrate.js';
import { genReferralCode } from './middleware.js';
import logger from './logger.js';

function seed(): void {
  logger.info('Running migrations...');
  runMigrations();

  logger.info('Seeding database...');

  const adminPassword = bcrypt.hashSync('1234', 12);
  const userPassword = bcrypt.hashSync('1234', 12);

  // Users
  const insertUser = db.prepare('INSERT OR IGNORE INTO users (phone, name, password_hash, role, verified, referral_code) VALUES (?, ?, ?, ?, ?, ?)');

  insertUser.run('0710000000', 'Admin', adminPassword, 'admin', 1, genReferralCode());
  insertUser.run('0711000001', 'Juma', userPassword, 'passenger', 1, genReferralCode());
  insertUser.run('0712000001', 'Rajabu', userPassword, 'driver', 1, genReferralCode());
  insertUser.run('0712000002', 'Hamis', userPassword, 'driver', 1, genReferralCode());

  // Wallets
  const insertWallet = db.prepare('INSERT OR IGNORE INTO wallets (user_id, balance) VALUES (?, ?)');
  insertWallet.run(1, 100000);
  insertWallet.run(2, 5000);
  insertWallet.run(3, 15000);
  insertWallet.run(4, 8000);

  // Vehicles
  const insertVehicle = db.prepare('INSERT OR IGNORE INTO vehicles (driver_id, type, make, model, year, plate, color) VALUES (?, ?, ?, ?, ?, ?, ?)');
  insertVehicle.run(3, 'boda', 'Honda', 'CB125', 2023, 'T123ABC', 'Red');
  insertVehicle.run(3, 'pickup', 'Toyota', 'Hilux', 2022, 'T456DEF', 'White');
  insertVehicle.run(4, 'boda', 'Yamaha', 'YZF-R15', 2023, 'T789GHI', 'Blue');

  // Driver stats
  const insertDriverStats = db.prepare('INSERT OR IGNORE INTO driver_stats (driver_id, total_trips, completed_trips, total_earnings, avg_rating, rating_count) VALUES (?, ?, ?, ?, ?, ?)');
  insertDriverStats.run(3, 150, 140, 350000, 4.7, 120);
  insertDriverStats.run(4, 80, 75, 180000, 4.5, 65);

  // Driver schedules
  const insertSchedule = db.prepare('INSERT OR IGNORE INTO driver_schedules (driver_id, day_of_week, start_hour, end_hour, enabled) VALUES (?, ?, ?, ?, ?)');
  for (let day = 0; day <= 6; day++) {
    insertSchedule.run(3, day, 6, 22, 1);
    insertSchedule.run(4, day, 7, 20, 1);
  }

  // Surge configs
  const insertSurge = db.prepare('INSERT OR IGNORE INTO surge_configs (zone, vehicle_type, multiplier, active) VALUES (?, ?, ?, ?)');
  insertSurge.run('downtown', 'boda', 1.5, 1);
  insertSurge.run('downtown', 'pickup', 1.3, 1);
  insertSurge.run('airport', 'boda', 2.0, 1);
  insertSurge.run('airport', 'pickup', 1.8, 1);
  insertSurge.run('suburb', 'boda', 1.0, 1);

  // Insurance plans
  const insertInsurance = db.prepare('INSERT OR IGNORE INTO insurance_plans (name, description, premium, coverage_amount, active) VALUES (?, ?, ?, ?, ?)');
  insertInsurance.run('Basic Cover', 'Trip accident cover up to KES 50,000', 50, 50000, 1);
  insertInsurance.run('Standard Cover', 'Comprehensive trip cover up to KES 200,000', 150, 200000, 1);
  insertInsurance.run('Premium Cover', 'Full coverage up to KES 500,000', 300, 500000, 1);

  // Membership plans
  const insertMembership = db.prepare('INSERT OR IGNORE INTO membership_plans (name, description, monthly_price, cashback_pct, active) VALUES (?, ?, ?, ?, ?)');
  insertMembership.run('Bronze', '5% cashback on all rides', 200, 5, 1);
  insertMembership.run('Silver', '10% cashback on all rides', 500, 10, 1);
  insertMembership.run('Gold', '15% cashback + priority support', 1000, 15, 1);

  // Feature flags
  const insertFlag = db.prepare('INSERT OR IGNORE INTO feature_flags (name, enabled, description) VALUES (?, ?, ?)');
  insertFlag.run('cargo', 1, 'Enable cargo delivery');
  insertFlag.run('commute', 1, 'Enable commute plans');
  insertFlag.run('carpool', 0, 'Enable carpooling');
  insertFlag.run('insurance', 1, 'Enable trip insurance');
  insertFlag.run('membership', 1, 'Enable membership plans');
  insertFlag.run('loyalty', 1, 'Enable loyalty points');
  insertFlag.run('sos', 1, 'Enable SOS alerts');
  insertFlag.run('fleet', 1, 'Enable fleet management');
  insertFlag.run('org', 1, 'Enable organizations');
  insertFlag.run('advances', 1, 'Enable driver advances');

  // Settings
  const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  insertSetting.run('app_name', 'TUONDOKE');
  insertSetting.run('app_tagline', 'Healing and Logistic Management Platform');
  insertSetting.run('maintenance_mode', '0');
  insertSetting.run('ussd_service_codes', process.env.USSD_SERVICE_CODES || '*152*00#');
  insertSetting.run('at_sender_phone', process.env.AT_SENDER_PHONE || '');
  insertSetting.run('currency', 'KES');
  insertSetting.run('min_withdrawal', '100');
  insertSetting.run('max_withdrawal', '50000');
  insertSetting.run('platform_commission_pct', '15');
  insertSetting.run('referral_bonus', '100');

  // Emergency contacts for demo
  const insertContact = db.prepare('INSERT OR IGNORE INTO emergency_contacts (user_id, name, phone, relationship) VALUES (?, ?, ?, ?)');
  insertContact.run(2, 'Mama Juma', '0710000001', 'Mother');
  insertContact.run(2, 'Baba Juma', '0710000002', 'Father');

  // Promos
  const insertPromo = db.prepare('INSERT OR IGNORE INTO promos (code, discount_pct, discount_amount, max_uses, valid_until, active) VALUES (?, ?, ?, ?, ?, ?)');
  insertPromo.run('WELCOME20', 20, 0, 1000, '2026-12-31', 1);
  insertPromo.run('FLAT500', 0, 500, 100, '2026-12-31', 1);

  // Missions
  const insertMission = db.prepare('INSERT OR IGNORE INTO missions (title, description, target_trips, reward_amount, start_date, end_date, active) VALUES (?, ?, ?, ?, ?, ?, ?)');
  insertMission.run('Weekend Warrior', 'Complete 10 trips this weekend', 10, 500, '2026-08-23', '2026-08-30', 1);
  insertMission.run('Monthly Master', 'Complete 50 trips this month', 50, 2000, '2026-08-01', '2026-08-31', 1);

  // Announcements
  const insertAnnouncement = db.prepare('INSERT OR IGNORE INTO announcements (title, body, slug, active) VALUES (?, ?, ?, ?)');
  insertAnnouncement.run('Welcome to TUONDOKE', 'We are excited to launch TUONDOKE, your healing and logistic management platform!', 'welcome', 1);
  insertAnnouncement.run('Safety First', 'Always share your trip details with trusted contacts. Use our SOS feature in emergencies.', 'safety-first', 1);

  // Tip stats for drivers
  db.prepare('INSERT OR IGNORE INTO tip_stats (driver_id, total_tips, tip_count) VALUES (?, ?, ?)').run(3, 15000, 45);
  db.prepare('INSERT OR IGNORE INTO tip_stats (driver_id, total_tips, tip_count) VALUES (?, ?, ?)').run(4, 8000, 22);

  logger.info('Database seeded successfully!');
  logger.info('Demo accounts:');
  logger.info('  Admin:   0710000000 / 1234');
  logger.info('  Passenger: 0711000001 / 1234');
  logger.info('  Driver:  0712000001 / 1234');
  logger.info('  Driver:  0712000002 / 1234');
}

export default seed;

if (process.argv[1]?.includes('seed')) {
  seed();
}
