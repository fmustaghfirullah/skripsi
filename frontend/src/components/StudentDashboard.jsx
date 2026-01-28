import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronRight, LogOut, Search } from 'lucide-react';
import { motion } from 'framer-motion';

const StudentDashboard = ({ user, onLogout }) => {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchExams = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/exams');
                setExams(res.data);
            } catch (err) {
                console.error("Failed to fetch exams");
            } finally {
                setLoading(false);
            }
        };
        fetchExams();
    }, []);

    const startExam = (examId) => {
        if (confirm("Are you ready to start this exam? Tiimer will begin immediately.")) {
            navigate(`/exam/${examId}`);
        }
    };

    return (
        <div className="student-dash centered-layout">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="dashboard-container"
            >
                <header className="dash-header">
                    <div className="user-welcome">
                        <h1>Welcome, {user.nama_lengkap.split(' ')[0]}! 👋</h1>
                        <p>Select a subject to begin your assessment.</p>
                    </div>
                    <button className="btn-secondary" onClick={onLogout}>
                        <LogOut size={18} /> Logout
                    </button>
                </header>

                <div className="exams-grid">
                    {loading ? (
                        <div className="loader"></div>
                    ) : exams.length === 0 ? (
                        <div className="empty-state">
                            <p>No exams available at the moment.</p>
                        </div>
                    ) : (
                        exams.map(exam => (
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="exam-card glass"
                                key={exam.exam_id}
                            >
                                <div className="card-icon">
                                    <BookOpen size={32} color="white" />
                                </div>
                                <div className="card-info">
                                    <h3>{exam.subject_name}</h3>
                                    <p>Standard Assessment</p>
                                </div>
                                <button className="btn-primary" onClick={() => startExam(exam.exam_id)}>
                                    Start <ChevronRight size={18} />
                                </button>
                            </motion.div>
                        ))
                    )}
                </div>
            </motion.div>

            <style>{`
                .student-dash { background: radial-gradient(circle at top left, #1e293b 0%, #0f172a 100%); }
                .dashboard-container { width: 100%; max-width: 1000px; }
                
                .dash-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3rem; }
                .user-welcome h1 { font-size: 2rem; margin: 0 0 0.5rem; }
                .user-welcome p { color: var(--text-muted); margin: 0; }
                
                .exams-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
                
                .exam-card { padding: 2rem; display: flex; flex-direction: column; gap: 1.5rem; align-items: flex-start; transition: all 0.3s ease; border-top: 1px solid rgba(255,255,255,0.1); }
                .exam-card:hover { border-color: var(--primary); box-shadow: 0 10px 30px -10px rgba(0, 180, 219, 0.3); }
                
                .card-icon { width: 60px; height: 60px; background: linear-gradient(135deg, var(--primary), var(--secondary)); border-radius: 16px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.2); }
                
                .card-info h3 { margin: 0 0 0.5rem; font-size: 1.25rem; }
                .card-info p { margin: 0; color: var(--text-muted); font-size: 0.9rem; }
                
                .exam-card button { width: 100%; justify-content: space-between; margin-top: auto; }
            `}</style>
        </div>
    );
};

export default StudentDashboard;
