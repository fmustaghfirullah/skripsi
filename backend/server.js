import express    from 'express';
import cors       from 'cors';
import dotenv     from 'dotenv';
import helmet     from 'helmet';
import rateLimit  from 'express-rate-limit';
import bcrypt     from 'bcryptjs';
import jwt        from 'jsonwebtoken';
import multer     from 'multer';
import * as xlsx  from 'xlsx';
import { spawn }  from 'child_process';
import fs         from 'fs';
import path       from 'path';
import { fileURLToPath } from 'url';
import sequelize, {
    User, Exam, ExamEnrollment, SessionMonitoring,
    EventLog, RuleViolation, RFModelResult, Question
} from './models.js';

dotenv.config();

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const app        = express();
const PORT       = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'cbt-fallback-secret-change-in-production';

// ============================================================
// LOGGING SYSTEM
// ============================================================
const LOG_DIR  = path.join(__dirname, 'logs');
const LOG_FILE = path.join(LOG_DIR, `server-${new Date().toISOString().slice(0, 10)}.log`);
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

const log = (level, tag, message, extra = '') => {
    const ts   = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const line = `[${ts}] [${level.padEnd(5)}] [${tag.padEnd(14)}] ${message} ${extra}\n`;
    process.stdout.write(line);
    logStream.write(line);
};

const requestLogger = (req, res, next) => {
    const start = Date.now();
    const ip    = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '-').split(',')[0].trim();
    log('INFO', 'REQUEST', `${req.method} ${req.path}`, `| IP: ${ip}`);
    if (req.path === '/api/login' && req.body?.nim) {
        log('INFO', 'LOGIN', `Upaya login NIM: "${req.body.nim}"`, `| IP: ${ip}`);
    }
    const origJson = res.json.bind(res);
    res.json = (body) => {
        const ms    = Date.now() - start;
        const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO';
        log(level, 'RESPONSE', `${req.method} ${req.path} → ${res.statusCode}`, `| ${ms}ms`);
        if (res.statusCode >= 400 && body?.error) log('WARN', 'DETAIL', body.error);
        return origJson(body);
    };
    next();
};

// ============================================================
// SECURITY MIDDLEWARE
// ============================================================
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);

const PROTECTED_NIMS = ['admin', 'guru'];

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => PROTECTED_NIMS.includes(String(req.body?.nim || '').toLowerCase()),
    message: { error: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' },
});

// Log endpoint rate limiter (anti-spam dari client)
const logLimiter = rateLimit({
    windowMs: 1000,  // 1 detik
    max: 10,         // maks 10 log per detik per IP
    standardHeaders: false,
    legacyHeaders: false,
    message: { error: 'Log rate limit exceeded' },
});

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const ext = file.originalname.split('.').pop().toLowerCase();
        if (['xlsx', 'xls'].includes(ext)) cb(null, true);
        else cb(new Error('Hanya file Excel (.xlsx/.xls) yang diizinkan'));
    },
});

// ============================================================
// AUTH MIDDLEWARE
// ============================================================
const verifyToken = (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token tidak ditemukan. Silakan login.' });
    }
    try {
        req.user = jwt.verify(auth.split(' ')[1], JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: 'Token tidak valid atau sudah kadaluarsa.' });
    }
};

const requireRole = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
        return res.status(403).json({ error: 'Akses ditolak. Anda tidak memiliki hak akses.' });
    }
    next();
};

const requireAdmin   = [verifyToken, requireRole('admin')];
const requireTeacher = [verifyToken, requireRole('admin', 'teacher')];
const requireStudent = [verifyToken, requireRole('student')];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/** Sanitasi input string — cegah XSS & injection */
const sanitize = (str, maxLen = 1000) => {
    if (typeof str !== 'string') return '';
    return str.trim().replace(/<[^>]*>/g, '').substring(0, maxLen);
};

/** Deteksi device type dari User-Agent */
const detectDevice = (ua = '') => {
    const mobile = /android|iphone|ipad|ipod|mobile|tablet/i.test(ua);
    return mobile ? 'MOBILE' : 'PC';
};

/**
 * Bangun feature vector dari session monitoring + event log.
 * Digunakan untuk inferensi RF.
 */
const buildFeatureVector = async (session_id) => {
    const session = await SessionMonitoring.findByPk(session_id);
    if (!session) return null;

    const logs = await EventLog.findAll({ where: { session_id } });

    const counts = {
        blur_count: 0, hidden_count: 0, forbidden_key_count: 0,
        context_menu_count: 0, screenshot_attempt: 0, devtools_open: 0,
        copy_attempt: 0, screen_share_detect: 0, window_resize_extreme: 0,
        multi_touch_suspic: 0, tab_switch_rapid: 0, fullscreen_exit: 0,
    };

    let lastHiddenTime = null;

    for (const ev of logs) {
        const at = ev.activity_type;
        if (at === 'blur')               counts.blur_count++;
        if (at === 'visibility_hidden')  counts.hidden_count++;
        if (at === 'forbidden_key')      counts.forbidden_key_count++;
        if (at === 'context_menu')       counts.context_menu_count++;
        if (at === 'screenshot_attempt') counts.screenshot_attempt++;
        if (at === 'devtools_open')      counts.devtools_open++;
        if (at === 'copy_attempt')       counts.copy_attempt++;
        if (at === 'screen_share')       counts.screen_share_detect++;
        if (at === 'window_resize_extreme') counts.window_resize_extreme++;
        if (at === 'multi_touch')        counts.multi_touch_suspic++;
        if (at === 'fullscreen_exit')    counts.fullscreen_exit++;

        // Deteksi tab_switch_rapid: visibilitychange < 2 detik setelah hidden
        if (at === 'visibility_hidden') lastHiddenTime = new Date(ev.createdAt);
        if (at === 'blur' && lastHiddenTime) {
            const diff = (new Date(ev.createdAt) - lastHiddenTime) / 1000;
            if (diff < 2) counts.tab_switch_rapid++;
        }
    }

    // Override dengan counter yang sudah di-accumulate di session
    if (session.screenshot_count > counts.screenshot_attempt) {
        counts.screenshot_attempt = session.screenshot_count;
    }

    return counts;
};

/**
 * Panggil Python ML bridge untuk prediksi cheating.
 * Menerima feature vector JSON.
 */
const predictCheating = (features) =>
    new Promise((resolve) => {
        const featureJson = JSON.stringify(features || {});
        const py = spawn('python', [
            path.join(__dirname, 'ml_bridge.py'),
            featureJson
        ]);
        let out = '';
        py.stdout.on('data', d => { out += d.toString(); });
        py.on('close', () => {
            const score = parseFloat(out.trim());
            resolve(isNaN(score) ? 0.15 : Math.min(1, Math.max(0, score)));
        });
        py.on('error', () => resolve(0.15));
    });

// ============================================================
// AUTH ROUTES
// ============================================================

app.post('/api/login', loginLimiter, async (req, res) => {
    const nim      = sanitize(String(req.body.nim || ''), 50);
    const password = String(req.body.password || '');
    if (!nim) return res.status(400).json({ error: 'NIM diperlukan' });

    const isSpecial = ['admin', 'guru'].includes(nim.toLowerCase());

    try {
        let user = await User.findOne({ where: { nim } });
        log('INFO', 'LOGIN', `User found: ${user ? 'YES' : 'NO'}`, `| NIM: ${nim}`);

        if (!user && isSpecial) {
            const hash = await bcrypt.hash(nim, 10);
            user = await User.create({
                nama_lengkap:  nim === 'admin' ? 'Administrator' : 'Guru/Pengajar',
                nim,
                role:          nim === 'admin' ? 'admin' : 'teacher',
                is_registered: true,
                password_hash: hash,
                max_attempts:  99,
            });
        }

        if (!user) {
            return res.status(401).json({ error: 'NIM tidak terdaftar. Hubungi admin untuk pendaftaran.' });
        }

        if (isSpecial) {
            const repairs = {};
            if (!user.is_registered)  repairs.is_registered = true;
            if (!user.password_hash)  repairs.password_hash = await bcrypt.hash(nim, 10);
            if (!user.max_attempts || user.max_attempts < 10) repairs.max_attempts = 99;
            if (user.role !== (nim === 'admin' ? 'admin' : 'teacher')) {
                repairs.role = nim === 'admin' ? 'admin' : 'teacher';
            }
            if (Object.keys(repairs).length > 0) {
                await user.update(repairs); await user.reload();
            }
        }

        if (!isSpecial && !user.is_registered) {
            return res.status(401).json({ error: 'Akun Anda belum diaktifkan oleh admin.' });
        }

        const pwToCheck = password || nim;
        if (user.password_hash) {
            const valid = await bcrypt.compare(pwToCheck, user.password_hash);
            if (!valid) return res.status(401).json({ error: 'Password salah.' });
        } else if (!isSpecial) {
            return res.status(401).json({ error: 'Akun tidak memiliki password. Hubungi admin.' });
        }

        const token = jwt.sign(
            { user_id: user.user_id, nim: user.nim, role: user.role },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        const { password_hash, ...safeUser } = user.toJSON();
        log('INFO', 'LOGIN', `Login BERHASIL: ${nim}`, `| role: ${user.role}`);
        res.json({ user: safeUser, token });

    } catch (err) {
        log('ERROR', 'LOGIN', `Exception: ${err.message}`);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================================
// ADMIN — MANAJEMEN PESERTA
// ============================================================

app.get('/api/admin/students', ...requireAdmin, async (req, res) => {
    try {
        const students = await User.findAll({
            where: { role: 'student' },
            attributes: { exclude: ['password_hash'] },
            include: [{
                model: ExamEnrollment,
                include: [{ model: Exam, attributes: ['exam_id', 'subject_name'] }],
                required: false,
            }],
            order: [['nama_lengkap', 'ASC']],
        });
        res.json(students);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/students', ...requireAdmin, async (req, res) => {
    const nama_lengkap = sanitize(req.body.nama_lengkap || '', 255);
    const nim          = sanitize(req.body.nim || '', 50);
    const max_attempts = Math.min(10, Math.max(1, parseInt(req.body.max_attempts) || 1));
    const password     = req.body.password || nim;

    if (!nama_lengkap || !nim) return res.status(400).json({ error: 'Nama lengkap dan NIM wajib diisi' });
    if (PROTECTED_NIMS.includes(nim.toLowerCase())) {
        return res.status(403).json({ error: `NIM "${nim}" adalah akun sistem yang dilindungi.` });
    }

    try {
        const existing = await User.findOne({ where: { nim } });
        if (existing) return res.status(409).json({ error: `NIM "${nim}" sudah terdaftar` });

        const password_hash = await bcrypt.hash(password, 10);
        const student = await User.create({ nama_lengkap, nim, role: 'student', is_registered: true, password_hash, max_attempts });
        const { password_hash: _, ...safe } = student.toJSON();
        res.json(safe);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/students/:id', ...requireAdmin, async (req, res) => {
    try {
        const student = await User.findByPk(req.params.id);
        if (!student) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
        if (student.role !== 'student') {
            return res.status(403).json({ error: 'Akun admin/guru bersifat immutable.' });
        }
        const updates = {};
        if (req.body.nama_lengkap) updates.nama_lengkap = sanitize(req.body.nama_lengkap, 255);
        if (req.body.max_attempts !== undefined) {
            const val = parseInt(req.body.max_attempts);
            if (val >= 1 && val <= 20) updates.max_attempts = val;
        }
        if (req.body.is_registered !== undefined) updates.is_registered = Boolean(req.body.is_registered);
        if (req.body.password) updates.password_hash = await bcrypt.hash(req.body.password, 10);
        await student.update(updates);
        const { password_hash, ...safe } = student.toJSON();
        res.json(safe);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/students/:id', ...requireAdmin, async (req, res) => {
    try {
        const student = await User.findByPk(req.params.id);
        if (!student) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
        if (student.role !== 'student') {
            return res.status(403).json({ error: 'Akun admin/guru tidak dapat dihapus.' });
        }
        await student.destroy();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

/**
 * POST /api/admin/students/bulk — Import peserta dari Excel
 * Kolom: nim | nama | max_attempts (optional)
 */
app.post('/api/admin/students/bulk', ...requireAdmin, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'File Excel diperlukan' });

        const wb   = xlsx.read(req.file.buffer, { type: 'buffer', cellText: false, cellDates: true });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(ws, { defval: '', raw: false });

        let created = 0;
        const failed = [];

        for (const row of rows) {
            // Normalisasi key: lowercase, hilangkan spasi & underscore
            const norm = str => String(str).toLowerCase().replace(/[\s_]/g, '');
            const getVal = (...keys) => {
                for (const k of Object.keys(row)) {
                    if (keys.some(target => norm(k) === norm(target))) {
                        return String(row[k]).trim();
                    }
                }
                return '';
            };

            const nim  = sanitize(getVal('nim', 'NIM', 'id', 'ID'), 50);
            const nama = sanitize(getVal('nama', 'name', 'namalengkap', 'nama_lengkap', 'Nama'), 255);

            if (!nim || !nama) {
                failed.push({ data: row, reason: 'Kolom nim / nama tidak ditemukan atau kosong' });
                continue;
            }
            if (PROTECTED_NIMS.includes(nim.toLowerCase())) {
                failed.push({ data: row, reason: `NIM "${nim}" adalah akun sistem yang dilindungi` });
                continue;
            }

            const existing = await User.findOne({ where: { nim } });
            if (existing) {
                failed.push({ data: row, reason: `NIM "${nim}" sudah terdaftar` });
                continue;
            }

            const rawAtt      = getVal('maxattempts', 'max_attempts', 'percobaan', 'attempts');
            const max_attempts = Math.min(10, Math.max(1, parseInt(rawAtt) || 1));
            const password_hash = await bcrypt.hash(nim, 10);

            await User.create({ nama_lengkap: nama, nim, role: 'student', is_registered: true, password_hash, max_attempts });
            created++;
        }

        res.json({ success: true, created, failed });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

/** GET /api/admin/download-student-template */
app.get('/api/admin/download-student-template', ...requireAdmin, (req, res) => {
    const wb   = xlsx.utils.book_new();
    const data = [
        ['nim', 'nama', 'max_attempts'],
        ['20210001', 'Andi Pratama', 1],
        ['20210002', 'Budi Santoso', 2],
        ['20210003', 'Citra Dewi', 1],
    ];
    const ws = xlsx.utils.aoa_to_sheet(data);
    // Set lebar kolom
    ws['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 15 }];
    xlsx.utils.book_append_sheet(wb, ws, 'Template Siswa');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="Template_Import_Siswa.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
});

// ============================================================
// SUPERADMIN — FULL CONTROL ENDPOINTS
// ============================================================

app.get('/api/admin/all-users', ...requireAdmin, async (req, res) => {
    try {
        const where = req.query.role ? { role: req.query.role } : {};
        const users = await User.findAll({
            where,
            attributes: { exclude: ['password_hash'] },
            include: [{
                model: ExamEnrollment,
                include: [{ model: Exam, attributes: ['exam_id', 'subject_name'] }],
                required: false,
            }],
            order: [['role', 'ASC'], ['nama_lengkap', 'ASC']],
        });
        res.json(users);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/users', ...requireAdmin, async (req, res) => {
    const nama_lengkap = sanitize(req.body.nama_lengkap || '', 255);
    const nim          = sanitize(req.body.nim || '', 50);
    const role         = ['student', 'teacher'].includes(req.body.role) ? req.body.role : 'student';
    const max_attempts = parseInt(req.body.max_attempts) || 1;
    const password     = req.body.password || nim;

    if (!nama_lengkap || !nim) return res.status(400).json({ error: 'Nama dan NIM wajib diisi' });
    if (PROTECTED_NIMS.includes(nim.toLowerCase())) return res.status(403).json({ error: 'NIM dilindungi sistem' });

    try {
        const existing = await User.findOne({ where: { nim } });
        if (existing) return res.status(409).json({ error: `NIM "${nim}" sudah terdaftar` });

        const password_hash = await bcrypt.hash(password, 10);
        const user = await User.create({
            nama_lengkap, nim, role,
            is_registered: true, password_hash,
            max_attempts: role === 'student' ? Math.min(20, max_attempts) : 99,
        });

        const { password_hash: _, ...safe } = user.toJSON();
        res.json(safe);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/users/:id', ...requireAdmin, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
        if (PROTECTED_NIMS.includes(user.nim?.toLowerCase())) {
            return res.status(403).json({ error: 'Akun sistem tidak dapat dimodifikasi' });
        }
        const updates = {};
        if (req.body.nama_lengkap)           updates.nama_lengkap  = sanitize(req.body.nama_lengkap, 255);
        if (req.body.is_registered !== undefined) updates.is_registered = Boolean(req.body.is_registered);
        if (req.body.max_attempts !== undefined) {
            const val = parseInt(req.body.max_attempts);
            if (val >= 1) updates.max_attempts = Math.min(99, val);
        }
        if (req.body.role && ['student', 'teacher'].includes(req.body.role)) updates.role = req.body.role;
        if (req.body.password) updates.password_hash = await bcrypt.hash(req.body.password, 10);
        await user.update(updates);
        const { password_hash, ...safe } = user.toJSON();
        res.json(safe);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/users/:id', ...requireAdmin, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
        if (PROTECTED_NIMS.includes(user.nim?.toLowerCase())) {
            return res.status(403).json({ error: 'Akun admin/guru sistem tidak dapat dihapus' });
        }
        await user.destroy();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/users/:id/reset-password', ...requireAdmin, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
        if (PROTECTED_NIMS.includes(user.nim?.toLowerCase())) {
            return res.status(403).json({ error: 'Akun sistem tidak dapat direset via endpoint ini' });
        }
        const newPass = req.body.password || user.nim;
        await user.update({ password_hash: await bcrypt.hash(newPass, 10) });
        res.json({ success: true, message: `Password direset ke: ${newPass}` });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/stats', ...requireAdmin, async (req, res) => {
    try {
        const [
            totalStudents, totalTeachers, totalExams,
            totalQuestions, totalSessions, activeSessions,
            totalViolations, totalEnrollments, criticalViolations
        ] = await Promise.all([
            User.count({ where: { role: 'student' } }),
            User.count({ where: { role: 'teacher' } }),
            Exam.count(),
            Question.count(),
            SessionMonitoring.count(),
            SessionMonitoring.count({ where: { status: 'ACTIVE' } }),
            RuleViolation.count(),
            ExamEnrollment.count(),
            RuleViolation.count({ where: { severity: 'CRITICAL' } }),
        ]);
        res.json({
            totalStudents, totalTeachers, totalExams,
            totalQuestions, totalSessions, activeSessions,
            totalViolations, totalEnrollments, criticalViolations,
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/logs', ...requireAdmin, (req, res) => {
    try {
        const n = Math.min(500, parseInt(req.query.lines) || 100);
        if (!fs.existsSync(LOG_FILE)) return res.json({ lines: [] });
        const content = fs.readFileSync(LOG_FILE, 'utf-8');
        const lines   = content.split('\n').filter(l => l.trim()).slice(-n);
        res.json({ lines, total: lines.length, file: LOG_FILE });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

/** GET /api/admin/export/students — Export data peserta ke Excel */
app.get('/api/admin/export/students', ...requireAdmin, async (req, res) => {
    try {
        const students = await User.findAll({
            where: { role: 'student' },
            attributes: ['nim', 'nama_lengkap', 'is_registered', 'max_attempts', 'createdAt'],
            include: [{
                model: ExamEnrollment,
                include: [{ model: Exam, attributes: ['subject_name'] }],
                required: false,
            }],
            order: [['nama_lengkap', 'ASC']],
        });

        const rows = students.map(s => ({
            'NIM':             s.nim,
            'Nama Lengkap':    s.nama_lengkap,
            'Status':          s.is_registered ? 'Aktif' : 'Nonaktif',
            'Max Percobaan':   s.max_attempts,
            'Ujian Terdaftar': (s.ExamEnrollments || []).map(e => e.Exam?.subject_name).filter(Boolean).join('; '),
            'Tgl Daftar':      new Date(s.createdAt).toLocaleDateString('id-ID'),
        }));

        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(rows);
        ws['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 10 }, { wch: 14 }, { wch: 40 }, { wch: 15 }];
        xlsx.utils.book_append_sheet(wb, ws, 'Data Peserta');

        const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
        const fname  = `Export_Peserta_${new Date().toISOString().slice(0,10)}.xlsx`;
        res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

/** GET /api/admin/export/sessions — Export sesi ke Excel (2 sheet) */
app.get('/api/admin/export/sessions', ...requireAdmin, async (req, res) => {
    try {
        const sessions = await SessionMonitoring.findAll({
            include: [
                { model: User,  attributes: ['nim', 'nama_lengkap'] },
                { model: Exam,  attributes: ['subject_name'] },
                {
                    model: EventLog,
                    include: [RuleViolation, RFModelResult],
                    required: false,
                },
            ],
            order: [['createdAt', 'DESC']],
        });

        // Sheet 1: Ringkasan sesi
        const summaryRows = sessions.map(s => {
            const logs = s.EventLogs || [];
            const rfScores = logs.filter(l => l.RFModelResult).map(l => l.RFModelResult.conf_score);
            const avgScore = rfScores.length ? (rfScores.reduce((a, b) => a + b, 0) / rfScores.length) : 0;
            const violations = logs.filter(l => l.RuleViolation).length;
            const screenshots = logs.filter(l => l.activity_type === 'screenshot_attempt').length;
            const devtools    = logs.filter(l => l.activity_type === 'devtools_open').length;
            return {
                'Session ID':       s.session_id,
                'NIM':              s.User?.nim || '-',
                'Nama':             s.User?.nama_lengkap || '-',
                'Mata Ujian':       s.Exam?.subject_name || '-',
                'Status':           s.status,
                'Skor Ujian':       s.score || 0,
                'Risk Score RF':    parseFloat(avgScore.toFixed(4)),
                'Prediksi Curang':  avgScore >= 0.6 ? 'YA' : 'TIDAK',
                'Total Pelanggaran':violations,
                'Screenshot':       screenshots,
                'DevTools':         devtools,
                'Total Event':      logs.length,
                'Waktu Mulai':      s.start_time ? new Date(s.start_time).toLocaleString('id-ID') : '-',
                'Waktu Tercatat':   new Date(s.createdAt).toLocaleString('id-ID'),
            };
        });

        // Sheet 2: Detail pelanggaran per event
        const detailRows = [];
        for (const s of sessions) {
            for (const ev of (s.EventLogs || [])) {
                if (!ev.RuleViolation && !ev.RFModelResult) continue;
                detailRows.push({
                    'Session ID':    s.session_id,
                    'NIM':           s.User?.nim || '-',
                    'Nama':          s.User?.nama_lengkap || '-',
                    'Jenis Aktivitas': ev.activity_type,
                    'Detail':        ev.details || '-',
                    'Device':        ev.device_type || 'UNKNOWN',
                    'Rule Code':     ev.RuleViolation?.rule_code || '-',
                    'Severity':      ev.RuleViolation?.severity || '-',
                    'RF Score':      ev.RFModelResult ? parseFloat(ev.RFModelResult.conf_score.toFixed(4)) : '-',
                    'Prediksi Curang': ev.RFModelResult ? (ev.RFModelResult.conf_score >= 0.6 ? 'YA' : 'TIDAK') : '-',
                    'Waktu':         new Date(ev.createdAt).toLocaleString('id-ID'),
                });
            }
        }

        const wb = xlsx.utils.book_new();

        const ws1 = xlsx.utils.json_to_sheet(summaryRows);
        ws1['!cols'] = [
            { wch: 10 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 12 },
            { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 11 },
            { wch: 10 }, { wch: 12 }, { wch: 22 }, { wch: 22 },
        ];
        xlsx.utils.book_append_sheet(wb, ws1, 'Ringkasan Sesi');

        if (detailRows.length > 0) {
            const ws2 = xlsx.utils.json_to_sheet(detailRows);
            ws2['!cols'] = [
                { wch: 10 }, { wch: 15 }, { wch: 25 }, { wch: 22 }, { wch: 30 },
                { wch: 10 }, { wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 22 },
            ];
            xlsx.utils.book_append_sheet(wb, ws2, 'Detail Pelanggaran');
        }

        const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
        const fname  = `Export_Sesi_${new Date().toISOString().slice(0,10)}.xlsx`;
        res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

/** GET /api/admin/export/violations — Export khusus RF scores & violations */
app.get('/api/admin/export/violations', ...requireAdmin, async (req, res) => {
    try {
        const results = await RFModelResult.findAll({
            include: [{
                model: EventLog,
                include: [
                    RuleViolation,
                    { model: SessionMonitoring, include: [
                        { model: User, attributes: ['nim', 'nama_lengkap'] },
                        { model: Exam, attributes: ['subject_name'] },
                    ]},
                ],
            }],
            order: [['createdAt', 'DESC']],
        });

        const rows = results.map(r => {
            const ev  = r.EventLog;
            const ses = ev?.SessionMonitoring;
            return {
                'RF ID':          r.rf_id,
                'NIM':            ses?.User?.nim || '-',
                'Nama':           ses?.User?.nama_lengkap || '-',
                'Mata Ujian':     ses?.Exam?.subject_name || '-',
                'Session ID':     ev?.session_id || '-',
                'Jenis Aktivitas':ev?.activity_type || '-',
                'Detail':         ev?.details || '-',
                'Device':         ev?.device_type || 'UNKNOWN',
                'RF Score':       parseFloat(r.conf_score.toFixed(4)),
                'Prediksi Curang':r.conf_score >= 0.6 ? 'YA' : 'TIDAK',
                'Rule Code':      ev?.RuleViolation?.rule_code || '-',
                'Severity':       ev?.RuleViolation?.severity || '-',
                'Waktu':          new Date(r.createdAt).toLocaleString('id-ID'),
            };
        });

        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(rows);
        ws['!cols'] = [
            { wch: 8 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 10 },
            { wch: 22 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 15 },
            { wch: 25 }, { wch: 10 }, { wch: 22 },
        ];
        xlsx.utils.book_append_sheet(wb, ws, 'RF Violations');

        const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
        const fname  = `Export_Violations_RF_${new Date().toISOString().slice(0,10)}.xlsx`;
        res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/clear-all-logs', ...requireAdmin, async (req, res) => {
    try {
        await EventLog.destroy({ where: {} });
        await RuleViolation.destroy({ where: {} });
        await RFModelResult.destroy({ where: {} });
        await SessionMonitoring.destroy({ where: {} });
        await ExamEnrollment.update({ attempts_used: 0 }, { where: {} });
        log('INFO', 'ADMIN', 'Semua data sesi dan log dihapus oleh admin');
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// ADMIN — ENROLLMENT
// ============================================================

app.get('/api/admin/enrollments/:exam_id', ...requireAdmin, async (req, res) => {
    try {
        const enrollments = await ExamEnrollment.findAll({
            where: { exam_id: req.params.exam_id },
            include: [{ model: User, attributes: ['user_id', 'nama_lengkap', 'nim'] }],
        });
        res.json(enrollments);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/enrollments', ...requireAdmin, async (req, res) => {
    const { user_id, exam_id } = req.body;
    const max_attempts = Math.min(20, Math.max(1, parseInt(req.body.max_attempts) || 1));
    if (!user_id || !exam_id) return res.status(400).json({ error: 'user_id dan exam_id diperlukan' });
    try {
        const [enrollment, created] = await ExamEnrollment.findOrCreate({
            where: { user_id, exam_id },
            defaults: { max_attempts, attempts_used: 0 },
        });
        if (!created) await enrollment.update({ max_attempts });
        res.json({ ...enrollment.toJSON(), created });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/enrollments/:id', ...requireAdmin, async (req, res) => {
    try {
        const enrollment = await ExamEnrollment.findByPk(req.params.id);
        if (!enrollment) return res.status(404).json({ error: 'Enrollment tidak ditemukan' });
        const updates = {};
        if (req.body.max_attempts !== undefined) {
            updates.max_attempts = Math.min(20, Math.max(1, parseInt(req.body.max_attempts)));
        }
        if (req.body.reset_attempts) updates.attempts_used = 0;
        await enrollment.update(updates);
        res.json(enrollment);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/enrollments/:id', ...requireAdmin, async (req, res) => {
    try {
        await ExamEnrollment.destroy({ where: { enrollment_id: req.params.id } });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// ADMIN — MANAJEMEN UJIAN
// ============================================================

app.get('/api/exams', verifyToken, async (req, res) => {
    try {
        const where = req.user.role === 'student' ? { is_active: true } : {};
        const exams = await Exam.findAll({ where, order: [['exam_id', 'DESC']] });

        if (req.user.role === 'student') {
            const enriched = await Promise.all(exams.map(async exam => {
                const enrollment = await ExamEnrollment.findOne({
                    where: { user_id: req.user.user_id, exam_id: exam.exam_id },
                });
                return {
                    ...exam.toJSON(),
                    enrolled:           !!enrollment,
                    max_attempts:       enrollment?.max_attempts || 0,
                    attempts_used:      enrollment?.attempts_used || 0,
                    attempts_remaining: enrollment
                        ? Math.max(0, enrollment.max_attempts - enrollment.attempts_used)
                        : 0,
                };
            }));
            return res.json(enriched);
        }
        res.json(exams);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/exams', ...requireTeacher, async (req, res) => {
    const subject_name     = sanitize(req.body.subject_name || '', 255);
    const duration_minutes = Math.min(300, Math.max(10, parseInt(req.body.duration_minutes) || 90));
    if (!subject_name) return res.status(400).json({ error: 'Nama ujian diperlukan' });
    try {
        const exam = await Exam.create({ subject_name, duration_minutes });
        res.json(exam);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/exams/:id', ...requireTeacher, async (req, res) => {
    try {
        const exam = await Exam.findByPk(req.params.id);
        if (!exam) return res.status(404).json({ error: 'Ujian tidak ditemukan' });
        const updates = {};
        if (req.body.subject_name)       updates.subject_name     = sanitize(req.body.subject_name, 255);
        if (req.body.duration_minutes)   updates.duration_minutes = parseInt(req.body.duration_minutes);
        if (req.body.is_active !== undefined) updates.is_active    = Boolean(req.body.is_active);
        await exam.update(updates);
        res.json(exam);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/exams/:id', ...requireAdmin, async (req, res) => {
    try {
        await Exam.destroy({ where: { exam_id: req.params.id } });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// ADMIN — MANAJEMEN SOAL
// ============================================================

app.get('/api/admin/questions/:exam_id', ...requireTeacher, async (req, res) => {
    try {
        const questions = await Question.findAll({
            where: { exam_id: req.params.exam_id },
            order: [['question_id', 'ASC']],
        });
        res.json(questions.map(q => ({ ...q.toJSON(), options: JSON.parse(q.options) })));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/questions/:id', ...requireTeacher, async (req, res) => {
    try {
        const deleted = await Question.destroy({ where: { question_id: req.params.id } });
        if (!deleted) return res.status(404).json({ error: 'Soal tidak ditemukan' });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/clear-questions', ...requireTeacher, async (req, res) => {
    try {
        const count = await Question.destroy({ where: { exam_id: req.body.exam_id } });
        res.json({ success: true, deleted: count });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

/**
 * POST /api/admin/upload-questions
 * Upload Excel soal dengan validasi ketat dan fuzzy column matching.
 * Support header: A/B/C/D atau 0/1/2/3 untuk correct_index.
 */
app.post('/api/admin/upload-questions', ...requireTeacher, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'File tidak ditemukan' });
        const { exam_id } = req.body;
        if (!exam_id) return res.status(400).json({ error: 'exam_id diperlukan' });

        const exam = await Exam.findByPk(exam_id);
        if (!exam) return res.status(404).json({ error: 'Ujian tidak ditemukan' });

        const workbook = xlsx.read(req.file.buffer, {
            type: 'buffer',
            cellText: false,
            raw: false,
            defval: '',
        });
        const rawData = xlsx.utils.sheet_to_json(
            workbook.Sheets[workbook.SheetNames[0]],
            { defval: '', raw: false }
        );

        if (rawData.length === 0) {
            return res.status(400).json({ error: 'File Excel kosong atau tidak ada data' });
        }
        if (rawData.length > 300) {
            return res.status(400).json({ error: 'Maksimal 300 soal per upload' });
        }

        // Fuzzy key finder — cocokkan header tidak peduli ejaan/format
        const normKey = str => String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
        const findKey = (obj, searchKeys) => {
            for (const sk of searchKeys) {
                const found = Object.keys(obj).find(ok => {
                    const n = normKey(ok);
                    return sk.length <= 1 ? n === normKey(sk) : n.includes(normKey(sk));
                });
                if (found !== undefined) {
                    const val = obj[found];
                    return val === null || val === undefined ? '' : String(val).trim();
                }
            }
            return '';
        };

        // Map huruf A/B/C/D ke index 0/1/2/3
        const letterToIndex = { 'a': 0, 'b': 1, 'c': 2, 'd': 3 };

        const questions   = [];
        const failed_rows = [];

        for (let i = 0; i < rawData.length; i++) {
            const row   = rawData[i];
            const qText = findKey(row, ['question', 'soal', 'pertanyaan', 'text', 'deskripsi', 'uraian']);

            if (!qText || qText.length < 3) {
                failed_rows.push({ row_number: i + 2, reason: 'Kolom soal kosong atau terlalu pendek (min 3 karakter)', data: row });
                continue;
            }
            if (qText.length > 2000) {
                failed_rows.push({ row_number: i + 2, reason: 'Teks soal terlalu panjang (maks 2000 karakter)', data: row });
                continue;
            }

            const optA = findKey(row, ['option0', 'option_0', 'optiona', 'option_a', 'piliha', 'pilihanA', 'a']) || 'Pilihan A';
            const optB = findKey(row, ['option1', 'option_1', 'optionb', 'option_b', 'pilihanB', 'b']) || 'Pilihan B';
            const optC = findKey(row, ['option2', 'option_2', 'optionc', 'option_c', 'pilihanC', 'c']) || 'Pilihan C';
            const optD = findKey(row, ['option3', 'option_3', 'optiond', 'option_d', 'pilihanD', 'd']) || 'Pilihan D';

            // Validasi pilihan tidak kosong
            const opts = [optA, optB, optC, optD];
            const emptyOpt = opts.findIndex(o => !o || o.trim() === '' || o.startsWith('Pilihan '));
            // (pilihan default diizinkan jika memang tidak ada di file)

            const rawCorrect = findKey(row, ['correct', 'correctindex', 'correct_index', 'jawaban', 'kunci', 'answer', 'ans', 'kuncijawaban']);
            let correctNum;

            if (rawCorrect === '') {
                failed_rows.push({ row_number: i + 2, reason: 'Kolom kunci jawaban (correct_index) tidak ditemukan atau kosong', data: row });
                continue;
            }

            const rawLower = rawCorrect.toLowerCase().trim();
            if (letterToIndex[rawLower] !== undefined) {
                correctNum = letterToIndex[rawLower];
            } else {
                correctNum = parseInt(rawCorrect);
            }

            if (isNaN(correctNum) || correctNum < 0 || correctNum > 3) {
                failed_rows.push({
                    row_number: i + 2,
                    reason: `Kunci jawaban tidak valid: "${rawCorrect}" (harus 0-3 atau A-D)`,
                    data: row,
                });
                continue;
            }

            questions.push({
                exam_id,
                question_text: sanitize(qText, 2000),
                options:       JSON.stringify([
                    sanitize(optA, 500),
                    sanitize(optB, 500),
                    sanitize(optC, 500),
                    sanitize(optD, 500),
                ]),
                correct_option: correctNum,
            });
        }

        if (questions.length > 0) {
            await Question.destroy({ where: { exam_id } });
            await Question.bulkCreate(questions);
        }

        res.json({
            success: true,
            count:        questions.length,
            failed_rows,
            total_rows:   rawData.length,
            exam_name:    exam.subject_name,
        });

    } catch (err) {
        log('ERROR', 'UPLOAD', `Upload soal gagal: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

/** GET /api/admin/download-template — Template Excel soal */
app.get('/api/admin/download-template', (req, res) => {
    const wb   = xlsx.utils.book_new();
    const data = [
        ['question', 'option_0', 'option_1', 'option_2', 'option_3', 'correct_index'],
        ['Apa ibukota Indonesia?', 'Jakarta', 'Bandung', 'Surabaya', 'Medan', 0],
        ['Siapa penemu lampu pijar?', 'Einstein', 'Tesla', 'Edison', 'Newton', 2],
        ['Berapa hasil 5 x 7?', '25', '30', '35', '40', 2],
        ['Planet terbesar di tata surya?', 'Mars', 'Jupiter', 'Saturn', 'Venus', 1],
        ['Simbol kimia air?', 'CO2', 'H2O', 'NaCl', 'O2', 1],
    ];
    const ws = xlsx.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 60 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 14 }];
    xlsx.utils.book_append_sheet(wb, ws, 'Template Soal');

    // Sheet kedua: petunjuk
    const guide = [
        ['PETUNJUK PENGISIAN'],
        [''],
        ['Kolom', 'Keterangan', 'Contoh'],
        ['question', 'Teks soal (min 3, maks 2000 karakter)', 'Apa ibukota Indonesia?'],
        ['option_0', 'Pilihan A', 'Jakarta'],
        ['option_1', 'Pilihan B', 'Bandung'],
        ['option_2', 'Pilihan C', 'Surabaya'],
        ['option_3', 'Pilihan D', 'Medan'],
        ['correct_index', 'Jawaban benar (0=A, 1=B, 2=C, 3=D) atau tulis A/B/C/D', '0 atau A'],
        [''],
        ['Catatan:'],
        ['- Header boleh menggunakan nama alternatif: soal, pertanyaan, pilihan_a, jawaban, kunci, dst.'],
        ['- Maksimal 300 soal per upload'],
        ['- correct_index boleh menggunakan angka (0-3) atau huruf (A-D)'],
    ];
    const wsGuide = xlsx.utils.aoa_to_sheet(guide);
    wsGuide['!cols'] = [{ wch: 20 }, { wch: 50 }, { wch: 30 }];
    xlsx.utils.book_append_sheet(wb, wsGuide, 'Petunjuk');

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="Template_Soal_Exam.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
});

// ============================================================
// STUDENT — ALUR UJIAN
// ============================================================

app.get('/api/questions', ...requireStudent, async (req, res) => {
    const { exam_id } = req.query;
    if (!exam_id) return res.status(400).json({ error: 'exam_id diperlukan' });

    try {
        const enrollment = await ExamEnrollment.findOne({
            where: { user_id: req.user.user_id, exam_id },
        });
        if (!enrollment) {
            return res.status(403).json({ error: 'Anda tidak terdaftar di ujian ini. Hubungi admin.' });
        }

        const questions = await Question.findAll({
            where: { exam_id },
            attributes: ['question_id', 'question_text', 'options'],
            order: sequelize.random(),
        });

        res.json(questions.map(q => ({ ...q.toJSON(), options: JSON.parse(q.options) })));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/start-exam', ...requireStudent, async (req, res) => {
    const { exam_id } = req.body;
    const user_id     = req.user.user_id;

    try {
        const exam = await Exam.findByPk(exam_id);
        if (!exam)          return res.status(404).json({ error: 'Ujian tidak ditemukan' });
        if (!exam.is_active) return res.status(403).json({ error: 'Ujian sedang tidak aktif' });

        const enrollment = await ExamEnrollment.findOne({ where: { user_id, exam_id } });
        if (!enrollment) {
            return res.status(403).json({ error: 'Anda tidak terdaftar di ujian ini. Hubungi admin.' });
        }
        if (enrollment.attempts_used >= enrollment.max_attempts) {
            return res.status(403).json({
                error: `Batas percobaan ujian habis (${enrollment.max_attempts}x). Hubungi admin.`,
            });
        }

        const activeSession = await SessionMonitoring.findOne({
            where: { user_id, exam_id, status: 'ACTIVE' },
            order: [['createdAt', 'DESC']],
        });

        if (activeSession) {
            const elapsed = (Date.now() - new Date(activeSession.start_time).getTime()) / 60000;
            if (elapsed > exam.duration_minutes + 2) {
                await activeSession.update({ status: 'COMPLETED' });
                await enrollment.increment('attempts_used');
                return res.status(403).json({ error: 'Waktu ujian sebelumnya telah habis' });
            }
            const remaining_seconds = Math.floor((exam.duration_minutes - elapsed) * 60);
            return res.json({ session_id: activeSession.session_id, exam, remaining_seconds });
        }

        const session = await SessionMonitoring.create({
            user_id, exam_id, status: 'ACTIVE', start_time: new Date(),
        });

        res.json({
            session_id:       session.session_id,
            exam,
            remaining_seconds: exam.duration_minutes * 60,
        });

    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/submit-exam', ...requireStudent, async (req, res) => {
    const { session_id, answers } = req.body;
    const user_id = req.user.user_id;

    if (!session_id || typeof answers !== 'object') {
        return res.status(400).json({ error: 'Data tidak lengkap' });
    }

    try {
        const session = await SessionMonitoring.findByPk(session_id);
        if (!session)                       return res.status(404).json({ error: 'Sesi tidak ditemukan' });
        if (session.user_id !== user_id)     return res.status(403).json({ error: 'Akses ditolak' });
        if (session.status !== 'ACTIVE')    return res.status(400).json({ error: 'Sesi sudah tidak aktif' });

        const exam    = await Exam.findByPk(session.exam_id);
        const elapsed = (Date.now() - new Date(session.start_time).getTime()) / 60000;

        if (elapsed > exam.duration_minutes + 3) {
            await session.update({ status: 'COMPLETED', score: 0 });
            const enrollment = await ExamEnrollment.findOne({ where: { user_id, exam_id: session.exam_id } });
            if (enrollment) await enrollment.increment('attempts_used');
            return res.status(400).json({ error: 'Waktu ujian telah habis. Skor = 0.' });
        }

        const questions = await Question.findAll({ where: { exam_id: session.exam_id } });
        let correct = 0;
        questions.forEach(q => {
            const ans = answers[q.question_id];
            if (ans !== undefined && parseInt(ans) === q.correct_option) correct++;
        });

        const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
        await session.update({ status: 'COMPLETED', score });

        const enrollment = await ExamEnrollment.findOne({ where: { user_id, exam_id: session.exam_id } });
        if (enrollment) await enrollment.increment('attempts_used');

        res.json({ success: true, score, correct, total: questions.length });

    } catch (err) { res.status(500).json({ error: err.message }); }
});

/**
 * POST /api/submit-log
 * Terima event anti-cheat dari client (PC & Mobile).
 * Bangun feature vector dari seluruh sesi untuk RF inference.
 */
app.post('/api/submit-log', ...requireStudent, logLimiter, async (req, res) => {
    const {
        session_id, activity_type, details,
        // Feature snapshot dari client
        features: clientFeatures,
    } = req.body;
    const user_id = req.user.user_id;
    const ua      = req.headers['user-agent'] || '';

    // Validasi
    if (!session_id || !activity_type) {
        return res.status(400).json({ error: 'session_id dan activity_type diperlukan' });
    }

    const VALID_ACTIVITIES = [
        'blur', 'visibility_hidden', 'context_menu', 'forbidden_key',
        'screenshot_attempt', 'devtools_open', 'copy_attempt',
        'screen_share', 'window_resize_extreme', 'multi_touch',
        'fullscreen_exit', 'focus', 'heartbeat',
    ];
    if (!VALID_ACTIVITIES.includes(activity_type)) {
        return res.status(400).json({ error: 'activity_type tidak valid' });
    }

    try {
        const session = await SessionMonitoring.findByPk(session_id);
        if (!session || session.user_id !== user_id) {
            return res.status(403).json({ error: 'Akses ditolak' });
        }
        if (session.status === 'TERMINATED') {
            return res.json({ terminated: true });
        }
        if (session.status === 'COMPLETED') {
            return res.json({ completed: true });
        }

        // Deteksi device
        const device_type = detectDevice(ua);

        // Update counter di session
        const sessionUpdates = {};
        if (activity_type === 'screenshot_attempt') {
            sessionUpdates.screenshot_count = (session.screenshot_count || 0) + 1;
        }
        if (activity_type === 'devtools_open') {
            sessionUpdates.devtools_count = (session.devtools_count || 0) + 1;
        }
        if (activity_type === 'blur') {
            sessionUpdates.blur_count = (session.blur_count || 0) + 1;
        }
        if (activity_type === 'forbidden_key') {
            sessionUpdates.forbidden_key_count = (session.forbidden_key_count || 0) + 1;
        }
        if (activity_type === 'fullscreen_exit') {
            sessionUpdates.fullscreen_exit_count = (session.fullscreen_exit_count || 0) + 1;
        }
        if (Object.keys(sessionUpdates).length > 0) {
            await session.update(sessionUpdates);
            await session.reload();
        }

        // Simpan event log
        const eventLog = await EventLog.create({
            session_id,
            activity_type: sanitize(activity_type, 100),
            details:       sanitize(details || '', 2000),
            device_type,
            features_json: clientFeatures ? JSON.stringify(clientFeatures) : null,
        });

        // Bangun feature vector dari seluruh sesi
        const features = await buildFeatureVector(session_id);

        // Rule-based violations
        let violated = false;
        let severity  = 'LOW';
        let ruleCode  = null;
        let autoTerminate = false;

        if (activity_type === 'screenshot_attempt') {
            ruleCode  = 'SCREENSHOT_DETECTED';
            severity  = 'CRITICAL';
            violated  = true;
            // Auto-terminate setelah 2 screenshot
            if ((session.screenshot_count || 0) >= 2) autoTerminate = true;
        } else if (activity_type === 'screen_share') {
            ruleCode  = 'SCREEN_SHARE_DETECTED';
            severity  = 'CRITICAL';
            violated  = true;
            autoTerminate = true;
        } else if (activity_type === 'devtools_open') {
            ruleCode  = 'DEVTOOLS_OPEN';
            severity  = 'HIGH';
            violated  = true;
            if ((session.devtools_count || 0) >= 3) autoTerminate = true;
        } else if (activity_type === 'blur') {
            const blurCount = session.blur_count || 0;
            if (blurCount > 5) {
                ruleCode = 'TAB_SWITCH_EXCESSIVE';
                severity = blurCount > 10 ? 'CRITICAL' : 'HIGH';
                violated = true;
            }
        } else if (activity_type === 'forbidden_key') {
            ruleCode = 'FORBIDDEN_KEY_USED';
            severity = 'MEDIUM';
            violated = true;
        } else if (activity_type === 'context_menu') {
            ruleCode = 'CONTEXT_MENU_BLOCKED';
            severity = 'LOW';
        } else if (activity_type === 'copy_attempt') {
            ruleCode = 'COPY_PASTE_DETECTED';
            severity = 'MEDIUM';
            violated = true;
        } else if (activity_type === 'fullscreen_exit') {
            ruleCode = 'FULLSCREEN_EXIT';
            severity = 'MEDIUM';
            violated = true;
        } else if (activity_type === 'window_resize_extreme') {
            ruleCode = 'WINDOW_RESIZE_SUSPICIOUS';
            severity = 'MEDIUM';
            violated = true;
        } else if (activity_type === 'multi_touch') {
            ruleCode = 'MULTI_TOUCH_DETECTED';
            severity = 'LOW';
        }

        if (ruleCode) {
            await RuleViolation.create({ log_id: eventLog.log_id, rule_code: ruleCode, severity });
        }

        // RF inference (async, tidak blocking)
        const rfScore = await predictCheating(features);
        const isCheating = rfScore >= 0.60;

        await RFModelResult.create({
            log_id:      eventLog.log_id,
            conf_score:  rfScore,
            is_cheating: isCheating,
        });

        // Auto-terminate jika CRITICAL
        if (autoTerminate) {
            await session.update({ status: 'TERMINATED' });
            const enrollment = await ExamEnrollment.findOne({
                where: { user_id, exam_id: session.exam_id },
            });
            if (enrollment) await enrollment.increment('attempts_used');
            log('WARN', 'ANTICHEAT', `Auto-terminate sesi ${session_id}: ${activity_type} (user: ${user_id})`);
            return res.json({
                success: true, violated: true, terminated: true,
                score: rfScore, message: 'Sesi dihentikan karena pelanggaran kritis.',
            });
        }

        res.json({
            success: true,
            violated,
            score:   rfScore,
            is_cheating: isCheating,
            warning: session.admin_warnings,
        });

    } catch (err) {
        log('ERROR', 'SUBMIT-LOG', `Exception: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/check-status/:session_id', ...requireStudent, async (req, res) => {
    try {
        const session = await SessionMonitoring.findByPk(req.params.session_id);
        if (!session)                             return res.status(404).json({ error: 'Sesi tidak ditemukan' });
        if (session.user_id !== req.user.user_id) return res.status(403).json({ error: 'Akses ditolak' });

        const exam              = await Exam.findByPk(session.exam_id);
        const elapsed           = (Date.now() - new Date(session.start_time).getTime()) / 60000;
        const remaining_seconds = Math.max(0, Math.floor((exam.duration_minutes - elapsed) * 60));

        res.json({ status: session.status, warning: session.admin_warnings, remaining_seconds });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// ADMIN — LIVE MONITORING
// ============================================================

app.get('/api/dashboard', ...requireAdmin, async (req, res) => {
    try {
        const users = await User.findAll({
            where: { role: 'student' },
            attributes: { exclude: ['password_hash'] },
            include: [{
                model: SessionMonitoring,
                required: false,
                include: [{
                    model: EventLog,
                    include: [RuleViolation, RFModelResult],
                    required: false,
                }],
            }],
            order: [['nama_lengkap', 'ASC']],
        });
        res.json(users);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/terminate', ...requireAdmin, async (req, res) => {
    try {
        const session = await SessionMonitoring.findByPk(req.body.session_id);
        if (!session) return res.status(404).json({ error: 'Sesi tidak ditemukan' });
        await session.update({ status: 'TERMINATED' });
        const enrollment = await ExamEnrollment.findOne({
            where: { user_id: session.user_id, exam_id: session.exam_id },
        });
        if (enrollment) await enrollment.increment('attempts_used');
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/warn', ...requireAdmin, async (req, res) => {
    try {
        await SessionMonitoring.update(
            { admin_warnings: sanitize(req.body.message, 500) },
            { where: { session_id: req.body.session_id } }
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/evidence/:session_id', ...requireAdmin, async (req, res) => {
    try {
        const logs = await EventLog.findAll({
            where: { session_id: req.params.session_id },
            include: [RuleViolation, RFModelResult],
            order: [['createdAt', 'ASC']],
        });
        res.json(logs);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// START SERVER
// ============================================================
sequelize.sync({ alter: true })
    .then(() => {
        app.listen(PORT, () => {
            log('INFO', 'SERVER', `CBT Server berjalan di port ${PORT}`);
            log('INFO', 'SERVER', 'Fitur aktif: JWT + bcrypt + Rate Limit + Helmet + RBAC + RF Anti-Cheat');
            console.log('\n==================================================');
            console.log(`🚀  CBT SERVER RUNNING ON PORT ${PORT}`);
            console.log(`📝  Log tersimpan di: ${LOG_FILE}`);
            console.log('🔐  Security: JWT + bcrypt + Rate Limit + Helmet');
            console.log('🛡️   RBAC: Admin | Teacher | Student roles enforced');
            console.log('🤖  AI Engine: Random Forest (12-feature vector)');
            console.log('📊  Database: MySQL via Sequelize (alter: true)');
            console.log('==================================================\n');
        });
    })
    .catch(err => {
        log('ERROR', 'SERVER', `Database sync GAGAL: ${err.message}`);
        console.error('❌ Database connection failed:', err.message);
        process.exit(1);
    });
