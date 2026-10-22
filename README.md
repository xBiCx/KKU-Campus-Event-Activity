# KKU Campus Event Activity Mobile Application (KKU Nong Khai)

แอปพลิเคชันค้นหาและประชาสัมพันธ์กิจกรรมในมหาวิทยาลัยขอนแก่น วิทยาเขตหนองคาย (Mobile Development Project)

---

## 🚀 วิธีการรันโปรเจกต์ (Quick Start)

### 1. ฝั่ง Backend API (Node.js + PostgreSQL)
Backend API ทำหน้าที่จัดการฐานข้อมูล REST API และการอัปโหลดรูปภาพ
```bash
cd backend
npm install
npm run seed     # สคริปต์สร้างฐานข้อมูล campus_lost_found และ Seed ข้อมูลตัวอย่าง มข. หนองคาย
npm run dev      # เริ่มรันเซิร์ฟเวอร์แบบ watch mode (Port 5000)
```
* **Local URL:** `http://localhost:5000/api`
* **Network URL:** `http://192.168.1.17:5000/api`

---

### 2. ฝั่ง Mobile App (Expo Go บนโทรศัพท์จริง)
```bash
cd mobile
npm install
npx expo start
```
1. เปิดแอป **Expo Go** บนโทรศัพท์มือถือ (Android หรือ iOS)
2. เชื่อมต่อ Wi-Fi เดียวกันกับเครื่องคอมพิวเตอร์
3. สแกน **QR Code** จาก Terminal เพื่อเปิดแอปใน Expo Go

> **หมายเหตุการเชื่อมต่อ:**
> หาก IP เครื่องคอมพิวเตอร์เปลี่ยน สามารถแตะปุ่ม **"ตั้งค่า IP Backend"** ในหน้าเข้าสู่ระบบหรือหน้าโปรไฟล์ เพื่อเปลี่ยน IP ให้ตรงกับ Wi-Fi ได้ทันทีโดยไม่ต้องแก้โค้ด

---

## 📱 บัญชีผู้ใช้สำหรับทดสอบ (Demo Account)
* **Email:** `student@kku.ac.th`
* **Password:** `123456`
*(หรือกดปุ่ม "กรอกบัญชีทดสอบ" ในหน้าเข้าสู่ระบบได้ทันที)*

---

## 🏛️ จุดพิกัดสำคัญใน มข. วิทยาเขตหนองคาย (อิงข้อมูล OpenStreetMap จริง)
* **อาคารบริหาร มข. วิทยาเขตหนองคาย:** `17.80580, 102.74700`
* **โรงอาหาร Complex (compak nkc):** `17.79924, 102.74786`
* **อาคารเรียนรวม (และ Kshop):** `17.80322, 102.74806`
* **หอพักนักศึกษา:** `17.80050, 102.74620`
* **สนามกีฬา 10 ปี วนค.:** `17.79403, 102.74859`
* **ลานจอดรถ อาคารเรียนรวม:** `17.80280, 102.74740`
* **ศูนย์กลางแผนที่วิทยาเขต:** `17.80250, 102.74780`

---

## 🛠️ รายละเอียดเทคโนโลยีตาม 11 สัปดาห์
1. **Week 1-3:** React Native, Expo, Components (ItemCard, StatusBadge, CampusMap), Responsive UI
2. **Week 4:** Expo Router (Tabs & Stack Navigation)
3. **Week 5:** Form State Management & Validation
4. **Week 6:** REST API Networking ด้วย Axios (Interceptors & JWT Auth Header)
5. **Week 7:** Local Storage & Offline Mode (`@react-native-async-storage/async-storage`) รองรับแคชและบันทึกแบบร่าง (Draft)
6. **Week 8:** JWT Authentication (Register, Login, Me, Token Expiration)
7. **Week 9:** Camera & Image Picker (`expo-image-picker`)
8. **Week 10:** GPS Location & OpenStreetMap Leaflet WebView (`expo-location`, `react-native-webview`)
9. **Week 11:** Notifications System
