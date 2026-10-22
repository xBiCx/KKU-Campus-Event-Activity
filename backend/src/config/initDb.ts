import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME || 'campus_event_activity';

async function initDatabase() {
  console.log(`Connecting to default postgres database at ${DB_HOST}:${DB_PORT}...`);
  const adminClient = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: 'postgres',
  });

  try {
    await adminClient.connect();
    const checkDb = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [DB_NAME]
    );

    if (checkDb.rowCount === 0) {
      console.log(`Database "${DB_NAME}" does not exist. Creating...`);
      await adminClient.query(`CREATE DATABASE "${DB_NAME}"`);
      console.log(`Database "${DB_NAME}" created successfully.`);
    } else {
      console.log(`Database "${DB_NAME}" already exists.`);
    }
  } catch (error) {
    console.error('Error checking/creating database:', error);
    process.exit(1);
  } finally {
    await adminClient.end();
  }

  // Connect to target database
  console.log(`Connecting to "${DB_NAME}" to run schema migrations...`);
  const appClient = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });

  try {
    await appClient.connect();

    // 1. Create users table
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(150) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        avatar_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
    `);

    // 2. Create events table (Campus Events & Activities)
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        category VARCHAR(50) NOT NULL DEFAULT 'academic',
        title VARCHAR(200) NOT NULL,
        description TEXT,
        image_url VARCHAR(500),
        latitude NUMERIC(10, 7) NOT NULL,
        longitude NUMERIC(10, 7) NOT NULL,
        location_name VARCHAR(200) NOT NULL,
        event_date TIMESTAMP NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Create event_registrations (Users RSVP / Join / Register for pre-event alerts)
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS event_registrations (
        id SERIAL PRIMARY KEY,
        event_id INT REFERENCES events(id) ON DELETE CASCADE,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        reminded_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (event_id, user_id)
      );
    `);

    // 4. Create notifications table
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        event_id INT REFERENCES events(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Tables created or verified successfully.');

    // Seed dummy user if not exists
    const userRes = await appClient.query(`SELECT id FROM users LIMIT 1`);
    let demoUserId: number;

    if (userRes.rowCount === 0) {
      console.log('Seeding initial demo user...');
      const hashedPassword = await bcrypt.hash('123456', 10);
      const insertUser = await appClient.query(
        `INSERT INTO users (username, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id`,
        ['student_kku', 'student@kku.ac.th', hashedPassword]
      );
      demoUserId = insertUser.rows[0].id;
      console.log(`Demo user created with ID ${demoUserId}`);
    } else {
      demoUserId = userRes.rows[0].id;
    }

    // Seed initial events around KKU Nong Khai campus
    const eventsRes = await appClient.query(`SELECT id FROM events LIMIT 1`);
    if (eventsRes.rowCount === 0) {
      console.log('Seeding demo campus events at KKU Nong Khai Campus...');
      
      const now = new Date();
      const inTwoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      const demoEvents = [
        {
          category: 'academic',
          title: 'ติวเข้มก่อนสอบ Midterm: Data Structures & Algorithms',
          description: 'สรุปหัวข้อสำคัญ Tree, Graph, Sorting ตะลุยโจทย์จริงโดยรุ่นพี่ CS & IT มข. วิทยาเขตหนองคาย ฟรี ไม่มีค่าใช้จ่าย!',
          image_url: null,
          latitude: 17.80322,
          longitude: 102.74806,
          location_name: 'อาคารเรียนรวม ห้อง 301',
          event_date: inTwoHours,
          status: 'upcoming',
        },
        {
          category: 'workshop',
          title: 'Workshop: พัฒนา Mobile App ด้วย React Native & Expo',
          description: 'เวิร์กช็อปภาคปฏิบัติ สร้าง Mobile Application เชื่อมต่อ Backend API และแผนที่ Leaflet ใน 1 วัน เหมาะสำหรับผู้เริ่มต้น',
          image_url: null,
          latitude: 17.80628,
          longitude: 102.74606,
          location_name: 'อาคารบริหาร มข. วิทยาเขตหนองคาย (ห้องปฏิบัติการคอม 2)',
          event_date: tomorrow,
          status: 'upcoming',
        },
        {
          category: 'sports',
          title: 'KKU Nong Khai Badminton Tournament 2026',
          description: 'การแข่งขันแบดมินตันกระชับมิตรระหว่างสาขาวิชา ชิงถ้วยรางวัลและของที่ระลึก ลงทะเบียนได้ทั้งประเภทเดี่ยวและคู่',
          image_url: null,
          latitude: 17.80785,
          longitude: 102.74651,
          location_name: 'สนามกีฬา 10 ปี วนค.',
          event_date: inThreeDays,
          status: 'upcoming',
        },
        {
          category: 'volunteer',
          title: 'จิตอาสาพัฒนาภูมิทัศน์และเรียนรู้นิเวศวิทยาทางน้ำ',
          description: 'กิจกรรมเก็บชั่วโมงจิตอาสา กยศ. ร่วมทำความสะอาดและดูแลพื้นที่แหล่งเรียนรู้รอบพิพิธภัณฑ์สัตว์น้ำ มข. หนองคาย',
          image_url: null,
          latitude: 17.80917,
          longitude: 102.74620,
          location_name: 'พิพิธภัณฑ์สัตว์น้ำ มข. หนองคาย',
          event_date: tomorrow,
          status: 'upcoming',
        },
      ];

      for (const ev of demoEvents) {
        const ins = await appClient.query(
          `INSERT INTO events (user_id, category, title, description, image_url, latitude, longitude, location_name, event_date, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id`,
          [
            demoUserId,
            ev.category,
            ev.title,
            ev.description,
            ev.image_url,
            ev.latitude,
            ev.longitude,
            ev.location_name,
            ev.event_date.toISOString(),
            ev.status,
          ]
        );

        // Register demo user to the first event
        if (ev.category === 'academic') {
          await appClient.query(
            `INSERT INTO event_registrations (event_id, user_id) VALUES ($1, $2)`,
            [ins.rows[0].id, demoUserId]
          );
        }
      }
      console.log('Seeded demo events successfully.');
    }

    console.log('Database initialization completed successfully!');
  } catch (error) {
    console.error('Error migrating/seeding database:', error);
  } finally {
    await appClient.end();
  }
}

initDatabase();
