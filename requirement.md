# Project: KKU Campus Event Activity Mobile Application (มข. วิทยาเขตหนองคาย)

## 1. ข้อมูลภาพรวมของโปรเจกต์ (Project Overview)

แอปพลิเคชันมือถือสำหรับ **ค้นหา ประชาสัมพันธ์ และแจ้งเตือนกิจกรรมภายในมหาวิทยาลัยขอนแก่น วิทยาเขตหนองคาย (KKU Campus Event Activity)** พัฒนาด้วย **React Native**, **Expo Router** และ **Node.js (Express + TypeScript + PostgreSQL)**

### วัตถุประสงค์หลักของระบบ:
1. **ประชาสัมพันธ์กิจกรรม:** นักศึกษาหรือสโมสร/ชมรมสามารถสร้างและเผยแพร่กิจกรรมใหม่ (วิชาการ, กีฬา, อบรม/เวิร์กช็อป, บำเพ็ญประโยชน์ ฯลฯ)
2. **ค้นหาและกรองกิจกรรม:** ค้นหากิจกรรมตามชื่อ สถานที่จัด หรือหมวดหมู่กิจกรรม
3. **ลงทะเบียนเข้าร่วมกิจกรรม (RSVP):** บันทึกการเข้าร่วมกิจกรรมเพื่อติดตามสถานะและรับการแจ้งเตือน
4. **แผนที่พิกัดสถานที่จัดงาน:** แสดงหมุดกิจกรรมบนแผนที่วิทยาเขตหนองคาย (OpenStreetMap ผ่าน Leaflet) พร้อมพิกัดอาคารจริง
5. **ระบบแจ้งเตือน (Notifications System):** แจ้งเตือนเมื่อลงทะเบียนสำเร็จ และส่ง Notification ก่อนเริ่มกิจกรรม
6. **รองรับโหมดออฟไลน์ (Offline-first & Caching):** บันทึกแคชกิจกรรมและแบบร่าง (Draft) ลงเครื่องอัตโนมัติ

โปรเจกต์นี้เป็นการบูรณาการองค์ความรู้ตลอด 11 สัปดาห์ของวิชา Mobile Development เข้าด้วยกันเป็นแอปพลิเคชันที่ใช้งานได้จริง

---

## 2. หมวดหมู่กิจกรรมและสถานะ (Categories & Status)

### หมวดหมู่กิจกรรม (Categories)
* `academic` - วิชาการ / ติวเข้ม / บรรยายพิเศษ
* `workshop` - อบรมเชิงปฏิบัติการ / เวิร์กช็อป
* `sports` - กีฬา / การแข่งขัน
* `volunteer` - จิตอาสา / บำเพ็ญประโยชน์
* `club` - ชมรม / ชุมนุม
* `general` - กิจกรรมทั่วไป

### สถานะของกิจกรรม (Status)
* `upcoming` - กำลังจะจัดขึ้น (เปิดให้ลงทะเบียน)
* `ongoing` - กำลังดำเนินกิจกรรม
* `completed` - สิ้นสุดกิจกรรมแล้ว
* `cancelled` - ยกเลิกกิจกรรม

---

## 3. Flow การทำงานของผู้ใช้งาน (User Flow)

### 1. เข้าสู่ระบบ / สมัครสมาชิก (Authentication)
* ผู้ใช้สามารถลงทะเบียน (Register) หรือเข้าสู่ระบบ (Login) ด้วยอีเมลนักศึกษา
* มีปุ่มทางลัดสำหรับทดสอบระบบ (Demo User: `student@kku.ac.th` / `123456`)
* มีเมนูตั้งค่า IP ของ Backend API ได้โดยตรงผ่านหน้าจอ ไม่ต้องแก้ไขโค้ด

### 2. หน้าหลัก (Home Feed)
* แสดงรายการกิจกรรมทั้งหมด เรียงตามวันเวลาที่จัด
* มีช่องค้นหาตามคำสำคัญ (Search Bar)
* มีแถบตัวกรองหมวดหมู่ (Category Filter Chips)
* แสดงจำนวนผู้ลงทะเบียน (Participant count) และสถานะกิจกรรม

### 3. แผนที่วิทยาเขต (Interactive Campus Map)
* แสดงแผนที่มหาวิทยาลัยขอนแก่น วิทยาเขตหนองคาย
* ปักหมุดกิจกรรมตามจุดจัดงานจริง เช่น อาคารบริหาร, ศูนย์อาหารคอมเพล็กซ์, อาคารเรียนรวม, สนามกีฬา 10 ปี
* แตะหมุดเพื่อดูข้อมูลสรุปและแตะเพื่อไปหน้ารายละเอียด

### 4. สร้างกิจกรรมใหม่ (Create Event)
* ฟอร์มระบุชื่อกิจกรรม, หมวดหมู่, วันเวลาจัดงาน, สถานที่
* เลือกพิกัดบนแผนที่ หรือเลือกจากจุดสำคัญใน มข. หนองคาย
* แนบภาพกิจกรรมจากคลังภาพหรือถ่ายภาพด้วยกล้องมือถือ (`expo-image-picker`)
* บันทึกแบบร่าง (Draft) อัตโนมัติ ป้องกันข้อมูลสูญหาย

### 5. ข้อมูลส่วนตัวและการแจ้งเตือน (Profile & Notifications)
* สถิติจำนวนกิจกรรมของฉัน, กิจกรรมที่ลงทะเบียนไว้, กิจกรรมที่เข้าร่วมสำเร็จ
* แท็บสลับดู: กิจกรรมที่ลงทะเบียนไว้, กิจกรรมที่ฉันสร้าง, รายการที่ถูกใจ (Favorites)
* กล่องข้อความแจ้งเตือน (Notification Inbox)
* เมนูทดสอบระบบแจ้งเตือนแบบนับถอยหลัง (Test Countdown Notification)

---

## 4. โครงสร้างฐานข้อมูล (Database Schema)

* **users:** `id`, `username`, `email`, `password_hash`, `created_at`
* **events:** `id`, `user_id`, `category`, `title`, `description`, `image_url`, `latitude`, `longitude`, `location_name`, `event_date`, `status`, `created_at`, `updated_at`
* **event_registrations:** `id`, `event_id`, `user_id`, `reminded_at`, `created_at`
* **notifications:** `id`, `user_id`, `event_id`, `title`, `message`, `is_read`, `created_at`

---

## 5. การบูรณาการ 11 สัปดาห์ (Course Alignment)

1. **Week 1-3:** Component Design, Responsive UI, StatusBadge, EventCard, CampusMap
2. **Week 4:** Expo Router File-based Navigation (Tabs & Stack)
3. **Week 5:** Form State Handling & Validation
4. **Week 6:** Networking ด้วย Axios, Interceptors และ JWT Headers
5. **Week 7:** AsyncStorage สำหรับ Offline Cache & Form Auto-Draft
6. **Week 8:** JWT Authentication (Login, Register, Token Management)
7. **Week 9:** Camera & Image Picker
8. **Week 10:** GPS Location & Interactive OpenStreetMap WebView
9. **Week 11:** Scheduled Reminders & Push/In-App Notification
