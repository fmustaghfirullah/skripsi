import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize, { User, Exam, SessionMonitoring, EventLog, RuleViolation, RFModelResult } from './models.js';
import { spawn } from 'child_process';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Helper for ML Prediction via Python Bridge
const predictCheating = (activityType, details) => {
    return new Promise((resolve) => {
        // Calling python script for inference
        const python = spawn('python', ['ml_bridge.py', activityType, details]);
        python.stdout.on('data', (data) => {
            resolve(parseFloat(data.toString()));
        });
        python.stderr.on('data', () => resolve(0.5));
        python.on('close', () => resolve(0.5));
    });
};

app.post('/api/login', async (req, res) => {
    const { nama, nim } = req.body;
    try {
        let user = await User.findOne({ where: { nim } });
        if (!user) {
            user = await User.create({ nama_lengkap: nama, nim });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/start-exam', async (req, res) => {
    const { user_id } = req.body;
    try {
        let exam = await Exam.findOne();
        if (!exam) {
            exam = await Exam.create({ subject_name: "Ujian Node.js & React" });
        }
        const session = await SessionMonitoring.create({ user_id, exam_id: exam.exam_id });
        res.json({ session_id: session.session_id, exam });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/submit-log', async (req, res) => {
    const { session_id, activity_type, details } = req.body;
    try {
        const log = await EventLog.create({ session_id, activity_type, details });

        // Rule Based
        let violated = false;
        if (activity_type === 'blur') {
            const blurCount = await EventLog.count({ where: { session_id, activity_type: 'blur' } });
            if (blurCount > 3) {
                await RuleViolation.create({ log_id: log.log_id, rule_code: 'TAB_SWITCH_EXCESSIVE' });
                violated = true;
            }
        } else if (activity_type === 'forbidden_key') {
            await RuleViolation.create({ log_id: log.log_id, rule_code: 'FORBIDDEN_KEY' });
            violated = true;
        }

        // ML Engine Prediction
        const score = await predictCheating(activity_type, details);
        await RFModelResult.create({ log_id: log.log_id, conf_score: score });

        res.json({ success: true, violated, score });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/dashboard', async (req, res) => {
    try {
        const users = await User.findAll({
            include: [{
                model: SessionMonitoring,
                include: [{
                    model: EventLog,
                    include: [RuleViolation, RFModelResult]
                }]
            }]
        });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

sequelize.sync().then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
