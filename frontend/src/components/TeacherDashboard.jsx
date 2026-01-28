import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

const TeacherDashboard = ({ onLogout }) => {
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState(null);
    const [message, setMessage] = useState('');

    // Exam Management
    const [exams, setExams] = useState([]);
    const [selectedExamId, setSelectedExamId] = useState('');
    const [newExamName, setNewExamName] = useState('');
    const [showCreate, setShowCreate] = useState(false);

    useEffect(() => {
        fetchExams();
    }, []);

    const fetchExams = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/exams');
            setExams(res.data);
            if (res.data.length > 0) setSelectedExamId(res.data[0].exam_id);
        } catch (err) { console.error(err); }
    };

    const handleCreateExam = async () => {
        if (!newExamName) return;
        try {
            await axios.post('http://localhost:5000/api/exams', { subject_name: newExamName });
            setNewExamName('');
            setShowCreate(false);
            fetchExams();
            setMessage("New exam subject created!");
            setStatus('success');
        } catch (err) {
            console.error(err);
        }
    };

    const handleFileChange = (e) => setFile(e.target.files[0]);

    const handleUpload = async () => {
        if (!file || !selectedExamId) return;
        setStatus('uploading');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('exam_id', selectedExamId);

        try {
            const res = await axios.post('http://localhost:5000/api/admin/upload-questions', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setStatus('success');
            setMessage(`Successfully uploaded ${res.data.count} questions for the selected exam!`);
        } catch (err) {
            setStatus('error');
            setMessage(err.response?.data?.error || "Upload failed");
        }
    };

    const downloadTemplate = () => {
        window.location.href = 'http://localhost:5000/api/admin/download-template';
    };

    return (
        <div className="teacher-layout centered-screen">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="dashboard-card glass"
            >
                <header className="dash-header">
                    <h1>Teacher Portal</h1>
                    <p>Manage Exam Content System</p>
                </header>

                {/* Exam Selection / Creation */}
                <div className="exam-control">
                    {!showCreate ? (
                        <div className="select-group">
                            <label>Select Subject:</label>
                            <div className="row">
                                <select value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)}>
                                    {exams.map(e => <option key={e.exam_id} value={e.exam_id}>{e.subject_name}</option>)}
                                </select>
                                <button className="btn-icon-sq" onClick={() => setShowCreate(true)} title="Add New Subject">
                                    <Plus size={20} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="create-group">
                            <input
                                placeholder="Enter Subject Name (e.g. Mathematics)"
                                value={newExamName}
                                onChange={(e) => setNewExamName(e.target.value)}
                            />
                            <div className="row">
                                <button className="btn-primary small" onClick={handleCreateExam}>Save</button>
                                <button className="btn-secondary small" onClick={() => setShowCreate(false)}>Cancel</button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="upload-section">
                    <div className="icon-area">
                        <FileSpreadsheet size={48} color="var(--primary)" />
                    </div>
                    <h2>Import Questions</h2>
                    <p>Upload Excel to: <strong>{exams.find(e => e.exam_id == selectedExamId)?.subject_name || 'Select Exam'}</strong></p>

                    <div className="upload-area">
                        <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileChange} id="file-upload" hidden />
                        <label htmlFor="file-upload" className={`drop-zone ${file ? 'has-file' : ''}`}>
                            {file ? (
                                <div className="file-info">
                                    <FileSpreadsheet size={24} />
                                    <span>{file.name}</span>
                                </div>
                            ) : (
                                <div className="drop-prompt">
                                    <Upload size={24} />
                                    <span>Click to Select File</span>
                                </div>
                            )}
                        </label>
                    </div>

                    {status === 'uploading' && <div className="loader small"></div>}

                    {status === 'success' && (
                        <div className="status-msg success">
                            <CheckCircle size={20} /> {message}
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="status-msg error">
                            <AlertCircle size={20} /> {message}
                        </div>
                    )}

                    <div className="action-buttons">
                        <button className="btn-secondary" onClick={downloadTemplate}>Download Template (.xlsx)</button>
                        <button className="btn-primary" onClick={handleUpload} disabled={!file || status === 'uploading' || !selectedExamId}>
                            {status === 'uploading' ? 'Uploading...' : 'Upload Questions'}
                        </button>
                        <button className="btn-danger" onClick={onLogout}>
                            Logout
                        </button>
                    </div>
                </div>
            </motion.div>

            <style>{`
                .centered-screen {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: radial-gradient(circle at center, #1e293b 0%, #0f172a 100%);
                    padding: 1rem;
                }
                
                .dashboard-card { 
                    width: 100%;
                    max-width: 600px;
                    padding: 3rem; 
                    display: flex; 
                    flex-direction: column; 
                    align-items: center; 
                    text-align: center; 
                    gap: 2rem; 
                    border-radius: 24px;
                    border: 1px solid rgba(255,255,255,0.1);
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                }

                .dash-header h1 { font-size: 2rem; margin: 0 0 0.5rem; background: linear-gradient(135deg, #fff 0%, #94a3b8 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .dash-header p { margin: 0; color: var(--text-muted); }
                
                .exam-control { width: 100%; text-align: left; background: rgba(0,0,0,0.2); padding: 1.5rem; border-radius: 12px; margin-bottom: 1rem; }
                .select-group label { display: block; margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.9rem; }
                .row { display: flex; gap: 8px; }
                .exam-control select { padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg); color: white; flex: 1; outline: none; }
                .btn-icon-sq { width: 40px; height: 40px; border-radius: 8px; background: var(--primary); color: white; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; }
                
                .create-group { display: flex; flex-direction: column; gap: 10px; }
                .create-group input { padding: 10px; background: var(--bg); border: 1px solid var(--border); color: white; border-radius: 8px; }
                .btn-primary.small, .btn-secondary.small { padding: 8px 16px; font-size: 0.85rem; height: 36px; }
                
                .icon-area { width: 90px; height: 90px; background: rgba(56, 189, 248, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; box-shadow: 0 0 20px rgba(56, 189, 248, 0.2); }
                
                .upload-section { width: 100%; }
                .drop-zone { border: 2px dashed var(--border); border-radius: 16px; padding: 2.5rem; width: 100%; display: flex; justify-content: center; cursor: pointer; transition: all 0.3s ease; background: rgba(0,0,0,0.2); }
                .drop-zone:hover { border-color: var(--primary); background: rgba(56, 189, 248, 0.05); transform: translateY(-2px); }
                .drop-zone.has-file { border-color: var(--success); background: rgba(34, 197, 94, 0.05); }
                
                .drop-prompt, .file-info { display: flex; flex-direction: column; align-items: center; gap: 12px; color: var(--text-muted); font-weight: 500; }
                .file-info { flex-direction: row; color: var(--success); font-weight: 700; }

                .status-msg { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 1rem; border-radius: 12px; width: 100%; font-size: 0.95rem; font-weight: 500; }
                .status-msg.success { background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.2); }
                .status-msg.error { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2); }

                .action-buttons { display: flex; flex-direction: column; gap: 10px; width: 100%; margin-top: 1rem; }
                .action-buttons button { width: 100%; justify-content: center; padding: 14px; font-size: 1rem; }
                .btn-danger { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
                .btn-danger:hover { background: rgba(239, 68, 68, 0.2); }
                
                .loader.small { width: 24px; height: 24px; border-width: 3px; margin: 0 auto; }
            `}</style>
        </div>
    );
};

export default TeacherDashboard;
