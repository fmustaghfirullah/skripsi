import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize, { User, Exam, SessionMonitoring, EventLog, RuleViolation, RFModelResult, Question } from './models.js';
import { spawn } from 'child_process';
import multer from 'multer';
import * as xlsx from 'xlsx';

// Configure Multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

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
        python.on('close', (code) => {
            if (code !== 0) resolve(0.5);
        });
        python.on('error', () => resolve(0.5));
    });
};

app.post('/api/login', async (req, res) => {
    const { nama, nim } = req.body;
    try {
        let user = await User.findOne({ where: { nim } });

        // Determine role based on NIM
        let role = 'student';
        if (nim === 'admin') role = 'admin';
        else if (nim === 'guru') role = 'teacher';

        if (!user) {
            user = await User.create({ nama_lengkap: nama, nim, role });
        } else {
            // Update role if somehow changed (e.g. promoting a user mostly for testing)
            if (user.role !== role) {
                user.role = role;
                await user.save();
            }
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/start-exam', async (req, res) => {
    const { user_id, exam_id } = req.body;
    try {
        // Check if user has an active or terminated session
        const existingSession = await SessionMonitoring.findOne({
            where: { user_id, status: ['ACTIVE', 'TERMINATED'] },
            order: [['createdAt', 'DESC']]
        });

        if (existingSession && existingSession.status === 'TERMINATED') {
            return res.status(403).json({ error: "Exam terminated by admin." });
        }

        // Validate Exam
        const exam = await Exam.findByPk(exam_id);
        if (!exam) return res.status(404).json({ error: "Exam not found" });

        const session = await SessionMonitoring.create({ user_id, exam_id: exam.exam_id, status: 'ACTIVE' });
        res.json({ session_id: session.session_id, exam });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/submit-exam', async (req, res) => {
    const { session_id, answers } = req.body; // answers: { [question_id]: selected_option_index }
    try {
        const session = await SessionMonitoring.findByPk(session_id);
        if (!session) return res.status(404).json({ error: "Session not found" });

        // Fetch all questions for this exam
        const questions = await Question.findAll({ where: { exam_id: session.exam_id } });

        let correctCount = 0;
        let totalQuestions = questions.length;

        if (totalQuestions === 0) {
            // Edge case: no questions
            await session.update({ status: 'COMPLETED', score: 0 });
            return res.json({ score: 0, total: 0 });
        }

        // Calculate Score
        questions.forEach(q => {
            const userAns = answers[q.question_id];
            if (userAns !== undefined && parseInt(userAns) === q.correct_option) {
                correctCount++;
            }
        });

        const finalScore = (correctCount / totalQuestions) * 100;

        await session.update({
            status: 'COMPLETED',
            score: finalScore
        });

        res.json({ success: true, score: finalScore, correct: correctCount, total: totalQuestions });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/submit-log', async (req, res) => {
    const { session_id, activity_type, details } = req.body;
    try {
        const session = await SessionMonitoring.findByPk(session_id);
        if (!session || session.status === 'TERMINATED') {
            return res.json({ terminated: true });
        }

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

        res.json({
            success: true,
            violated,
            score,
            warning: session.admin_warnings
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/dashboard', async (req, res) => {
    try {
        const users = await User.findAll({
            include: [{
                model: SessionMonitoring,
                where: { status: 'ACTIVE' },  // Filter active sessions primarily
                required: false, // Include users even if no active session (for history)
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

// Exam Management
app.get('/api/exams', async (req, res) => {
    try {
        const exams = await Exam.findAll();
        res.json(exams);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/exams', async (req, res) => {
    const { subject_name } = req.body;
    try {
        const exam = await Exam.create({ subject_name });
        res.json(exam);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Interventions
app.post('/api/admin/terminate', async (req, res) => {
    const { session_id } = req.body;
    try {
        await SessionMonitoring.update({ status: 'TERMINATED' }, { where: { session_id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/warn', async (req, res) => {
    const { session_id, message } = req.body;
    try {
        await SessionMonitoring.update({ admin_warnings: message }, { where: { session_id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/check-status/:session_id', async (req, res) => {
    try {
        const session = await SessionMonitoring.findByPk(req.params.session_id);
        if (!session) return res.status(404).json({ error: "Session not found" });
        res.json({
            status: session.status,
            warning: session.admin_warnings
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Teacher Dashboard - Upload Questions
app.post('/api/admin/upload-questions', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });
        const { exam_id } = req.body;
        if (!exam_id) return res.status(400).json({ error: "Exam ID required" });

        // Parse Excel
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        // Bulk Insert
        const questions = data.map(row => ({
            exam_id,
            question_text: row.question || row.Question || "Untitled",
            // flexible parsing for options
            options: JSON.stringify([
                row.option_0 || row.OptionA || "Option A",
                row.option_1 || row.OptionB || "Option B",
                row.option_2 || row.OptionC || "Option C",
                row.option_3 || row.OptionD || "Option D"
            ]),
            correct_option: row.correct_index || 0
        }));

        await Question.bulkCreate(questions);
        res.json({ success: true, count: questions.length });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Download Template Endpoint
app.get('/api/admin/download-template', (req, res) => {
    try {
        const wb = xlsx.utils.book_new();
        const ws_data = [
            ["question", "option_0", "option_1", "option_2", "option_3", "correct_index"],
            ["Contoh Soal: Apa ibukota Indonesia?", "Jakarta", "Bandung", "Surabaya", "Medan", 0],
            ["Siapa penemu lampu pijar?", "Einstein", "Tesla", "Edison", "Newton", 2]
        ];
        const ws = xlsx.utils.aoa_to_sheet(ws_data);
        xlsx.utils.book_append_sheet(wb, ws, "Template");

        const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', 'attachment; filename="Template_Soal_Exam.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Fetch Questions for Exam
app.get('/api/questions', async (req, res) => {
    const { exam_id } = req.query;
    try {
        const whereClause = exam_id ? { exam_id } : {};
        const questions = await Question.findAll({
            where: whereClause,
            limit: 50,
            order: sequelize.random()
        });
        // Parse JSON options back to array
        const parsed = questions.map(q => ({
            ...q.toJSON(),
            options: JSON.parse(q.options)
        }));
        res.json(parsed);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Evidence Retrieval
app.get('/api/admin/evidence/:session_id', async (req, res) => {
    try {
        const logs = await EventLog.findAll({
            where: { session_id: req.params.session_id },
            include: [RFModelResult],
            order: [['createdAt', 'ASC']]
        });
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

sequelize.sync({ alter: true }).then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
