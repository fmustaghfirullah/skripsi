import { Sequelize, DataTypes } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        logging: false,
    }
);

// ============================================================
// USER — Peserta & Admin
// ============================================================
export const User = sequelize.define('User', {
    user_id:      { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nama_lengkap: { type: DataTypes.STRING(255), allowNull: false },
    nim:          { type: DataTypes.STRING(50), unique: true, allowNull: false },
    role:         { type: DataTypes.ENUM('student', 'teacher', 'admin'), defaultValue: 'student' },
    password_hash:{ type: DataTypes.STRING(255), allowNull: true },
    is_registered:{ type: DataTypes.BOOLEAN, defaultValue: false },
    max_attempts: { type: DataTypes.INTEGER, defaultValue: 1 },
});

// ============================================================
// EXAM — Mata Ujian
// ============================================================
export const Exam = sequelize.define('Exam', {
    exam_id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    subject_name:     { type: DataTypes.STRING(255), allowNull: false },
    duration_minutes: { type: DataTypes.INTEGER, defaultValue: 90 },
    is_active:        { type: DataTypes.BOOLEAN, defaultValue: true },
});

// ============================================================
// EXAM ENROLLMENT — Pendaftaran peserta ke ujian tertentu
// ============================================================
export const ExamEnrollment = sequelize.define('ExamEnrollment', {
    enrollment_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id:       { type: DataTypes.INTEGER, allowNull: false },
    exam_id:       { type: DataTypes.INTEGER, allowNull: false },
    max_attempts:  { type: DataTypes.INTEGER, defaultValue: 1 },
    attempts_used: { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
    indexes: [{ unique: true, fields: ['user_id', 'exam_id'] }]
});

// ============================================================
// SESSION MONITORING — Sesi ujian yang sedang berjalan
// ============================================================
export const SessionMonitoring = sequelize.define('SessionMonitoring', {
    session_id:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    status:           { type: DataTypes.ENUM('ACTIVE', 'COMPLETED', 'TERMINATED'), defaultValue: 'ACTIVE' },
    score:            { type: DataTypes.FLOAT, defaultValue: 0 },
    admin_warnings:   { type: DataTypes.TEXT, allowNull: true },
    start_time:       { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    // ── Kolom anti-cheat counter (diupdate realtime) ──────────
    screenshot_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    devtools_count:   { type: DataTypes.INTEGER, defaultValue: 0 },
    blur_count:       { type: DataTypes.INTEGER, defaultValue: 0 },
    forbidden_key_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    fullscreen_exit_count: { type: DataTypes.INTEGER, defaultValue: 0 },
});

// ============================================================
// EVENT LOG — Setiap aktivitas peserta selama ujian
// ============================================================
export const EventLog = sequelize.define('EventLog', {
    log_id:        { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    activity_type: { type: DataTypes.STRING(100), allowNull: false },
    details:       { type: DataTypes.TEXT },
    // ── Device context ────────────────────────────────────────
    device_type:   {
        type: DataTypes.ENUM('PC', 'MOBILE', 'UNKNOWN'),
        defaultValue: 'UNKNOWN',
    },
    // ── Feature snapshot saat event ini ───────────────────────
    features_json: { type: DataTypes.TEXT, allowNull: true }, // JSON feature vector
});

// ============================================================
// RULE VIOLATION — Pelanggaran aturan berbasis rule
// ============================================================
export const RuleViolation = sequelize.define('RuleViolation', {
    violation_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    rule_code:    { type: DataTypes.STRING(100), allowNull: false },
    severity:     {
        type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
        defaultValue: 'MEDIUM',
    },
});

// ============================================================
// RF MODEL RESULT — Skor kecurangan dari model AI
// ============================================================
export const RFModelResult = sequelize.define('RFModelResult', {
    rf_id:      { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    conf_score: { type: DataTypes.FLOAT, allowNull: false },
    is_cheating:{ type: DataTypes.BOOLEAN, defaultValue: false }, // threshold 0.60
});

// ============================================================
// QUESTION — Soal ujian
// ============================================================
export const Question = sequelize.define('Question', {
    question_id:   { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    exam_id:       { type: DataTypes.INTEGER, allowNull: false },
    question_text: { type: DataTypes.TEXT, allowNull: false },
    options:       { type: DataTypes.TEXT, allowNull: false },     // JSON array string
    correct_option:{ type: DataTypes.INTEGER, defaultValue: 0 },   // 0-3
});

// ============================================================
// ASSOCIATIONS
// ============================================================
User.hasMany(SessionMonitoring, { foreignKey: 'user_id' });
SessionMonitoring.belongsTo(User, { foreignKey: 'user_id' });

Exam.hasMany(SessionMonitoring, { foreignKey: 'exam_id' });
SessionMonitoring.belongsTo(Exam, { foreignKey: 'exam_id' });

Exam.hasMany(Question, { foreignKey: 'exam_id' });
Question.belongsTo(Exam, { foreignKey: 'exam_id' });

User.hasMany(ExamEnrollment, { foreignKey: 'user_id' });
ExamEnrollment.belongsTo(User, { foreignKey: 'user_id' });

Exam.hasMany(ExamEnrollment, { foreignKey: 'exam_id' });
ExamEnrollment.belongsTo(Exam, { foreignKey: 'exam_id' });

SessionMonitoring.hasMany(EventLog, { foreignKey: 'session_id' });
EventLog.belongsTo(SessionMonitoring, { foreignKey: 'session_id' });

EventLog.hasOne(RuleViolation, { foreignKey: 'log_id' });
RuleViolation.belongsTo(EventLog, { foreignKey: 'log_id' });

EventLog.hasOne(RFModelResult, { foreignKey: 'log_id' });
RFModelResult.belongsTo(EventLog, { foreignKey: 'log_id' });

export default sequelize;
