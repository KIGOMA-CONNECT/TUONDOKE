import db from './db.js';
import logger from './logger.js';

type Database = import('better-sqlite3').Database;

interface Migration {
  name: string;
  up: (db: Database) => void;
}

const migrations: Migration[] = [
  {
    name: '002_users',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT UNIQUE NOT NULL,
        name TEXT DEFAULT '',
        email TEXT DEFAULT '',
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'passenger' CHECK(role IN ('passenger','driver','admin')),
        verified INTEGER DEFAULT 0,
        kyc_status TEXT DEFAULT 'none',
        avatar_url TEXT DEFAULT '',
        referral_code TEXT UNIQUE,
        referred_by INTEGER REFERENCES users(id),
        token_version INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '003_trips',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS trips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        passenger_id INTEGER NOT NULL REFERENCES users(id),
        driver_id INTEGER REFERENCES users(id),
        vehicle_type TEXT DEFAULT 'boda',
        status TEXT DEFAULT 'requested' CHECK(status IN ('requested','accepted','in_progress','completed','cancelled')),
        origin TEXT NOT NULL,
        origin_lat REAL,
        origin_lng REAL,
        destination TEXT NOT NULL,
        dest_lat REAL,
        dest_lng REAL,
        from_zone TEXT DEFAULT '',
        to_zone TEXT DEFAULT '',
        base_fare INTEGER DEFAULT 0,
        final_fare INTEGER DEFAULT 0,
        distance_km REAL DEFAULT 0,
        duration_seconds INTEGER DEFAULT 0,
        tip_amount INTEGER DEFAULT 0,
        payment_method TEXT DEFAULT 'cash',
        passenger_notes TEXT DEFAULT '',
        driver_notes TEXT DEFAULT '',
        cancelled_by INTEGER REFERENCES users(id),
        cancellation_reason TEXT DEFAULT '',
        scheduled_at TEXT,
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '004_cargo',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS cargo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL REFERENCES users(id),
        driver_id INTEGER REFERENCES users(id),
        vehicle_type TEXT DEFAULT 'pickup',
        status TEXT DEFAULT 'posted' CHECK(status IN ('posted','accepted','in_transit','delivered','pod_confirmed','cancelled')),
        waybill TEXT UNIQUE,
        origin TEXT NOT NULL,
        destination TEXT NOT NULL,
        cargo_type TEXT DEFAULT '',
        weight_kg REAL DEFAULT 0,
        base_fare INTEGER DEFAULT 0,
        escrow_amount INTEGER DEFAULT 0,
        final_fare INTEGER DEFAULT 0,
        notes TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '005_wallets',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS wallets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
        balance INTEGER DEFAULT 0,
        savings INTEGER DEFAULT 0,
        escrow_balance INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '006_transactions',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wallet_id INTEGER NOT NULL REFERENCES wallets(id),
        type TEXT NOT NULL CHECK(type IN ('deposit','withdrawal','transfer_in','transfer_out','ride_payment','ride_earning','cargo_payment','cargo_earning','tip','savings_topup','savings_withdrawal','loan_disbursement','loan_repayment','fd_opening','fd_interest','referral_bonus','insurance_payout','membership_cashback','voucher_redemption','mission_reward','prize_payout','advance_disbursement','advance_repayment','split_payment','split_refund','org_charge','org_refund','loyalty_redeem','other')),
        amount INTEGER NOT NULL,
        balance_after INTEGER DEFAULT 0,
        ref_type TEXT DEFAULT '',
        ref_id INTEGER DEFAULT 0,
        description TEXT DEFAULT '',
        meta TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '007_vehicles',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        driver_id INTEGER NOT NULL REFERENCES users(id),
        type TEXT DEFAULT 'boda' CHECK(type IN ('boda','bajaji','pickup','guta','fuso')),
        make TEXT DEFAULT '',
        model TEXT DEFAULT '',
        year INTEGER DEFAULT 0,
        plate TEXT DEFAULT '',
        color TEXT DEFAULT '',
        verified INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '008_reviews',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL REFERENCES trips(id),
        reviewer_id INTEGER NOT NULL REFERENCES users(id),
        reviewee_id INTEGER NOT NULL REFERENCES users(id),
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
        comment TEXT DEFAULT '',
        tags TEXT DEFAULT '[]',
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '009_driver_stats',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS driver_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        driver_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
        total_trips INTEGER DEFAULT 0,
        completed_trips INTEGER DEFAULT 0,
        cancelled_trips INTEGER DEFAULT 0,
        total_earnings INTEGER DEFAULT 0,
        avg_rating REAL DEFAULT 0,
        rating_count INTEGER DEFAULT 0,
        total_distance_km REAL DEFAULT 0,
        total_duration_seconds INTEGER DEFAULT 0,
        weekly_earnings_goal INTEGER DEFAULT 0,
        goal_updated_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '010_driver_schedules',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS driver_schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        driver_id INTEGER NOT NULL REFERENCES users(id),
        day_of_week INTEGER NOT NULL CHECK(day_of_week >= 0 AND day_of_week <= 6),
        start_hour INTEGER DEFAULT 8,
        end_hour INTEGER DEFAULT 18,
        enabled INTEGER DEFAULT 1,
        UNIQUE(driver_id, day_of_week)
      )`);
    }
  },
  {
    name: '011_driver_online_sessions',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS driver_online_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        driver_id INTEGER NOT NULL REFERENCES users(id),
        started_at TEXT NOT NULL,
        ended_at TEXT,
        duration_seconds INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '012_driver_expenses',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS driver_expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        driver_id INTEGER NOT NULL REFERENCES users(id),
        category TEXT NOT NULL CHECK(category IN ('fuel','maintenance','insurance','parking','toll','other')),
        amount INTEGER NOT NULL,
        description TEXT DEFAULT '',
        expense_date TEXT DEFAULT (date('now')),
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '013_driver_advances',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS driver_advances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        driver_id INTEGER NOT NULL REFERENCES users(id),
        amount INTEGER NOT NULL,
        pct INTEGER DEFAULT 10,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','repaid','rejected')),
        balance INTEGER DEFAULT 0,
        repaid_amount INTEGER DEFAULT 0,
        approved_at TEXT,
        disbursed_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '014_saved_places',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS saved_places (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        place_name TEXT NOT NULL,
        address TEXT DEFAULT '',
        lat REAL DEFAULT 0,
        lng REAL DEFAULT 0,
        zone TEXT DEFAULT '',
        sort_order INTEGER DEFAULT 0,
        icon TEXT DEFAULT 'home',
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '015_favorite_routes',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS favorite_routes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        from_zone TEXT NOT NULL,
        to_zone TEXT NOT NULL,
        label TEXT DEFAULT '',
        use_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '016_loyalty_points',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS loyalty_points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        points INTEGER DEFAULT 0,
        lifetime_earned INTEGER DEFAULT 0,
        lifetime_redeemed INTEGER DEFAULT 0,
        expires_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '017_loyalty_history',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS loyalty_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type TEXT NOT NULL CHECK(type IN ('earn','redeem','expire')),
        points INTEGER NOT NULL,
        ref_type TEXT DEFAULT '',
        ref_id INTEGER DEFAULT 0,
        description TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '018_promos',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS promos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        discount_pct INTEGER DEFAULT 0,
        discount_amount INTEGER DEFAULT 0,
        max_uses INTEGER DEFAULT 0,
        used_count INTEGER DEFAULT 0,
        valid_from TEXT,
        valid_until TEXT,
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '019_notifications',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        read INTEGER DEFAULT 0,
        meta TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '020_support_tickets',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS support_tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        subject TEXT NOT NULL,
        status TEXT DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved','closed')),
        priority TEXT DEFAULT 'normal',
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '021_support_messages',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS support_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER NOT NULL REFERENCES support_tickets(id),
        sender_id INTEGER NOT NULL REFERENCES users(id),
        message TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '022_sos_alerts',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS sos_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        trip_id INTEGER REFERENCES trips(id),
        status TEXT DEFAULT 'active' CHECK(status IN ('active','resolved','false_alarm')),
        location TEXT DEFAULT '',
        lat REAL DEFAULT 0,
        lng REAL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '023_emergency_contacts',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS emergency_contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        relationship TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '024_insurance_plans',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS insurance_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        premium INTEGER NOT NULL,
        coverage_amount INTEGER NOT NULL,
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '025_trip_insurance',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS trip_insurance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL REFERENCES trips(id),
        passenger_id INTEGER NOT NULL REFERENCES users(id),
        plan_id INTEGER NOT NULL REFERENCES insurance_plans(id),
        status TEXT DEFAULT 'active' CHECK(status IN ('active','claimed','expired')),
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '026_insurance_claims',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS insurance_claims (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        insurance_id INTEGER NOT NULL REFERENCES trip_insurance(id),
        passenger_id INTEGER NOT NULL REFERENCES users(id),
        reason TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
        payout_amount INTEGER DEFAULT 0,
        admin_notes TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '027_membership_plans',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS membership_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        monthly_price INTEGER NOT NULL,
        cashback_pct INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '028_memberships',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS memberships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        plan_id INTEGER NOT NULL REFERENCES membership_plans(id),
        status TEXT DEFAULT 'active' CHECK(status IN ('active','expired','cancelled')),
        starts_at TEXT DEFAULT (datetime('now')),
        expires_at TEXT,
        auto_renew INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '029_fleets',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS fleets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '030_fleet_members',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS fleet_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fleet_id INTEGER NOT NULL REFERENCES fleets(id),
        driver_id INTEGER NOT NULL REFERENCES users(id),
        share_pct INTEGER DEFAULT 90,
        active INTEGER DEFAULT 1,
        joined_at TEXT DEFAULT (datetime('now')),
        UNIQUE(fleet_id, driver_id)
      )`);
    }
  },
  {
    name: '031_organizations',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS organizations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        owner_id INTEGER NOT NULL REFERENCES users(id),
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','suspended')),
        wallet_balance INTEGER DEFAULT 0,
        contact_phone TEXT DEFAULT '',
        contact_email TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '032_org_members',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS org_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        org_id INTEGER NOT NULL REFERENCES organizations(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        role TEXT DEFAULT 'member',
        UNIQUE(org_id, user_id)
      )`);
    }
  },
  {
    name: '033_surge_configs',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS surge_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        zone TEXT NOT NULL,
        vehicle_type TEXT NOT NULL,
        multiplier REAL DEFAULT 1.0,
        active INTEGER DEFAULT 1,
        UNIQUE(zone, vehicle_type)
      )`);
    }
  },
  {
    name: '034_missions',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS missions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        target_trips INTEGER DEFAULT 10,
        reward_amount INTEGER DEFAULT 0,
        start_date TEXT,
        end_date TEXT,
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '035_mission_progress',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS mission_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        driver_id INTEGER NOT NULL REFERENCES users(id),
        mission_id INTEGER NOT NULL REFERENCES missions(id),
        completed_trips INTEGER DEFAULT 0,
        claimed INTEGER DEFAULT 0,
        UNIQUE(driver_id, mission_id)
      )`);
    }
  },
  {
    name: '036_splits',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS splits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL REFERENCES trips(id),
        inviter_id INTEGER NOT NULL REFERENCES users(id),
        invitee_id INTEGER REFERENCES users(id),
        amount INTEGER NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending','paid','refunded')),
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '037_chats',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL REFERENCES trips(id),
        sender_id INTEGER NOT NULL REFERENCES users(id),
        message TEXT NOT NULL,
        read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '038_commute_plans',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS commute_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        from_zone TEXT NOT NULL,
        to_zone TEXT NOT NULL,
        vehicle_type TEXT DEFAULT 'boda',
        trips_total INTEGER DEFAULT 0,
        trips_used INTEGER DEFAULT 0,
        price_per_trip INTEGER DEFAULT 0,
        total_paid INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active' CHECK(status IN ('active','paused','exhausted','expired')),
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '039_vouchers',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS vouchers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        buyer_id INTEGER NOT NULL REFERENCES users(id),
        recipient_phone TEXT NOT NULL,
        amount INTEGER NOT NULL,
        status TEXT DEFAULT 'active',
        redeemed_by INTEGER REFERENCES users(id),
        redeemed_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '040_announcements',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '041_webhooks',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS webhooks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        events TEXT DEFAULT '[]',
        secret TEXT DEFAULT '',
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '042_feature_flags',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS feature_flags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        enabled INTEGER DEFAULT 0,
        description TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '043_audit_log',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        action TEXT NOT NULL,
        resource TEXT DEFAULT '',
        resource_id INTEGER DEFAULT 0,
        meta TEXT DEFAULT '{}',
        ip TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '044_settings',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '045_referrals',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS referrals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        referrer_id INTEGER NOT NULL REFERENCES users(id),
        referred_id INTEGER NOT NULL REFERENCES users(id),
        bonus_paid INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '046_passenger_budgets',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS passenger_budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
        monthly_limit INTEGER DEFAULT 0,
        current_spend INTEGER DEFAULT 0,
        month TEXT DEFAULT (strftime('%Y-%m','now')),
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '047_odometer_logs',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS odometer_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        driver_id INTEGER NOT NULL REFERENCES users(id),
        vehicle_id INTEGER REFERENCES vehicles(id),
        start_reading REAL NOT NULL,
        end_reading REAL,
        start_date TEXT NOT NULL,
        end_date TEXT,
        notes TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '048_fixed_deposits',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS fixed_deposits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        amount INTEGER NOT NULL,
        rate_pct REAL DEFAULT 10,
        tenure_months INTEGER DEFAULT 6,
        status TEXT DEFAULT 'active' CHECK(status IN ('active','matured','closed')),
        opened_at TEXT DEFAULT (datetime('now')),
        matures_at TEXT,
        auto_renew INTEGER DEFAULT 0
      )`);
    }
  },
  {
    name: '049_loans',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS loans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        amount INTEGER NOT NULL,
        interest_pct REAL DEFAULT 5,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','disbursed','repaid','defaulted')),
        repaid_amount INTEGER DEFAULT 0,
        approved_at TEXT,
        disbursed_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '050_rentals',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS rentals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        vehicle_type TEXT DEFAULT 'boda',
        status TEXT DEFAULT 'booked' CHECK(status IN ('booked','active','completed','cancelled')),
        start_date TEXT DEFAULT (datetime('now')),
        end_date TEXT,
        daily_rate INTEGER DEFAULT 0,
        total_cost INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '051_driver_applications',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS driver_applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
        vehicle_type TEXT DEFAULT 'boda',
        notes TEXT DEFAULT '',
        reviewed_by INTEGER REFERENCES users(id),
        reviewed_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '052_sos_broadcasts',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS sos_broadcasts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        trip_id INTEGER REFERENCES trips(id),
        lat REAL DEFAULT 0,
        lng REAL DEFAULT 0,
        status TEXT DEFAULT 'active' CHECK(status IN ('active','resolved')),
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '053_speed_alerts',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS speed_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        driver_id INTEGER NOT NULL REFERENCES users(id),
        trip_id INTEGER REFERENCES trips(id),
        speed_kmh REAL NOT NULL,
        lat REAL DEFAULT 0,
        lng REAL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '054_peer_reviews',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS peer_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL REFERENCES trips(id),
        reviewer_id INTEGER NOT NULL REFERENCES users(id),
        reviewee_id INTEGER NOT NULL REFERENCES users(id),
        stars INTEGER NOT NULL CHECK(stars >= 1 AND stars <= 5),
        tags TEXT DEFAULT '[]',
        comment TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '055_push_subscriptions',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        endpoint TEXT NOT NULL,
        keys TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '056_kyc_submissions',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS kyc_submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        document_type TEXT DEFAULT 'national_id',
        document_url TEXT DEFAULT '',
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
        reviewed_by INTEGER REFERENCES users(id),
        reviewed_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '057_tfa_settings',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS tfa_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
        enabled INTEGER DEFAULT 0,
        secret TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '058_otp_codes',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS otp_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT NOT NULL,
        code TEXT NOT NULL,
        purpose TEXT DEFAULT 'login',
        expires_at TEXT NOT NULL,
        used INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '059_webhook_logs',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS webhook_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        webhook_id INTEGER NOT NULL REFERENCES webhooks(id),
        event TEXT NOT NULL,
        payload TEXT DEFAULT '{}',
        response_status INTEGER DEFAULT 0,
        response_body TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '060_receipts',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        trip_id INTEGER REFERENCES trips(id),
        amount INTEGER NOT NULL,
        html TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '061_surge_history',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS surge_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL REFERENCES trips(id),
        zone TEXT NOT NULL,
        vehicle_type TEXT NOT NULL,
        multiplier REAL NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '062_chat_unread',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS chat_unread (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL REFERENCES trips(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        unread_count INTEGER DEFAULT 0,
        UNIQUE(trip_id, user_id)
      )`);
    }
  },
  {
    name: '063_splits_v2',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS splits_v2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL REFERENCES trips(id),
        inviter_id INTEGER NOT NULL REFERENCES users(id),
        invitee_id INTEGER REFERENCES users(id),
        amount INTEGER NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending','paid','refunded')),
        cap INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '064_tip_stats',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS tip_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        driver_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
        total_tips INTEGER DEFAULT 0,
        tip_count INTEGER DEFAULT 0
      )`);
    }
  },
  {
    name: '065_indemnity',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS indemnity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        accepted INTEGER DEFAULT 0,
        accepted_at TEXT
      )`);
    }
  },
  {
    name: '066_recurring_rides',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS recurring_rides (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        origin TEXT NOT NULL,
        destination TEXT NOT NULL,
        vehicle_type TEXT DEFAULT 'boda',
        time TEXT NOT NULL,
        days TEXT NOT NULL,
        interval TEXT DEFAULT 'weekly' CHECK(interval IN ('daily','weekly','monthly')),
        active INTEGER DEFAULT 1,
        last_run TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_rides(user_id)`);
    }
  },
  {
    name: '067_user_budgets',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS user_budgets (
        user_id INTEGER PRIMARY KEY REFERENCES users(id),
        monthly_limit INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT DEFAULT (datetime('now'))
      )`);
    }
  },
  {
    name: '068_standing_orders',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS standing_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        recipient_phone TEXT NOT NULL,
        amount INTEGER NOT NULL,
        frequency TEXT DEFAULT 'weekly' CHECK(frequency IN ('daily','weekly','monthly')),
        start_date TEXT NOT NULL,
        status TEXT DEFAULT 'active' CHECK(status IN ('active','suspended','cancelled')),
        last_run TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_so_user ON standing_orders(user_id)`);
    }
  },
  {
    name: '069_savings_transactions',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS savings_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        kind TEXT NOT NULL CHECK(kind IN ('topup','withdraw','bonus')),
        amount INTEGER NOT NULL,
        balance_after INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_savings_user ON savings_transactions(user_id)`);
    }
  },
  {
    name: '070_activity_logs',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        action TEXT NOT NULL,
        details TEXT DEFAULT '',
        ip TEXT DEFAULT '',
        user_agent TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      )`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id, created_at DESC)`);
    }
  },
  {
    name: '071_backup_codes',
    up: (db: any) => {
      db.exec(`CREATE TABLE IF NOT EXISTS user_backup_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        code_hash TEXT NOT NULL,
        used INTEGER DEFAULT 0,
        used_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_backup_user ON user_backup_codes(user_id)`);
    }
  }
];

export function runMigrations(): void {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_version (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    applied_at TEXT DEFAULT (datetime('now'))
  )`);
  const applied = db.prepare('SELECT name FROM schema_version').all() as { name: string }[];
  const appliedSet = new Set(applied.map(r => r.name));

  let count = 0;
  for (const m of migrations) {
    if (!appliedSet.has(m.name)) {
      try {
        m.up(db);
        db.prepare('INSERT INTO schema_version (name) VALUES (?)').run(m.name);
        count++;
        logger.info(`Migration ${m.name} applied`);
      } catch (err: any) {
        logger.error({ err: err.message }, `Migration ${m.name} failed`);
        throw err;
      }
    }
  }
  if (count > 0) logger.info(`${count} migration(s) applied`);
}

if (process.argv[1]?.includes('migrate')) {
  runMigrations();
  process.exit(0);
}

export default migrations;
