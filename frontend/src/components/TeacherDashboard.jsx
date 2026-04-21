import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Upload, FileSpreadsheet, CheckCircle, AlertCircle,
    Plus, Trash2, Eye, EyeOff, RefreshCw, X, LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TeacherDashboard = ({ onLogout }) => {
    const [file,          setFile]          = useState(null);
    const [status,        setStatus]        = useState(null);
    const [message,       setMessage]       = useState('');
    const [failedRows,    setFailedRows]    = useState([]);

    const [exams,          setExams]          = useState([]);
    const [selectedExamId, setSelectedExamId] = useState('');
    const [newExamName,    setNewExamName]    = useState('');
    const [newDuration,    setNewDuration]    = useState(90);
    const [showCreate,     setShowCreate]     = useState(false);

    // Soal preview setelah upload
    const [questions,     setQuestions]     = useState([]);
    const [showQuestions, setShowQuestions] = useState(false);
    const [loadingQ,      setLoadingQ]      = useState(false);

    useEffect(() => { fetchExams(); }, []);

    const fetchExams = async () => {
        try {
            const res = await axios.get('/api/exams');
            setExams(res.data);
            if (res.data.length > 0 && !selectedExamId) setSelectedExamId(res.data[0].exam_id);
        } catch (err) { console.error(err); }
    };

    const fetchQuestions = async (exam_id) => {
        setLoadingQ(true);
        try {
            const res = await axios.get(`/api/admin/questions/${exam_id || selectedExamId}`);
            setQuestions(res.data);
            setShowQuestions(true);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingQ(false);
        }
    };

    const handleClearQuestions = async () => {
        if (!selectedExamId) return;
        if (!confirm('Hapus SEMUA soal untuk ujian ini? Tindakan tidak dapat dibatalkan.')) return;
        try {
            const res = await axios.post('/api/admin/clear-questions', { exam_id: selectedExamId });
            setMessage(`${res.data.deleted || 0} soal berhasil dihapus.`);
            setStatus('success');
            setQuestions([]);
        } catch (err) {
            setMessage('Gagal menghapus soal.');
            setStatus('error');
        }
    };

    const handleDeleteQuestion = async (qId) => {
        try {
            await axios.delete(`/api/admin/questions/${qId}`);
            setQuestions(qs => qs.filter(q => q.question_id !== qId));
        } catch (err) {
            alert('Gagal menghapus soal');
        }
    };

    const handleCreateExam = async () => {
        if (!newExamName) return;
        try {
            const res = await axios.post('/api/exams', { subject_name: newExamName, duration_minutes: newDuration });
            setNewExamName('');
            setNewDuration(90);
            setShowCreate(false);
            fetchExams();
            setSelectedExamId(res.data.exam_id);
            setMessage(`Ujian "${res.data.subject_name}" berhasil dibuat!`);
            setStatus('success');
        } catch (err) {
            setMessage(err.response?.data?.error || 'Gagal membuat ujian');
            setStatus('error');
        }
    };

    const handleToggleExamActive = async (exam) => {
        try {
            await axios.put(`/api/exams/${exam.exam_id}`, { is_active: !exam.is_active });
            fetchExams();
        } catch (err) { console.error(err); }
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setStatus(null);
        setFailedRows([]);
        setQuestions([]);
        setShowQuestions(false);
    };

    const handleUpload = async () => {
        if (!file || !selectedExamId) return;
        setStatus('uploading');
        setFailedRows([]);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('exam_id', selectedExamId);

        try {
            const res = await axios.post('/api/admin/upload-questions', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setStatus('success');
            setMessage(`✅ ${res.data.count} soal berhasil diupload untuk "${res.data.exam_name}"`);
            if (res.data.failed_rows?.length > 0) {
                setFailedRows(res.data.failed_rows);
            }
            // Auto-fetch preview soal
            fetchQuestions(selectedExamId);
        } catch (err) {
            setStatus('error');
            setMessage(err.response?.data?.error || 'Upload gagal');
        }
    };

    const downloadTemplate  = () => window.open('/api/admin/download-template', '_blank');
    const selectedExamName  = exams.find(e => e.exam_id == selectedExamId)?.subject_name || 'Pilih Ujian';

    return (
        <div className="teacher-layout centered-screen">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="dashboard-card glass">
                <header className="dash-header">
                    <h1>Teacher Portal</h1>
                    <p>Kelola Konten &amp; Soal Ujian</p>
                </header>

                {/* ── Exam Selection ── */}
                <div className="exam-control">
                    <div className="ec-header">
                        <label>Pilih Mata Ujian</label>
                        <button className="btn-link-sm" onClick={() => setShowCreate(v => !v)}>
                            {showCreate ? '− Batal' : '+ Buat Baru'}
                        </button>
                    </div>

                    {showCreate ? (
                        <div className="create-group">
                            <input
                                placeholder="Nama Mata Ujian (cth: Matematika Dasar)"
                                value={newExamName}
                                onChange={e => setNewExamName(e.target.value)}
                            />
                            <div className="row" style={{ gap: '8px', alignItems: 'center' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Durasi (menit):</label>
                                <input type="number" value={newDuration} min={10} max={300} style={{ width: '80px' }} onChange={e => setNewDuration(e.target.value)} />
                                <button className="btn-primary small" onClick={handleCreateExam}>Simpan</button>
                                <button className="btn-secondary small" onClick={() => setShowCreate(false)}>Batal</button>
                            </div>
                        </div>
                    ) : (
                        <div className="row">
                            <select value={selectedExamId} onChange={e => { setSelectedExamId(e.target.value); setShowQuestions(false); setQuestions([]); }}>
                                {exams.map(e => (
                                    <option key={e.exam_id} value={e.exam_id}>
                                        {e.subject_name} ({e.duration_minutes} mnt) {e.is_active ? '🟢' : '🔴'}
                                    </option>
                                ))}
                            </select>
                            {exams.find(e => e.exam_id == selectedExamId) && (
                                <button
                                    className={`toggle-btn ${exams.find(e => e.exam_id == selectedExamId)?.is_active ? 'active' : 'inactive'}`}
                                    onClick={() => handleToggleExamActive(exams.find(e => e.exam_id == selectedExamId))}
                                    title="Toggle aktif/nonaktif ujian"
                                >
                                    {exams.find(e => e.exam_id == selectedExamId)?.is_active ? 'Aktif' : 'Nonaktif'}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Upload Section ── */}
                <div className="upload-section">
                    <div className="icon-area"><FileSpreadsheet size={48} color="var(--primary)" /></div>
                    <h2>Import Soal dari Excel</h2>
                    <p>Upload ke: <strong>{selectedExamName}</strong></p>

                    <div className="upload-area">
                        <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} id="file-upload" hidden />
                        <label htmlFor="file-upload" className={`drop-zone ${file ? 'has-file' : ''}`}>
                            {file ? (
                                <div className="file-info"><FileSpreadsheet size={22} /><span>{file.name}</span></div>
                            ) : (
                                <div className="drop-prompt"><Upload size={22} /><span>Klik untuk pilih file .xlsx</span></div>
                            )}
                        </label>
                    </div>

                    {/* Format hint */}
                    <div className="format-hint">
                        Kolom wajib: <code>question</code>, <code>option_0</code>–<code>option_3</code>, <code>correct_index</code> (0–3)
                    </div>

                    {/* Status */}
                    {status === 'uploading' && <div className="loader small" style={{ margin: '0.75rem auto' }}></div>}
                    {status === 'success' && <div className="status-msg success"><CheckCircle size={18} /> {message}</div>}
                    {status === 'error'   && <div className="status-msg error"><AlertCircle size={18} /> {message}</div>}

                    {/* Failed rows */}
                    {failedRows.length > 0 && (
                        <div className="failed-rows">
                            <p>⚠️ {failedRows.length} baris gagal diproses:</p>
                            <ul>
                                {failedRows.map((r, i) => (
                                    <li key={i}>Baris {r.row_number}: {r.reason}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="action-buttons">
                        <button className="btn-secondary" onClick={downloadTemplate}>📥 Download Template</button>
                        <button className="btn-primary" onClick={handleUpload} disabled={!file || status === 'uploading' || !selectedExamId}>
                            {status === 'uploading' ? 'Mengupload...' : '⬆ Upload Soal'}
                        </button>
                        {selectedExamId && (
                            <button className="btn-secondary" onClick={() => fetchQuestions()} disabled={loadingQ}>
                                <Eye size={15} /> {loadingQ ? 'Memuat...' : 'Lihat Soal'}
                            </button>
                        )}
                        <button className="btn-danger" onClick={handleClearQuestions} disabled={!selectedExamId}>
                            <Trash2 size={15} /> Hapus Semua Soal
                        </button>
                    </div>
                </div>

                {/* ── Question Preview — full-width LMS style ── */}
                <AnimatePresence>
                    {showQuestions && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="questions-preview"
                        >
                            {/* Header bar */}
                            <div className="qp-header">
                                <div className="qp-title">
                                    <span className="qp-icon">📋</span>
                                    <div>
                                        <h3>Bank Soal</h3>
                                        <p>{questions.length} soal ditemukan</p>
                                    </div>
                                </div>
                                <button className="btn-icon-sm" onClick={() => setShowQuestions(false)}><X size={16} /></button>
                            </div>

                            {/* Question list — LMS style */}
                            {questions.length === 0 ? (
                                <div className="q-empty">Belum ada soal untuk ujian ini.</div>
                            ) : (
                                <div className="q-list">
                                    {questions.map((q, i) => (
                                        <div key={q.question_id} className="q-card">
                                            {/* Question header */}
                                            <div className="q-card-head">
                                                <span className="q-number">Soal {i + 1}</span>
                                                <button
                                                    className="q-delete-btn"
                                                    onClick={() => handleDeleteQuestion(q.question_id)}
                                                    title="Hapus soal ini"
                                                >
                                                    <Trash2 size={13} /> Hapus
                                                </button>
                                            </div>

                                            {/* Question text */}
                                            <p className="q-text">{q.question_text}</p>

                                            {/* Options — 2 column grid like Moodle */}
                                            <div className="q-options-grid">
                                                {q.options.map((opt, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`q-option-card ${idx === q.correct_option ? 'correct' : ''}`}
                                                    >
                                                        <span className="q-option-letter">{['A','B','C','D'][idx]}</span>
                                                        <span className="q-option-text">{opt}</span>
                                                        {idx === q.correct_option && (
                                                            <span className="q-correct-tag">✓ Kunci</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                <button className="btn-danger full-w" onClick={onLogout}><LogOut size={16} /> Logout</button>
            </motion.div>

            <style>{`
                .centered-screen { width: 100%; min-height: 100vh; display: flex; align-items: flex-start; justify-content: center; background: radial-gradient(circle at center, #1e293b 0%, #0f172a 100%); padding: 2rem 1rem; }
                .dashboard-card { width: 100%; max-width: 760px; padding: 2.5rem; display: flex; flex-direction: column; gap: 1.5rem; border-radius: 20px; }
                .dash-header { text-align: center; }
                .dash-header h1 { font-size: 1.75rem; margin: 0 0 0.3rem; background: linear-gradient(135deg, #fff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .dash-header p  { margin: 0; color: var(--text-muted); font-size: 0.9rem; }
                
                .exam-control { background: rgba(0,0,0,0.2); padding: 1.25rem; border-radius: 12px; }
                .ec-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; }
                .ec-header label { font-size: 0.78rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
                .btn-link-sm { background: transparent; border: none; color: var(--primary); font-size: 0.82rem; cursor: pointer; padding: 0; }
                .row { display: flex; gap: 8px; align-items: center; }
                .exam-control select { flex: 1; padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg); color: white; outline: none; }
                .toggle-btn { padding: 8px 14px; border-radius: 8px; font-size: 0.78rem; font-weight: 700; border: none; cursor: pointer; }
                .toggle-btn.active   { background: rgba(34,197,94,0.15); color: #86efac; border: 1px solid rgba(34,197,94,0.3); }
                .toggle-btn.inactive { background: rgba(239,68,68,0.12); color: #fca5a5; border: 1px solid rgba(239,68,68,0.3); }
                .create-group { display: flex; flex-direction: column; gap: 10px; }
                .btn-primary.small, .btn-secondary.small { padding: 8px 14px; font-size: 0.82rem; }
                
                .upload-section { display: flex; flex-direction: column; align-items: center; gap: 1rem; width: 100%; }
                .icon-area { width: 80px; height: 80px; background: rgba(0,180,219,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
                .upload-section h2 { margin: 0; font-size: 1.25rem; }
                .upload-section > p { margin: 0; color: var(--text-muted); }
                
                .drop-zone { border: 2px dashed var(--border); border-radius: 14px; padding: 2rem; width: 100%; display: flex; justify-content: center; cursor: pointer; transition: all 0.25s; background: rgba(0,0,0,0.2); }
                .drop-zone:hover  { border-color: var(--primary); background: rgba(0,180,219,0.05); }
                .drop-zone.has-file { border-color: var(--success); background: rgba(34,197,94,0.05); }
                .drop-prompt, .file-info { display: flex; align-items: center; gap: 12px; color: var(--text-muted); font-weight: 500; flex-direction: column; }
                .file-info { flex-direction: row; color: var(--success); }
                
                .format-hint { font-size: 0.78rem; color: var(--text-muted); text-align: center; }
                .format-hint code { background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; font-family: monospace; }
                
                .status-msg { display: flex; align-items: center; gap: 10px; padding: 0.85rem 1rem; border-radius: 10px; width: 100%; font-size: 0.9rem; font-weight: 500; }
                .status-msg.success { background: rgba(34,197,94,0.12); color: #86efac; border: 1px solid rgba(34,197,94,0.2); }
                .status-msg.error   { background: rgba(239,68,68,0.12); color: #fca5a5; border: 1px solid rgba(239,68,68,0.2); }
                
                .failed-rows { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); border-radius: 10px; padding: 0.85rem 1rem; width: 100%; }
                .failed-rows p  { margin: 0 0 0.5rem; font-size: 0.85rem; color: #f59e0b; font-weight: 600; }
                .failed-rows ul { margin: 0; padding-left: 1.25rem; }
                .failed-rows li { font-size: 0.8rem; color: #fca5a5; padding: 2px 0; }
                
                .action-buttons { display: flex; flex-wrap: wrap; gap: 8px; width: 100%; }
                .action-buttons button, .action-buttons a { flex: 1; min-width: 130px; justify-content: center; padding: 10px; font-size: 0.85rem; display: flex; align-items: center; gap: 6px; text-decoration: none; }
                .btn-primary  { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: white; border: none; border-radius: 8px; }
                .btn-primary:hover:not(:disabled) { transform: translateY(-1px); }
                .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
                .btn-secondary { background: rgba(255,255,255,0.06); border: 1px solid var(--border); color: var(--text-muted); border-radius: 8px; }
                .btn-secondary:hover { border-color: var(--primary); color: var(--primary); }
                .btn-danger { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); border-radius: 8px; }
                .btn-danger:hover:not(:disabled) { background: rgba(239,68,68,0.2); }
                .full-w { width: 100%; justify-content: center; padding: 12px; font-size: 0.95rem; }
                
                .loader.small { width: 24px; height: 24px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
                
                /* ── Question Preview — Modern LMS Style ── */
                .questions-preview {
                    width: 100%;
                    background: var(--bg);
                    border: 1px solid var(--border);
                    border-radius: 16px;
                    overflow: hidden;
                }
                .qp-header {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 1rem 1.5rem;
                    border-bottom: 1px solid var(--border);
                    background: rgba(0,180,219,0.05);
                }
                .qp-title { display: flex; align-items: center; gap: 0.75rem; }
                .qp-icon { font-size: 1.25rem; }
                .qp-title h3 { margin: 0; font-size: 1rem; }
                .qp-title p  { margin: 0; font-size: 0.75rem; color: var(--text-muted); }
                .btn-icon-sm { background: transparent; border: 1px solid var(--border); border-radius: 6px; padding: 6px 8px; color: var(--text-muted); display:flex; align-items:center; }
                .btn-icon-sm:hover { color: white; border-color: var(--primary); }

                .q-empty { padding: 2rem; text-align: center; color: var(--text-muted); font-size: 0.9rem; }

                /* Question list scroll container */
                .q-list { max-height: 560px; overflow-y: auto; display: flex; flex-direction: column; }

                /* Individual question card — LMS style */
                .q-card {
                    padding: 1.25rem 1.5rem;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    flex-direction: column;
                    gap: 0.85rem;
                }
                .q-card:last-child { border-bottom: none; }
                .q-card:hover { background: rgba(255,255,255,0.015); }

                /* Question header row */
                .q-card-head {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .q-number {
                    font-size: 0.72rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    color: var(--primary);
                    background: rgba(0,180,219,0.1);
                    padding: 3px 10px;
                    border-radius: 20px;
                    border: 1px solid rgba(0,180,219,0.25);
                }
                .q-delete-btn {
                    background: transparent;
                    border: 1px solid transparent;
                    color: var(--text-muted);
                    font-size: 0.75rem;
                    padding: 4px 8px;
                    border-radius: 6px;
                    opacity: 0;
                    display: flex; align-items: center; gap: 4px;
                    transition: all 0.15s;
                }
                .q-card:hover .q-delete-btn { opacity: 1; }
                .q-delete-btn:hover { border-color: #ef4444; color: #ef4444; background: rgba(239,68,68,0.08); }

                /* Question text — full width, left-aligned */
                .q-text {
                    margin: 0;
                    font-size: 0.95rem;
                    line-height: 1.65;
                    color: var(--text-main);
                    font-weight: 500;
                }

                /* Options grid — 2 columns like modern LMS */
                .q-options-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 0.5rem;
                }
                @media (max-width: 600px) {
                    .q-options-grid { grid-template-columns: 1fr; }
                }

                /* Option card */
                .q-option-card {
                    display: flex;
                    align-items: center;
                    gap: 0.6rem;
                    padding: 0.6rem 0.85rem;
                    border-radius: 8px;
                    border: 1px solid rgba(255,255,255,0.07);
                    background: rgba(255,255,255,0.03);
                    font-size: 0.86rem;
                    color: var(--text-muted);
                    transition: background 0.15s;
                    position: relative;
                }
                /* Correct answer highlight */
                .q-option-card.correct {
                    background: rgba(34,197,94,0.1);
                    border-color: rgba(34,197,94,0.35);
                    color: #dcfce7;
                    font-weight: 600;
                }
                .q-option-letter {
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.08);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 0.72rem;
                    font-weight: 800;
                    flex-shrink: 0;
                    color: var(--text-main);
                }
                .q-option-card.correct .q-option-letter {
                    background: rgba(34,197,94,0.25);
                    color: #86efac;
                }
                .q-option-text { flex: 1; }
                .q-correct-tag {
                    font-size: 0.65rem;
                    background: rgba(34,197,94,0.2);
                    color: #86efac;
                    padding: 2px 6px;
                    border-radius: 4px;
                    border: 1px solid rgba(34,197,94,0.3);
                    white-space: nowrap;
                }
            `}</style>
        </div>
    );
};

export default TeacherDashboard;
