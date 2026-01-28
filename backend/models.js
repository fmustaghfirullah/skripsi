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

export const User = sequelize.define('User', {
    user_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nama_lengkap: { type: DataTypes.STRING, allowNull: false },
    nim: { type: DataTypes.STRING, unique: true, allowNull: false },
    role: { type: DataTypes.STRING, defaultValue: 'student' }, // student, admin, teacher
});

export const Exam = sequelize.define('Exam', {
    exam_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    subject_name: { type: DataTypes.STRING, allowNull: false },
});

export const SessionMonitoring = sequelize.define('SessionMonitoring', {
    session_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    status: { type: DataTypes.STRING, defaultValue: 'ACTIVE' }, // ACTIVE, TERMINATED, COMPLETED
    score: { type: DataTypes.FLOAT, defaultValue: 0 },
    admin_warnings: { type: DataTypes.TEXT, allowNull: true }, // Store warning messages
});

export const EventLog = sequelize.define('EventLog', {
    log_id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    activity_type: { type: DataTypes.STRING, allowNull: false },
    details: { type: DataTypes.TEXT },
});

export const RuleViolation = sequelize.define('RuleViolation', {
    violation_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    rule_code: { type: DataTypes.STRING, allowNull: false },
});

export const RFModelResult = sequelize.define('RFModelResult', {
    rf_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    conf_score: { type: DataTypes.FLOAT, allowNull: false },
});

export const Question = sequelize.define('Question', {
    question_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    question_text: { type: DataTypes.TEXT, allowNull: false },
    options: { type: DataTypes.TEXT, allowNull: false }, // Stored as JSON string
    correct_option: { type: DataTypes.INTEGER, defaultValue: 0 },
});

// Associations
User.hasMany(SessionMonitoring, { foreignKey: 'user_id' });
SessionMonitoring.belongsTo(User, { foreignKey: 'user_id' });

Exam.hasMany(SessionMonitoring, { foreignKey: 'exam_id' });
SessionMonitoring.belongsTo(Exam, { foreignKey: 'exam_id' });

Exam.hasMany(Question, { foreignKey: 'exam_id' });
Question.belongsTo(Exam, { foreignKey: 'exam_id' });

SessionMonitoring.hasMany(EventLog, { foreignKey: 'session_id' });
EventLog.belongsTo(SessionMonitoring, { foreignKey: 'session_id' });

EventLog.hasOne(RuleViolation, { foreignKey: 'log_id' });
RuleViolation.belongsTo(EventLog, { foreignKey: 'log_id' });

EventLog.hasOne(RFModelResult, { foreignKey: 'log_id' });
RFModelResult.belongsTo(EventLog, { foreignKey: 'log_id' });

export default sequelize;
