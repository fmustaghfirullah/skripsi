import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle, ChevronRight, ChevronLeft, AlertCircle, Info } from 'lucide-react';
import useMonitor from '../hooks/useMonitor';

const Exam = ({ user }) => {
    const [session, setSession] = useState(null);
    const [exam, setExam] = useState(null);
    const [timeLeft, setTimeLeft] = useState(3600); // 1 hour mock timer
    const [currentQuestion, setCurrentQuestion] = useState(0);

    useEffect(() => {
        const start = async () => {
            try {
                const res = await axios.post('http://localhost:5000/api/start-exam', { user_id: user.user_id });
                setSession(res.data.session_id);
                setExam(res.data.exam);
            } catch (err) {
                console.error("Exam start error");
            }
        };
        start();

        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [user]);

    useMonitor(session);

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    if (!exam) return <div className="loading">Initializing Secure Environment...</div>;

    const questions = [
        {
            text: "Apa tujuan utama penggunaan algoritma Random Forest dalam sistem CBT Anti-Cheating ini?",
            options: ["Optimasi database", "Klasifikasi perilaku (Normal vs Curang)", "Enkripsi soal ujian", "Meningkatkan kecepatan render UI"]
        },
        {
            text: "Event JavaScript manakah yang digunakan untuk mendeteksi saat user berpindah tab?",
            options: ["onClick", "visibilitychange", "onHover", "onKeyPress"]
        }
    ];

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
                                        <input type="radio" name={`q${currentQuestion}`} />
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
                                    <button className="btn-primary" onClick={() => alert('Submit successful!')}>
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
        
        .exam-content { flex: 1; display: flex; flex-direction: column; gap: 1rem; max-width: 900px; margin: 0 auto; width: 100%; }
        .question-card { padding: 2.5rem; flex: 1; }
        .q-number { color: var(--primary); font-weight: 600; font-size: 0.9rem; }
        .q-text { font-size: 1.25rem; line-height: 1.6; margin: 1.5rem 0 2rem; }
        
        .option-item { display: flex; align-items: center; gap: 12px; padding: 1rem; margin-bottom: 0.75rem; border: 1px solid var(--border); border-radius: 12px; cursor: pointer; }
        .option-item:hover { background: rgba(255,255,255,0.03); }
        .option-item input { display: none; }
        .radio-custom { width: 20px; height: 20px; border: 2px solid var(--border); border-radius: 50%; }
        .option-item input:checked + .radio-custom { border-color: var(--primary); background: var(--primary); box-shadow: inset 0 0 0 4px var(--bg); }
        
        .q-footer { display: flex; justify-content: space-between; margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--border); }
        .warning-banner { padding: 1rem; display: flex; align-items: center; gap: 12px; background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.2); font-size: 0.85rem; color: #fca5a5; }
        
        .monitor-status { margin-top: auto; padding-top: 1rem; }
        .status-item { display: flex; align-items: center; gap: 10px; font-size: 0.8rem; color: var(--text-muted); margin-top: 8px; }
        .pulse { width: 8px; height: 8px; border-radius: 50%; animation: pulse 2s infinite; }
        .pulse.green { background: var(--success); }
        .pulse.blue { background: var(--primary); }
        @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
      `}</style>
        </div>
    );
};

export default Exam;
