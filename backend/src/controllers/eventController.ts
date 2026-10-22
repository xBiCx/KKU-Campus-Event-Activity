import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { pool } from '../config/db.js';
import { AuthRequest } from '../middlewares/auth.js';

export const getEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, search, status, limit, offset } = req.query;

    let query = `
      SELECT 
        e.*, 
        u.username as author_name, 
        u.email as author_email,
        COUNT(er.id)::int as participant_count
      FROM events e
      JOIN users u ON e.user_id = u.id
      LEFT JOIN event_registrations er ON e.id = er.event_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (category && typeof category === 'string' && category !== 'all') {
      query += ` AND e.category = $${paramIndex++}`;
      params.push(category);
    }

    if (status && typeof status === 'string' && status !== 'all') {
      query += ` AND e.status = $${paramIndex++}`;
      params.push(status);
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const searchTerm = `%${search.trim()}%`;
      query += ` AND (e.title ILIKE $${paramIndex} OR e.description ILIKE $${paramIndex} OR e.location_name ILIKE $${paramIndex})`;
      params.push(searchTerm);
      paramIndex++;
    }

    query += ` GROUP BY e.id, u.username, u.email ORDER BY e.event_date ASC`;

    // Optional pagination support
    if (limit && !isNaN(parseInt(limit as string, 10))) {
      const lim = parseInt(limit as string, 10);
      query += ` LIMIT $${paramIndex++}`;
      params.push(lim);

      if (offset && !isNaN(parseInt(offset as string, 10))) {
        const off = parseInt(offset as string, 10);
        query += ` OFFSET $${paramIndex++}`;
        params.push(off);
      }
    }

    const result = await pool.query(query, params);
    res.json({ events: result.rows, items: result.rows });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getEventById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUserId = req.user ? req.user.userId : null;

    const result = await pool.query(
      `SELECT 
        e.*, 
        u.username as author_name, 
        u.email as author_email,
        COUNT(er.id)::int as participant_count,
        CASE 
          WHEN $2::int IS NOT NULL AND EXISTS(
            SELECT 1 FROM event_registrations WHERE event_id = e.id AND user_id = $2
          ) THEN true 
          ELSE false 
        END as is_registered
       FROM events e
       JOIN users u ON e.user_id = u.id
       LEFT JOIN event_registrations er ON e.id = er.event_id
       WHERE e.id = $1
       GROUP BY e.id, u.username, u.email`,
      [id, currentUserId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    const event = result.rows[0];
    res.json({ event, item: event });
  } catch (error) {
    console.error('Error fetching event by id:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const {
      title,
      description,
      locationName,
      latitude,
      longitude,
      category = 'academic',
      eventDate,
    } = req.body;

    if (!title || !locationName) {
      res.status(400).json({ message: 'Title and locationName are required' });
      return;
    }

    let imageUrl: string | null = null;
    if (req.file) {
      const serverUrl = process.env.SERVER_URL || `http://${req.headers.host}`;
      imageUrl = `${serverUrl}/uploads/${req.file.filename}`;
    } else if (req.body.imageUrl) {
      imageUrl = req.body.imageUrl;
    }

    const lat = latitude ? parseFloat(latitude) : 17.80902;
    const lng = longitude ? parseFloat(longitude) : 102.74853;
    const dateToStore = eventDate ? new Date(eventDate) : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const insertResult = await pool.query(
      `INSERT INTO events (user_id, category, title, description, image_url, latitude, longitude, location_name, event_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'upcoming')
       RETURNING *`,
      [
        req.user.userId,
        category,
        title.trim(),
        description ? description.trim() : '',
        imageUrl,
        lat,
        lng,
        locationName.trim(),
        dateToStore.toISOString(),
      ]
    );

    const newEvent = insertResult.rows[0];

    // Notification for creator
    await pool.query(
      `INSERT INTO notifications (user_id, event_id, title, message)
       VALUES ($1, $2, $3, $4)`,
      [
        req.user.userId,
        newEvent.id,
        'สร้างกิจกรรมเรียบร้อยแล้ว',
        `กิจกรรม "${newEvent.title}" ได้รับการประกาศแล้ว และจะมีการแจ้งเตือนผู้เข้าร่วมเมื่อใกล้ถึงเวลา`,
      ]
    );

    res.status(201).json({
      message: 'Event created successfully',
      event: newEvent,
      item: newEvent,
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const registerForEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    // Check if event exists
    const eventRes = await pool.query(`SELECT * FROM events WHERE id = $1`, [id]);
    if (eventRes.rowCount === 0) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }
    const event = eventRes.rows[0];

    // Toggle register / unregister
    const checkReg = await pool.query(
      `SELECT * FROM event_registrations WHERE event_id = $1 AND user_id = $2`,
      [id, req.user.userId]
    );

    let isRegistered: boolean;
    if (checkReg.rowCount && checkReg.rowCount > 0) {
      // Unregister
      await pool.query(
        `DELETE FROM event_registrations WHERE event_id = $1 AND user_id = $2`,
        [id, req.user.userId]
      );
      isRegistered = false;
    } else {
      // Register
      await pool.query(
        `INSERT INTO event_registrations (event_id, user_id) VALUES ($1, $2)`,
        [id, req.user.userId]
      );
      isRegistered = true;

      // Add in-app confirmation
      await pool.query(
        `INSERT INTO notifications (user_id, event_id, title, message)
         VALUES ($1, $2, $3, $4)`,
        [
          req.user.userId,
          id,
          'ลงทะเบียนเข้าร่วมกิจกรรมสำเร็จ',
          `คุณได้ลงทะเบียนเข้าร่วม "${event.title}" ระบบจะแจ้งเตือนคุณล่วงหน้าก่อนกิจกรรมเริ่ม!`,
        ]
      );
    }

    // Get count
    const countRes = await pool.query(
      `SELECT COUNT(*)::int as count FROM event_registrations WHERE event_id = $1`,
      [id]
    );

    res.json({
      message: isRegistered ? 'ลงทะเบียนเรียบร้อยแล้ว' : 'ยกเลิกการลงทะเบียนแล้ว',
      is_registered: isRegistered,
      participant_count: countRes.rows[0].count,
    });
  } catch (error) {
    console.error('Error toggling event registration:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateEventStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['upcoming', 'ongoing', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
      return;
    }

    const eventRes = await pool.query(`SELECT * FROM events WHERE id = $1`, [id]);
    if (eventRes.rowCount === 0) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    const event = eventRes.rows[0];
    if (event.user_id !== req.user.userId) {
      res.status(403).json({ message: 'You can only update your own events' });
      return;
    }

    const updateRes = await pool.query(
      `UPDATE events
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    res.json({
      message: 'Status updated successfully',
      event: updateRes.rows[0],
      item: updateRes.rows[0],
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { title, description, category, locationName, latitude, longitude, eventDate } = req.body;

    const eventRes = await pool.query(`SELECT * FROM events WHERE id = $1`, [id]);
    if (eventRes.rowCount === 0) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    const event = eventRes.rows[0];
    if (event.user_id !== req.user.userId) {
      res.status(403).json({ message: 'You can only edit your own events' });
      return;
    }

    let imageUrl = event.image_url;
    if (req.file) {
      const serverUrl = process.env.SERVER_URL || `http://${req.headers.host}`;
      imageUrl = `${serverUrl}/uploads/${req.file.filename}`;

      // Optionally clean old image
      if (event.image_url && event.image_url.includes('/uploads/')) {
        try {
          const oldFile = event.image_url.split('/uploads/').pop()?.split('?')[0];
          if (oldFile) {
            const oldPath = path.resolve(process.cwd(), 'uploads', oldFile);
            if (fs.existsSync(oldPath)) fs.promises.unlink(oldPath);
          }
        } catch (e) {
          console.warn('Could not remove previous event image', e);
        }
      }
    } else if (req.body.imageUrl !== undefined) {
      imageUrl = req.body.imageUrl || null;
    }

    const lat = latitude ? parseFloat(latitude) : Number(event.latitude);
    const lng = longitude ? parseFloat(longitude) : Number(event.longitude);
    const dateToStore = eventDate ? new Date(eventDate) : new Date(event.event_date);

    const updateRes = await pool.query(
      `UPDATE events
       SET title = $1, description = $2, category = $3, location_name = $4,
           latitude = $5, longitude = $6, event_date = $7, image_url = $8,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [
        title ? title.trim() : event.title,
        description !== undefined ? description.trim() : event.description,
        category || event.category,
        locationName ? locationName.trim() : event.location_name,
        lat,
        lng,
        dateToStore.toISOString(),
        imageUrl,
        id,
      ]
    );

    res.json({
      message: 'Event updated successfully',
      event: updateRes.rows[0],
      item: updateRes.rows[0],
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMyEvents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const result = await pool.query(
      `SELECT e.*, COUNT(er.id)::int as participant_count
       FROM events e
       LEFT JOIN event_registrations er ON e.id = er.event_id
       WHERE e.user_id = $1
       GROUP BY e.id
       ORDER BY e.created_at DESC`,
      [req.user.userId]
    );

    res.json({ events: result.rows, items: result.rows });
  } catch (error) {
    console.error('Error fetching my events:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMyRegisteredEvents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const result = await pool.query(
      `SELECT e.*, COUNT(er_all.id)::int as participant_count, true as is_registered
       FROM events e
       JOIN event_registrations er ON e.id = er.event_id
       LEFT JOIN event_registrations er_all ON e.id = er_all.event_id
       WHERE er.user_id = $1
       GROUP BY e.id
       ORDER BY e.event_date ASC`,
      [req.user.userId]
    );

    res.json({ events: result.rows, items: result.rows });
  } catch (error) {
    console.error('Error fetching registered events:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const eventRes = await pool.query(`SELECT * FROM events WHERE id = $1`, [id]);
    if (eventRes.rowCount === 0) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    const event = eventRes.rows[0];
    if (event.user_id !== req.user.userId) {
      res.status(403).json({ message: 'You can only delete your own events' });
      return;
    }

    await pool.query(`DELETE FROM events WHERE id = $1`, [id]);

    // Clean up uploaded image file if present
    if (event.image_url) {
      try {
        const urlStr = event.image_url;
        let filename: string | null = null;
        if (urlStr.includes('/uploads/')) {
          filename = urlStr.split('/uploads/').pop()?.split('?')[0] || null;
        }
        if (filename) {
          const filePath = path.resolve(process.cwd(), 'uploads', filename);
          if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
          }
        }
      } catch (err) {
        console.warn('Failed to delete image file associated with event:', err);
      }
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
