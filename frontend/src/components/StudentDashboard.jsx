import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronRight, LogOut, Lock, Clock, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

const StudentDashboard = ({ user, onLogout }) => {
    const [exams,   setExams]   = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchExams = async () => {
            try {
                // Server otomatis inject info enrollment (attempts, enrolled, dll)
                const res = await axios.get('/api/exams');
                setExams(res.data);
            } catch (err) {
                console.error('Gagal memuat daftar ujian');
            } finally {
                setLoading(false);
            }
        };
        fetchExams();
    }, []);

    const startExam = (exam) => {
        if (!exam.enrolled) return;
        if (exam.attempts_remaining <= 0) return;
        if (confirm(`Mulai "${exam.subject_name}"?\n\nDurasi: ${exam.duration_minutes} menit\nPercobaan tersisa: ${exam.attempts_remaining}x\n\nWaktu akan segera berjalan!`)) {
            navigate(`/exam/${exam.exam_id}`);
        }
    };

    const getAttemptColor = (remaining, max) => {
        if (remaining === 0) return '#ef4444';
        if (remaining === 1) return '#f59e0b';
        return '#22c55e';
    };

    return (
        <div className="student-dash centered-layout">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="dashboard-container">
                <header className="dash-header">
                    <div className="user-welcome">
                        <h1>Halo, {user.nama_lengkap.split(' ')[0]}! 👋</h1>
                        <p>NIM: <strong>{user.nim}</strong> · Pilih ujian yang tersedia di bawah ini.</p>
                    </div>
                    <button className="btn-secondary logout-btn" onClick={onLogout}>
                        <LogOut size={18} /> Logout
                    </button>
                </header>

                <div className="exams-grid">
                    {loading ? (
                        <div className="loader-wrap"><div className="loader"></div></div>
                    ) : exams.length === 0 ? (
                        <div className="empty-state">
                            <BookOpen size={48} style={{ opacity: 0.3 }} />
                            <p>Belum ada ujian yang tersedia saat ini.</p>
                        </div>
                    ) : (
                        exams.map(exam => {
                            const canStart    = exam.enrolled && exam.attempts_remaining > 0;
                            const isExhausted = exam.enrolled && exam.attempts_remaining <= 0;
                            const notEnrolled = !exam.enrolled;
                            const attemptColor = getAttemptColor(exam.attempts_remaining, exam.max_attempts);

                            return (
                                <motion.div whileHover={canStart ? { scale: 1.02 } : {}} className={`exam-card glass ${!canStart ? 'disabled' : ''}`} key={exam.exam_id}>
                                    <div className="card-top">
                                        <div className={`card-icon ${canStart ? '' : 'greyed'}`}>
                                            {canStart ? <BookOpen size={28} color="white" /> : <Lock size={24} color="#64748b" />}
                                        </div>
                                        {/* Attempt badge */}
                                        {exam.enrolled && (
                                            <span className="attempt-badge" style={{ background: `${attemptColor}22`, color: attemptColor, borderColor: `${attemptColor}44` }}>
                                                {exam.attempts_remaining}/{exam.max_attempts} sisa
                                            </span>
                                        )}
                                    </div>

                                    <div className="card-info">
                                        <h3>{exam.subject_name}</h3>
                                        <div className="card-meta">
                                            <span><Clock size={13} /> {exam.duration_minutes || 90} menit</span>
                                        </div>
                                    </div>

                                    {/* Status Messages */}
                                    {notEnrolled && (
                                        <div className="card-warning">
                                            🔒 Anda belum terdaftar di ujian ini. Hubungi admin.
                                        </div>
                                    )}
                                    {isExhausted && (
                                        <div className="card-warning danger">
                                            ⛔ Batas percobaan habis. Hubungi admin untuk perpanjangan.
                                        </div>
                                    )}

                                    <button
                                        className={`btn-start ${canStart ? 'btn-primary' : 'btn-disabled'}`}
                                        onClick={() => startExam(exam)}
                                        disabled={!canStart}
                                    >
                                        {canStart ? (<>Mulai Ujian <ChevronRight size={18} /></>) :
                                         isExhausted ? (<><RotateCcw size={16} /> Habis</>) :
                                         (<><Lock size={16} /> Terkunci</>)}
                                    </button>
                                </motion.div>
                            );
                        })
                    )}
                </div>
            </motion.div>

            <style>{`
                .student-dash { width: 100%; background: radial-gradient(circle at top left, #1e293b 0%, #0f172a 100%); padding: 2rem; display: flex; justify-content: center; }
                .dashboard-container { width: 100%; max-width: 1200px; }
                
                .dash-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2.5rem; flex-wrap: wrap; gap: 1rem; }
                .user-welcome h1 { font-size: 1.75rem; margin: 0 0 0.4rem; }
                .user-welcome p  { color: var(--text-muted); margin: 0; font-size: 0.9rem; }
                .user-welcome strong { color: var(--primary); }
                .logout-btn { padding: 0.55rem 1.1rem; font-size: 0.85rem; background: rgba(255,255,255,0.06); border: 1px solid var(--border); color: var(--text-muted); border-radius: 9px; display: flex; align-items: center; gap: 6px; }
                .logout-btn:hover { border-color: var(--danger); color: var(--danger); }
                
                .exams-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
                
                .exam-card { padding: 1.75rem; display: flex; flex-direction: column; gap: 1rem; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); transition: all 0.3s ease; }
                .exam-card:not(.disabled):hover { border-color: var(--primary); box-shadow: 0 8px 30px -10px rgba(0,180,219,0.3); }
                .exam-card.disabled { opacity: 0.75; }
                
                .card-top { display: flex; align-items: center; justify-content: space-between; }
                .card-icon { width: 52px; height: 52px; background: linear-gradient(135deg, var(--primary), var(--primary-dark)); border-radius: 14px; display: flex; align-items: center; justify-content: center; }
                .card-icon.greyed { background: rgba(100,116,139,0.2); }
                
                .attempt-badge { font-size: 0.72rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 20px; border: 1px solid; }
                
                .card-info h3 { margin: 0 0 0.4rem; font-size: 1.15rem; line-height: 1.3; }
                .card-meta { display: flex; align-items: center; gap: 1rem; font-size: 0.8rem; color: var(--text-muted); }
                .card-meta span { display: flex; align-items: center; gap: 4px; }
                
                .card-warning { font-size: 0.78rem; color: #f59e0b; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); border-radius: 8px; padding: 0.55rem 0.85rem; line-height: 1.4; }
                .card-warning.danger { color: #fca5a5; background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.2); }
                
                .btn-start { width: 100%; padding: 0.75rem; border-radius: 10px; font-size: 0.9rem; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: auto; }
                .btn-start.btn-primary { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: white; border: none; box-shadow: 0 4px 14px rgba(0,180,219,0.3); }
                .btn-start.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(0,180,219,0.4); }
                .btn-start.btn-disabled { background: rgba(255,255,255,0.05); color: var(--text-muted); border: 1px solid var(--border); cursor: not-allowed; }
                
                .loader-wrap { grid-column: 1/-1; display: flex; justify-content: center; padding: 4rem; }
                .loader { width: 40px; height: 40px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
                .empty-state { grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; gap: 1rem; }
            `}</style>
        </div>
    );
};

export default StudentDashboard;
