<div align="center">

# 🛡️ CBT Secure — Anti-Cheating Examination System

<img src="https://img.shields.io/badge/Status-Active-22c55e?style=for-the-badge&logo=checkmarx&logoColor=white"/>
<img src="https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=node.js&logoColor=white"/>
<img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black"/>
<img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white"/>
<img src="https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white"/>

<br/>
<img src="https://img.shields.io/badge/AI_Engine-Random_Forest-FF6B35?style=for-the-badge&logo=scikit-learn&logoColor=white"/>
<img src="https://img.shields.io/badge/Security-JWT_+_Bcrypt-ef4444?style=for-the-badge&logo=jsonwebtokens&logoColor=white"/>
<img src="https://img.shields.io/badge/License-MIT-a855f7?style=for-the-badge"/>

<br/><br/>

> **Sistem Ujian Online Berbasis Komputer dengan Deteksi Kecurangan Real-Time menggunakan Machine Learning (Random Forest)**

<br/>

```
  ██████╗ ██████╗ ████████╗    ███████╗███████╗ ██████╗██╗   ██╗██████╗ ███████╗
 ██╔════╝██╔══██╗╚══██╔══╝    ██╔════╝██╔════╝██╔════╝██║   ██║██╔══██╗██╔════╝
 ██║     ██████╔╝   ██║       ███████╗█████╗  ██║     ██║   ██║██████╔╝█████╗  
 ██║     ██╔══██╗   ██║       ╚════██║██╔══╝  ██║     ██║   ██║██╔══██╗██╔══╝  
 ╚██████╗██████╔╝   ██║       ███████║███████╗╚██████╗╚██████╔╝██║  ██║███████╗
  ╚═════╝╚═════╝    ╚═╝       ╚══════╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝
```

</div>

---

## 🌟 Fitur Unggulan

<table>
<tr>
<td width="50%">

### 🤖 AI-Powered Detection
- **Random Forest** dengan **12 fitur behavioural**
- Akurasi deteksi kecurangan **> 90%**
- Skor kepercayaan real-time (0.0 – 1.0)
- Blending RF + Rule-based untuk robustness

</td>
<td width="50%">

### 🔐 Multi-Layer Security
- **JWT** Authentication + **bcrypt** hashing
- Rate limiting & Helmet.js protection
- RBAC: Admin | Teacher | Student
- Auto-terminate sesi saat kecurangan kritis

</td>
</tr>
<tr>
<td width="50%">

### 📱 PC & Mobile Anti-Cheat
- Deteksi **PrintScreen** & **Snipping Tool**
- Block **DevTools** (F12, Ctrl+Shift+I/J/C)
- **Fullscreen enforcement** wajib
- Deteksi **screenshot iOS** (visibilitychange pattern)
- Block **screen sharing** via WebRTC
- **Multi-touch** suspicious detection (mobile)

</td>
<td width="50%">

### 📊 Admin Dashboard
- Live monitoring real-time (auto-refresh 3 detik)
- 4 tab: Monitor | Pengguna | Ujian | Sistem
- Export Excel (peserta, sesi, violations + RF scores)
- Import massal peserta dari Excel
- Evidence viewer per sesi

</td>
</tr>
</table>

---

## 🧠 Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER CLIENT                          │
│                                                                 │
│   ┌─────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│   │  Admin      │    │  Teacher     │    │  Student         │  │
│   │  Dashboard  │    │  Dashboard   │    │  Exam Screen     │  │
│   │  (React)    │    │  (React)     │    │  + Anti-Cheat    │  │
│   └──────┬──────┘    └──────┬───────┘    └────────┬─────────┘  │
└──────────┼─────────────────┼──────────────────────┼────────────┘
           │                 │                      │
           ▼                 ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NODE.JS EXPRESS BACKEND                      │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐   │
│  │   Auth   │  │  Exam    │  │  Log     │  │   Excel       │   │
│  │  (JWT)   │  │  CRUD    │  │ /submit  │  │  Import/Export│   │
│  └──────────┘  └──────────┘  └────┬─────┘  └───────────────┘   │
│                                   │                             │
│                          ┌────────▼────────┐                    │
│                          │  Feature Vector │                    │
│                          │  Builder (12D)  │                    │
│                          └────────┬────────┘                    │
└───────────────────────────────────┼────────────────────────────┘
                                    │ spawn
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PYTHON ML ENGINE                           │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  ml_bridge.py                                           │   │
│   │                                                         │   │
│   │  Feature Vector (12D) ──► Random Forest ──► Score      │   │
│   │                                                         │   │
│   │  Blending: 70% RF + 30% Rule-Based                     │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                        MySQL DATABASE                           │
│                                                                 │
│  Users  ←→  Exams  ←→  Sessions  ←→  EventLogs                 │
│                                   ↓              ↓             │
│                            RuleViolations    RFModelResults     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 12 Fitur Deteksi AI

| # | Fitur | Deskripsi | Bobot |
|---|-------|-----------|-------|
| 1 | `blur_count` | Berpindah tab / kehilangan fokus | ⭐⭐⭐ |
| 2 | `hidden_count` | Halaman disembunyikan (backgrounded) | ⭐⭐⭐ |
| 3 | `forbidden_key_count` | Tombol terlarang ditekan | ⭐⭐⭐ |
| 4 | `context_menu_count` | Klik kanan dilakukan | ⭐⭐ |
| 5 | `screenshot_attempt` | 🔴 PrintScreen / Snipping Tool | ⭐⭐⭐⭐⭐ |
| 6 | `devtools_open` | 🔴 Developer Tools dibuka | ⭐⭐⭐⭐⭐ |
| 7 | `copy_attempt` | Copy/Cut pada teks soal | ⭐⭐⭐ |
| 8 | `screen_share_detect` | 🔴 Screen sharing aktif | ⭐⭐⭐⭐⭐ |
| 9 | `window_resize_extreme` | Resize ekstrem (indikasi DevTools) | ⭐⭐⭐⭐ |
| 10 | `multi_touch_suspic` | Multi-touch mencurigakan (mobile) | ⭐⭐⭐ |
| 11 | `tab_switch_rapid` | Berpindah tab sangat cepat < 2 detik | ⭐⭐⭐⭐ |
| 12 | `fullscreen_exit` | Keluar dari mode layar penuh | ⭐⭐⭐ |

> 🔴 = **CRITICAL** — menyebabkan auto-terminate sesi

---

## 🚀 Cara Menjalankan

### Prasyarat

```bash
# Pastikan sudah terinstall:
Node.js >= 18.x
Python >= 3.10
MySQL 8.x
Laragon (Windows) / XAMPP
```

### 1️⃣ Clone Repository

```bash
git clone https://github.com/fmustaghfirullah/skripsi.git
cd skripsi
```

### 2️⃣ Setup Backend (Node.js)

```bash
cd backend

# Copy environment
cp .env.example .env
# Edit .env sesuai konfigurasi database Anda

# Install dependencies
npm install

# Jalankan server
npm run dev
```

**Isi `.env`:**
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=db_skripsi
JWT_SECRET=your-super-secret-key-here
FRONTEND_URL=http://localhost:5173
```

### 3️⃣ Setup Frontend (React)

```bash
cd frontend

# Install dependencies
npm install

# Jalankan dev server
npm run dev
```

### 4️⃣ Setup Python ML Engine

```bash
# Di root folder project
pip install scikit-learn pandas numpy joblib

# Train model Random Forest
python train_model.py
# ✅ Akan generate: backend/model.joblib
```

### 5️⃣ Buat Database

```sql
CREATE DATABASE db_skripsi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
> Database tables akan dibuat otomatis saat backend pertama kali dijalankan (Sequelize sync).

---

## 🗂️ Struktur Proyek

```
skripsi/
│
├── 📁 backend/                 # Node.js Express API
│   ├── server.js               # Main server (1300+ baris)
│   ├── models.js               # Sequelize ORM models
│   ├── ml_bridge.py            # Python RF inference bridge
│   ├── model.joblib            # Trained RF model (generated)
│   └── package.json
│
├── 📁 frontend/                # React + Vite
│   └── src/
│       ├── components/
│       │   ├── Exam.jsx        # Halaman ujian + anti-cheat engine
│       │   ├── Dashboard.jsx   # Admin superadmin dashboard
│       │   ├── TeacherDashboard.jsx
│       │   ├── StudentDashboard.jsx
│       │   ├── Login.jsx
│       │   └── EvidenceModal.jsx
│       ├── hooks/
│       │   └── useMonitor.js   # Polling hook
│       └── App.jsx
│
├── 📁 static/
│   └── js/monitor.js           # Legacy anti-cheat script
│
├── train_model.py              # 🤖 RF training script
├── ml_engine.py                # ML engine class
├── requirements.txt
└── Template_Soal_Exam.xlsx     # Template upload soal
```

---

## 👥 Role & Akses

| Role | Akses | Login |
|------|-------|-------|
| 🔴 **Admin** | Full control: kelola user, ujian, monitoring, export | `admin` / `admin` |
| 🟡 **Teacher/Guru** | Upload soal, kelola ujian, lihat soal | `guru` / `guru` |
| 🟢 **Student** | Ikut ujian (setelah didaftarkan admin) | NIM / NIM |

---

## 🛡️ Perlindungan Anti-Cheat

### PC (Desktop)
| Ancaman | Status |
|---------|--------|
| PrintScreen | ✅ Terdeteksi & dicatat |
| Snipping Tool (Win+Shift+S) | ✅ Terdeteksi |
| DevTools F12 | ✅ Diblokir & dicatat |
| Ctrl+Shift+I/J/C | ✅ Diblokir |
| Ctrl+C / Ctrl+V | ✅ Diblokir |
| Ctrl+U (View Source) | ✅ Diblokir |
| Klik Kanan | ✅ Diblokir |
| Alt+Tab | ✅ Terdeteksi |
| Berpindah Tab | ✅ Terdeteksi |
| Screen Sharing | ✅ Terdeteksi |
| Fullscreen Exit | ✅ Terdeteksi + Re-enforce |
| DevTools via Resize | ✅ Terdeteksi |
| Windows Key | ✅ Diblokir |
| Text Selection | ✅ Dinonaktifkan |

### Mobile (iOS / Android)
| Ancaman | Status |
|---------|--------|
| Screenshot iOS (Power+Volume) | ✅ Pattern terdeteksi |
| App Backgrounded | ✅ Terdeteksi |
| Multi-touch Suspicious | ✅ Terdeteksi |
| Screen Recording | ✅ Terdeteksi |
| Pinch-to-Zoom | ✅ Diblokir |
| Orientasi Berubah | ✅ Dicatat |
| Tab Switching Browser | ✅ Terdeteksi |

---

## 📤 Format Excel Upload Soal

```
┌──────────────────────────────┬──────────┬──────────┬──────────┬──────────┬───────────────┐
│ question                     │ option_0 │ option_1 │ option_2 │ option_3 │ correct_index │
├──────────────────────────────┼──────────┼──────────┼──────────┼──────────┼───────────────┤
│ Apa ibukota Indonesia?       │ Jakarta  │ Bandung  │ Surabaya │ Medan    │ 0             │
│ Siapa penemu lampu pijar?    │ Einstein │ Tesla    │ Edison   │ Newton   │ 2             │
│ Berapa hasil 5 x 7?          │ 25       │ 30       │ 35       │ 40       │ 2             │
└──────────────────────────────┴──────────┴──────────┴──────────┴──────────┴───────────────┘
```

**Catatan:**
- `correct_index` boleh menggunakan angka `0-3` atau huruf `A-D`
- Header kolom bisa bervariasi: `soal`, `pertanyaan`, `pilihan_a`, `jawaban`, `kunci`, dll
- Maksimal **300 soal** per upload
- Format: `.xlsx` atau `.xls`

---

## 📊 API Endpoints

### 🔓 Public
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/login` | Login (rate limited 20x/15 menit) |
| `GET` | `/api/admin/download-template` | Download template Excel soal |

### 👨‍🎓 Student (JWT Required)
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/api/exams` | Daftar ujian (hanya yang aktif) |
| `POST` | `/api/start-exam` | Mulai sesi ujian |
| `GET` | `/api/questions?exam_id=X` | Ambil soal (tanpa kunci jawaban) |
| `POST` | `/api/submit-exam` | Kumpulkan jawaban |
| `POST` | `/api/submit-log` | Kirim log aktivitas + RF inference |
| `GET` | `/api/check-status/:id` | Cek status & sisa waktu sesi |

### 👨‍🏫 Teacher / Admin
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET/POST/PUT/DELETE` | `/api/exams` | CRUD ujian |
| `POST` | `/api/admin/upload-questions` | Upload soal dari Excel |
| `GET` | `/api/admin/questions/:exam_id` | Lihat soal (dengan kunci) |
| `POST` | `/api/admin/clear-questions` | Hapus semua soal ujian |

### 🔴 Admin Only
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/api/dashboard` | Live monitoring semua peserta |
| `GET` | `/api/admin/all-users` | Semua pengguna |
| `POST` | `/api/admin/users` | Buat akun baru |
| `POST` | `/api/admin/students/bulk` | Import massal dari Excel |
| `GET` | `/api/admin/export/students` | Export peserta ke Excel |
| `GET` | `/api/admin/export/sessions` | Export sesi + violations |
| `GET` | `/api/admin/export/violations` | Export RF scores detail |
| `POST` | `/api/admin/terminate` | Hentikan paksa sesi |
| `POST` | `/api/admin/warn` | Kirim peringatan ke peserta |
| `GET` | `/api/admin/evidence/:id` | Lihat bukti pelanggaran |
| `GET` | `/api/admin/stats` | Statistik sistem |
| `GET` | `/api/admin/logs` | Baca server logs |

---

## 🤖 Training Model Random Forest

```bash
python train_model.py
```

Output yang diharapkan:
```
============================================================
  CBT Anti-Cheat — Random Forest Training
============================================================

[1] Generating 3000 synthetic training samples...
     Normal   : 1800 sampel
     Cheating : 1200 sampel

[2] Training RandomForestClassifier (n_estimators=200, max_depth=10)...

[3] Evaluasi pada test set (600 sampel):
     Accuracy : 0.9367 (93.7%)

     Classification Report:
                   precision    recall  f1-score
     Normal            0.94      0.96      0.95
     Cheating          0.93      0.90      0.92

     Top Feature Importances:
       screenshot_attempt        0.1823  █████████
       screen_share_detect       0.1654  ████████
       devtools_open             0.1432  ███████
       forbidden_key_count       0.1201  ██████
       tab_switch_rapid          0.0987  █████
       blur_count                0.0876  ████

[4] Model disimpan ke: backend/model.joblib
```

---

## 🗃️ Database Schema

```
Users
├── user_id (PK)
├── nama_lengkap
├── nim (UNIQUE)
├── role (student|teacher|admin)
├── password_hash
├── is_registered
└── max_attempts

Exams
├── exam_id (PK)
├── subject_name
├── duration_minutes
└── is_active

ExamEnrollments
├── enrollment_id (PK)
├── user_id (FK)
├── exam_id (FK)
├── max_attempts
└── attempts_used

SessionMonitorings
├── session_id (PK)
├── user_id (FK)
├── exam_id (FK)
├── status (ACTIVE|COMPLETED|TERMINATED)
├── score
├── screenshot_count ← NEW
├── devtools_count   ← NEW
├── blur_count       ← NEW
└── start_time

EventLogs
├── log_id (PK)
├── session_id (FK)
├── activity_type
├── details
├── device_type (PC|MOBILE|UNKNOWN) ← NEW
└── features_json ← NEW (12D vector)

RuleViolations
├── violation_id (PK)
├── log_id (FK)
├── rule_code
└── severity (LOW|MEDIUM|HIGH|CRITICAL) ← NEW

RFModelResults
├── rf_id (PK)
├── log_id (FK)
├── conf_score (0.0 - 1.0)
└── is_cheating (boolean) ← NEW
```

---

## 🔑 Threshold Deteksi

| Skor RF | Status | Aksi |
|---------|--------|------|
| 0.00 – 0.30 | 🟢 **SAFE** | Tidak ada tindakan |
| 0.30 – 0.60 | 🟡 **SUSPICIOUS** | Dicatat, admin diberitahu |
| 0.60 – 1.00 | 🔴 **CRITICAL** | Peringatan, risiko terminate |
| Screenshot (1x) | 🚨 **CRITICAL** | Warning overlay + log |
| Screenshot (2x) | 💀 **AUTO-TERMINATE** | Sesi dihentikan otomatis |
| Screen Share | 💀 **AUTO-TERMINATE** | Sesi dihentikan otomatis |
| DevTools (3x) | 💀 **AUTO-TERMINATE** | Sesi dihentikan otomatis |

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Teknologi |
|-------|-----------|
| **Frontend** | React 18, Vite, Framer Motion, Axios, Lucide Icons |
| **Backend** | Node.js, Express.js, Sequelize ORM |
| **Database** | MySQL 8.x |
| **AI/ML** | Python, Scikit-learn (RandomForestClassifier), Joblib |
| **Security** | JWT, bcrypt, Helmet.js, Express Rate Limit |
| **Export** | SheetJS (xlsx) |
| **Auth** | Role-Based Access Control (RBAC) |

</div>

---

## 📸 Screenshots

> *Jalankan aplikasi dan buka `http://localhost:5173` untuk melihat tampilan*

| Halaman | Deskripsi |
|---------|-----------|
| Login | Form login dengan validasi role otomatis |
| Student Dashboard | Daftar ujian yang tersedia & status pendaftaran |
| Exam Screen | Halaman ujian dengan anti-cheat aktif + timer |
| Admin Monitor | Live monitoring risiko semua peserta |
| Admin Users | Manajemen pengguna dengan import Excel |
| Admin Ujian | Upload soal, kelola ujian |
| Evidence Modal | Detail log aktivitas + RF score per sesi |

---

## 🚨 Catatan Keamanan

> ⚠️ **Sebelum Production:**
> - Ganti `JWT_SECRET` dengan string acak yang kuat (min 64 karakter)
> - Set `FRONTEND_URL` sesuai domain deploy Anda
> - Aktifkan HTTPS
> - Ubah password default `admin` dan `guru`
> - Pastikan `model.joblib` sudah di-generate via `python train_model.py`

---

## 📝 Lisensi

MIT License — Dibuat untuk keperluan **Skripsi** penelitian sistem ujian online berbasis AI.

---

<div align="center">

**Dikembangkan oleh [fmustaghfirullah](https://github.com/fmustaghfirullah)**

⭐ Jangan lupa beri **Star** jika project ini membantu!

</div>
