import { Request, Response } from 'express';
import { pool } from '../config/db.js';
import { AuthRequest } from '../middlewares/auth.js';

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const result = await pool.query(
      `SELECT n.*, e.title as event_title, e.location_name
       FROM notifications n
       LEFT JOIN events e ON n.event_id = e.id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC`,
      [req.user.userId]
    );

    res.json({ notifications: result.rows });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const markNotificationRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    await pool.query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
      [id, req.user.userId]
    );

    res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Test notification endpoint for user (e.g. xBiCx) with custom countdown delay
 * Supports immediate or delayed notification via seconds parameter
 */
export const triggerTestNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username = 'xBiCx', seconds = 5, title, message } = req.body;

    // Find the target user
    const userRes = await pool.query(
      `SELECT id, username, email FROM users WHERE username = $1`,
      [username]
    );

    if (userRes.rowCount === 0) {
      res.status(404).json({ message: `ไม่พบผู้ใช้ชื่อ "${username}" ในระบบ` });
      return;
    }

    const targetUser = userRes.rows[0];
    const delaySec = Math.max(0, parseInt(seconds, 10) || 0);

    const notifTitle = title || `⏰ แจ้งเตือนทดสอบ: กิจกรรมกำลังจะเริ่มแล้ว!`;
    const notifMessage = message || `สวัสดีคุณ ${targetUser.username}, กิจกรรม "ติวเข้มก่อนสอบ Midterm" จะเริ่มในอีกไม่กี่นาที ที่อาคารเรียนรวม!`;

    // Fetch an event id if available
    const eventRes = await pool.query(`SELECT id FROM events ORDER BY id ASC LIMIT 1`);
    const eventId = eventRes.rowCount && eventRes.rowCount > 0 ? eventRes.rows[0].id : null;

    if (delaySec === 0) {
      // Immediate insertion
      const insRes = await pool.query(
        `INSERT INTO notifications (user_id, event_id, title, message)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [targetUser.id, eventId, notifTitle, notifMessage]
      );

      res.json({
        message: `ส่งการแจ้งเตือนถึง ${targetUser.username} สำเร็จทันที`,
        notification: insRes.rows[0],
      });
    } else {
      // Delayed insertion via setTimeout
      setTimeout(async () => {
        try {
          await pool.query(
            `INSERT INTO notifications (user_id, event_id, title, message)
             VALUES ($1, $2, $3, $4)`,
            [targetUser.id, eventId, notifTitle, notifMessage]
          );
          console.log(`[Test Notif Delayed] Sent to ${targetUser.username} after ${delaySec}s`);
        } catch (err) {
          console.error('Error inserting delayed notification:', err);
        }
      }, delaySec * 1000);

      res.json({
        message: `ตั้งเวลานับถอยหลัง ${delaySec} วินาทีเรียบร้อยแล้ว! ระบบจะส่งแจ้งเตือนหา ${targetUser.username} เมื่อครบเวลา`,
        delaySeconds: delaySec,
        username: targetUser.username,
      });
    }
  } catch (error) {
    console.error('Error triggering test notification:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
