import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, ChevronRight, ChevronLeft, AlertCircle, Info } from 'lucide-react';
import useMonitor from '../hooks/useMonitor';

const Exam = ({ user }) => {
    const { examId } = useParams();
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const [exam, setExam] = useState(null);
    const [timeLeft, setTimeLeft] = useState(3600);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({}); // { [question_id]: option_index }
    const [result, setResult] = useState(null); // { score: 90, correct: 9, total: 10 }

    const handleAnswer = (qId, optionIdx) => {
        setAnswers(prev => ({ ...prev, [qId]: optionIdx }));
    };

    const handleSubmitExam = async () => {
        if (!confirm("Are you sure you want to finish the exam?")) return;
        try {
            const res = await axios.post('http://localhost:5000/api/submit-exam', {
                session_id: session,
                answers: answers
            });
            setResult(res.data);
            // setViolation(null); // Clear any violations overlays if exist (optional)
        } catch (err) {
            console.error(err);
            alert("Submission failed!");
        }
    };

    // ...

    useEffect(() => {
        const start = async () => {
            console.log("Initializing exam for user:", user, "Exam ID:", examId);
            try {
                // 1. Start Session with Exam ID
                const res = await axios.post('http://localhost:5000/api/start-exam', {
                    user_id: user.user_id,
                    exam_id: examId
                });
                setSession(res.data.session_id);
                setExam(res.data.exam);

                // 2. Fetch Questions for this Exam
                const qRes = await axios.get(`http://localhost:5000/api/questions?exam_id=${examId}`);
                if (qRes.data.length > 0) {
                    setQuestions(qRes.data.map(q => ({
                        text: q.question_text,
                        options: q.options
                    })));
                } else {
                    setQuestions([{ text: "No questions found for this exam.", options: [] }]);
                }
            } catch (err) {
                console.error("Exam initialization failed:", err);
                if (err.response) {
                    console.error("Server response:", err.response.data);
                    alert(`Error: ${err.response.data.error || "Failed to start exam"}`);
                } else {
                    alert("Network Error: Could not connect to backend server. Make sure 'node server.js' is running.");
                }
            }
        };
        start();

        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [user]);

    useEffect(() => {
        // Polling for warnings/termination
        if (!session) return;

        const checkStatus = setInterval(async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/check-status/${session}`);
                if (res.data.status === 'TERMINATED') {
                    alert("EXAM TERMINATED BY ADMIN. Your answers have been submitted.");
                    window.location.reload();
                }
                if (res.data.warning) {
                    alert(`ADMIN WARNING: ${res.data.warning}`);
                    // Optional: Clear warning after showing to prevent infinite alerts, 
                    // but backend logic handles it by overwriting text. 
                    // ideally we should have a 'read' flag but for now alert is blocking or we assume logic handles it.
                }
            } catch (err) {
                console.error("Status check failed", err);
            }
        }, 3000); // Check every 3 seconds

        return () => clearInterval(checkStatus);
    }, [session]);

    const [violation, setViolation] = useState(null);

    // ... (existing useEffects)

    // Monitor Callback
    useMonitor(session, (data) => {
        if (data.terminated) {
            setViolation({ type: 'TERMINATED', message: "Exam terminated by admin. Your answers have been submitted." });
        }
        if (data.warning) {
            setViolation({ type: 'WARNING', message: data.warning });
        }
        if (data.violated) {
            setViolation({ type: 'VIOLATION', message: "SISTEM MENDETEKSI AKTIVITAS MENCURIGAKAN!" });
        }
    });

    // Custom Modal Component
    const ViolationOverlay = ({ type, message, onDismiss }) => (
        <div className="lockdown-overlay">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="lockdown-card"
            >
                <AlertCircle size={64} color="#ef4444" />
                <h2>{type === 'TERMINATED' ? 'EXAM ENDED' : 'SECURITY ALERT'}</h2>
                <p>{message}</p>
                {type !== 'TERMINATED' && (
                    <button className="btn-primary" onClick={onDismiss}>
                        I Understand & Resume
                    </button>
                )}
                {type === 'TERMINATED' && (
                    <button className="btn-danger" onClick={() => window.location.reload()}>
                        Return to Home
                    </button>
                )}
            </motion.div>
        </div>
    );

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    if (!exam) return <div className="loading">Initializing Secure Environment...</div>;
    if (questions.length === 0) return <div className="loading centered-layout">Loading Exam Questions...</div>;

    return (
        <div className="exam-layout">
            {/* Top Navigation Bar - Cisco Style */}
            <nav className="exam-nav glass">
                <div className="nav-left">
                    <div className="brand-dot"></div>
                    <h2>SECURE ASSESSMENT</h2>
                </div>
                <div className="nav-center">
                    <div className="timer-box">
                        <Clock size={16} />
                        <span>{formatTime(timeLeft)}</span>
                    </div>
                </div>
                <div className="nav-right">
                    <div className="user-info">
                        <p className="user-name">{user.nama_lengkap}</p>
                        <p className="user-nim">{user.nim}</p>
                    </div>
                </div>
            </nav>

            <main className="exam-main">
                {/* Left Progress Sidebar */}
                <aside className="exam-sidebar glass">
                    <h3>Questions</h3>
                    <div className="question-grid">
                        {questions.map((_, idx) => (
                            <button
                                key={idx}
                                className={`q-btn ${currentQuestion === idx ? 'active' : ''}`}
                                onClick={() => setCurrentQuestion(idx)}
                            >
                                {idx + 1}
                            </button>
                        ))}
                    </div>
                    <div className="monitor-status">
                        <div className="status-item">
                            <div className="pulse green"></div>
                            <span>Anti-Cheat Active</span>
                        </div>
                        <div className="status-item">
                            <div className="pulse blue"></div>
                            <span>AI Analysis Live</span>
                        </div>
                    </div>
                </aside>

                {/* Center Content */}
                <div className="exam-content">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentQuestion}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="question-card glass"
                        >
                            <div className="q-header">
                                <span className="q-number">Question {currentQuestion + 1} of {questions.length}</span>
                                <Info size={18} color="var(--text-muted)" />
                            </div>
                            <p className="q-text">{questions[currentQuestion].text}</p>

                            <div className="options-list">
                                {questions[currentQuestion].options.map((opt, i) => (
                                    <label key={i} className="option-item">
                                        <input
                                            type="radio"
                                            name={`q${currentQuestion}`}
                                            checked={answers[questions[currentQuestion].question_id] === i}
                                            onChange={() => handleAnswer(questions[currentQuestion].question_id, i)}
                                        />
                                        <span className="radio-custom"></span>
                                        <span className="opt-text">{opt}</span>
                                    </label>
                                ))}
                            </div>

                            <div className="q-footer">
                                <button className="btn-secondary" disabled={currentQuestion === 0} onClick={() => setCurrentQuestion(c => c - 1)}>
                                    <ChevronLeft size={18} /> Previous
                                </button>
                                {currentQuestion === questions.length - 1 ? (
                                    <button className="btn-primary" onClick={handleSubmitExam}>
                                        Submit Final <CheckCircle size={18} />
                                    </button>
                                ) : (
                                    <button className="btn-primary" onClick={() => setCurrentQuestion(c => c + 1)}>
                                        Next Question <ChevronRight size={18} />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    <div className="warning-banner glass">
                        <AlertCircle size={18} />
                        <span>Do not leave the browser window. All behaviors are being logged by the AI Engine.</span>
                    </div>
                </div>
            </main>

            <style>{`
        .exam-layout { height: 100vh; display: flex; flex-direction: column; }
        .exam-nav { padding: 0.75rem 2rem; display: flex; justify-content: space-between; align-items: center; margin: 1rem; }
        .nav-left { display: flex; align-items: center; gap: 12px; }
        .brand-dot { width: 12px; height: 12px; background: var(--primary); border-radius: 50%; }
        .nav-left h2 { margin: 0; font-size: 1rem; color: var(--text-muted); }
        .timer-box { display: flex; align-items: center; gap: 8px; font-weight: 700; color: var(--primary); font-family: monospace; font-size: 1.25rem; }
        
        .exam-main { flex: 1; display: flex; padding: 0 1rem 1rem; gap: 1rem; overflow: hidden; }
        .exam-sidebar { width: 260px; padding: 1.5rem; display: flex; flex-direction: column; }
        .question-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 1rem; }
        .q-btn { width: 44px; height: 44px; background: rgba(255,255,255,0.05); border: 1px solid var(--border); color: white; border-radius: 8px; }
        .q-btn.active { background: var(--primary); border-color: var(--primary); }
        
        .exam-content { flex: 1; display: flex; flex-direction: column; max-width: 900px; margin: 0 auto; width: 100%; height: 100%; justify-content: center; }
        .question-card { padding: 3rem; flex: unset; min-height: 60vh; display: flex; flex-direction: column; justify-content: center; }
        .q-number { color: var(--primary); font-weight: 600; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; }
        .q-text { font-size: 1.5rem; line-height: 1.5; margin: 1rem 0 2rem; font-weight: 600; }
        
        .option-item { display: flex; align-items: center; gap: 16px; padding: 1.25rem; margin-bottom: 1rem; border: 1px solid var(--border); border-radius: 16px; cursor: pointer; transition: all 0.2s; }
        .option-item:hover { background: rgba(255,255,255,0.05); border-color: var(--primary); transform: translateX(5px); }
        .option-item input { display: none; }
        .radio-custom { width: 24px; height: 24px; border: 2px solid var(--border); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .radio-custom::after { content: ''; width: 12px; height: 12px; background: var(--bg); border-radius: 50%; transform: scale(0); transition: transform 0.2s; }
        .option-item input:checked + .radio-custom { border-color: var(--primary); background: var(--primary); }
        .option-item input:checked + .radio-custom::after { transform: scale(1); }
        
        .q-footer { display: flex; justify-content: space-between; margin-top: auto; padding-top: 2rem; border-top: 1px solid var(--border); }
        .warning-banner { padding: 1rem; display: flex; align-items: center; gap: 12px; background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.2); font-size: 0.85rem; color: #fca5a5; }
        
        .monitor-status { margin-top: auto; padding-top: 1rem; }
        .status-item { display: flex; align-items: center; gap: 10px; font-size: 0.8rem; color: var(--text-muted); margin-top: 8px; }
        .pulse { width: 8px; height: 8px; border-radius: 50%; animation: pulse 2s infinite; }
        .pulse.green { background: var(--success); }
        .pulse.blue { background: var(--primary); }
        @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }

        .lockdown-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(10px);
            z-index: 9999;
            display: flex; align-items: center; justify-content: center;
        }
        .lockdown-card {
            background: #1e293b; border: 2px solid #ef4444;
            padding: 3rem; border-radius: 24px;
            text-align: center; max-width: 500px;
            display: flex; flex-direction: column; align-items: center; gap: 1.5rem;
            box-shadow: 0 0 50px rgba(239, 68, 68, 0.5);
        }
        .lockdown-card h2 { color: #ef4444; font-size: 2rem; margin: 0; }
        .lockdown-card p { font-size: 1.2rem; line-height: 1.6; }
      `}</style>
            {violation && <ViolationOverlay type={violation.type} message={violation.message} onDismiss={() => setViolation(null)} />}
            {result && <ResultOverlay score={result.score} correct={result.correct} total={result.total} />}
        </div>
    );
};

export default Exam;
