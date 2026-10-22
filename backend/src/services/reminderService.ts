import cron from 'node-cron';
import { pool } from '../config/db.js';

/**
 * Service to check upcoming events and trigger notifications before they start
 * Runs every minute to find events occurring in the next 1 hour or 24 hours
 */
export const startEventReminderScheduler = () => {
  console.log('⏰ Starting Event Reminder Scheduler (runs every minute)...');

  // Check every minute: '* * * * *'
  cron.schedule('* * * * *', async () => {
    try {
      // Find registrations for upcoming events starting within the next 2 hours
      // where reminder has not been sent yet
      const query = `
        SELECT 
          er.id as registration_id,
          er.user_id,
          er.event_id,
          e.title as event_title,
          e.location_name,
          e.event_date
        FROM event_registrations er
        JOIN events e ON er.event_id = e.id
        WHERE er.reminded_at IS NULL
          AND e.status = 'upcoming'
          AND e.event_date > CURRENT_TIMESTAMP
          AND e.event_date <= (CURRENT_TIMESTAMP + INTERVAL '2 hours')
      `;

      const result = await pool.query(query);

      for (const row of result.rows) {
        const eventTime = new Date(row.event_date).toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit',
        });

        const notifTitle = `⏰ แจ้งเตือน: กิจกรรมใกล้จะเริ่มแล้ว!`;
        const notifMsg = `กิจกรรม "${row.event_title}" จะเริ่มในเวลา ${eventTime} น. ที่ ${row.location_name}`;

        // Insert notification
        await pool.query(
          `INSERT INTO notifications (user_id, event_id, title, message)
           VALUES ($1, $2, $3, $4)`,
          [row.user_id, row.event_id, notifTitle, notifMsg]
        );

        // Mark as reminded so we don't repeat
        await pool.query(
          `UPDATE event_registrations SET reminded_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [row.registration_id]
        );

        console.log(`[Reminder Sent] User: ${row.user_id} for event: ${row.event_title}`);
      }
    } catch (error) {
      console.error('Error running event reminder cron job:', error);
    }
  });
};
