import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { AuthRequest } from '../middlewares/auth.js';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ message: 'Username, email and password are required' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters' });
      return;
    }

    // Check if user already exists
    const existing = await pool.query(
      `SELECT id FROM users WHERE email = $1 OR username = $2`,
      [email.toLowerCase(), username.trim()]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      res.status(409).json({ message: 'Email or username already in use' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const insertRes = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, created_at`,
      [username.trim(), email.toLowerCase().trim(), passwordHash]
    );

    const newUser = insertRes.rows[0];
    const secret = process.env.JWT_SECRET || 'secret';
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, username: newUser.username },
      secret,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'Registered successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        createdAt: newUser.created_at,
      },
      token,
    });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    const result = await pool.query(
      `SELECT id, username, email, password_hash, created_at
       FROM users
       WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (result.rowCount === 0) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const secret = process.env.JWT_SECRET || 'secret';
    const token = jwt.sign(
      { userId: user.id, email: user.email, username: user.username },
      secret,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.created_at,
      },
      token,
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const userRes = await pool.query(
      `SELECT id, username, email, avatar_url, created_at FROM users WHERE id = $1`,
      [req.user.userId]
    );

    if (userRes.rowCount === 0) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const user = userRes.rows[0];

    // Counts of events organized and events joined
    const statsRes = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM events WHERE user_id = $1) as my_events_count,
         (SELECT COUNT(*) FROM event_registrations WHERE user_id = $1) as registered_count,
         (SELECT COUNT(*) FROM events WHERE user_id = $1 AND status = 'completed') as completed_count
      `,
      [req.user.userId]
    );

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
        createdAt: user.created_at,
        stats: statsRes.rows[0],
      },
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateAvatar = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    let avatarUrl: string | null = null;
    if (req.file) {
      const serverUrl = process.env.SERVER_URL || `http://${req.headers.host}`;
      avatarUrl = `${serverUrl}/uploads/${req.file.filename}`;
    } else if (req.body.avatarUrl) {
      avatarUrl = req.body.avatarUrl;
    }

    if (!avatarUrl) {
      res.status(400).json({ message: 'No image provided' });
      return;
    }

    const updateRes = await pool.query(
      `UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING id, username, email, avatar_url, created_at`,
      [avatarUrl, req.user.userId]
    );

    if (updateRes.rowCount === 0) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const updatedUser = updateRes.rows[0];

    // Re-fetch stats
    const statsRes = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM events WHERE user_id = $1) as my_events_count,
         (SELECT COUNT(*) FROM event_registrations WHERE user_id = $1) as registered_count,
         (SELECT COUNT(*) FROM events WHERE user_id = $1 AND status = 'completed') as completed_count
      `,
      [req.user.userId]
    );

    res.json({
      message: 'Avatar updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        avatar_url: updatedUser.avatar_url,
        createdAt: updatedUser.created_at,
        stats: statsRes.rows[0],
      },
    });
  } catch (error) {
    console.error('Error updating avatar:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

