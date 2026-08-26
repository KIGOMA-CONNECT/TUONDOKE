import db from '../db.js';
import logger from '../logger.js';

export function checkAndCreateScheduledTrips(): void {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay();

  const activeSchedules = db.prepare(`
    SELECT ds.*, u.id as user_id
    FROM driver_schedules ds
    JOIN users u ON ds.driver_id = u.id
    WHERE ds.day_of_week = ? AND ds.enabled = 1
    AND ? >= ds.start_hour AND ? < ds.end_hour
  `).all(currentDay, currentHour, currentHour) as any[];

  for (const schedule of activeSchedules) {
    const existingTrip = db.prepare(`
      SELECT id FROM trips
      WHERE driver_id = ? AND status = 'requested'
      AND scheduled_at IS NOT NULL
      AND date(scheduled_at) = date('now')
    `).get(schedule.driver_id) as any;

    if (!existingTrip) {
      logger.info({ driverId: schedule.driver_id }, 'Driver schedule check - no pending trips');
    }
  }
}

export function getUpcomingScheduledTrips(): any[] {
  return db.prepare(`
    SELECT t.*, u.name as passenger_name, u.phone as passenger_phone
    FROM trips t
    JOIN users u ON t.passenger_id = u.id
    WHERE t.scheduled_at IS NOT NULL
    AND t.status = 'requested'
    AND t.scheduled_at > datetime('now')
    ORDER BY t.scheduled_at ASC
    LIMIT 50
  `).all();
}

export function autoMatchScheduledTrips(): void {
  const upcoming = getUpcomingScheduledTrips();
  for (const trip of upcoming) {
    const scheduledTime = new Date(trip.scheduled_at);
    const now = new Date();
    const diffMinutes = (scheduledTime.getTime() - now.getTime()) / 60000;

    if (diffMinutes <= 15 && diffMinutes >= 0) {
      const availableDrivers = db.prepare(`
        SELECT u.id, u.name, ds.start_hour, ds.end_hour
        FROM users u
        JOIN driver_schedules ds ON ds.driver_id = u.id
        WHERE u.role = 'driver' AND u.verified = 1
        AND ds.day_of_week = ? AND ds.enabled = 1
        AND ? >= ds.start_hour AND ? < ds.end_hour
      `).all(now.getDay(), now.getHours(), now.getHours()) as any[];

      logger.info({ tripId: trip.id, candidates: availableDrivers.length }, 'Auto-matching scheduled trip');
    }
  }
}
