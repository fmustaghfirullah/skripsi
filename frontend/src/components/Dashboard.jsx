import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Users, AlertTriangle, ShieldCheck, Activity, Search, Eye, AlertOctagon, CheckSquare } from 'lucide-react';
import EvidenceModal from './EvidenceModal';

const Dashboard = () => {
    const [data, setData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSession, setSelectedSession] = useState(null);

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/dashboard');
                setData(res.data);
            } catch (err) {
                console.error("Dashboard fetch error");
            }
        };
        fetch();
        const interval = setInterval(fetch, 2500); // Fast polling for "Live" feel
        return () => clearInterval(interval);
    }, []);

    // Process and Sort Data by Risk
    const processedData = data.map(user => {
        let violations = 0;
        let scores = [];
        const activeSession = user.SessionMonitorings?.find(s => s.status === 'ACTIVE') || user.SessionMonitorings?.[0]; // Prefer active

        if (activeSession) {
            activeSession.EventLogs?.forEach(l => {
                if (l.RuleViolation) violations++;
                if (l.RFModelResult) scores.push(l.RFModelResult.conf_score);
            });
        }

        const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        const riskLevel = (violations > 3 || avgScore > 0.6) ? 'CRITICAL' : (avgScore > 0.3 ? 'SUSPICIOUS' : 'SAFE');
        const riskValue = riskLevel === 'CRITICAL' ? 3 : riskLevel === 'SUSPICIOUS' ? 2 : 1;

        return { ...user, violations, avgScore, riskLevel, riskValue, activeSession };
    }).sort((a, b) => b.riskValue - a.riskValue); // Sort High Risk first

    const filteredData = processedData.filter(u =>
        u.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.nim.includes(searchTerm)
    );

    const activeViolations = processedData.filter(u => u.riskLevel === 'CRITICAL').length;
    const suspiciousCount = processedData.filter(u => u.riskLevel === 'SUSPICIOUS').length;

    const handleTerminate = async (sessionId) => {
        if (confirm("ARE YOU SURE? This will immediately stop the student's exam.")) {
            await axios.post('http://localhost:5000/api/admin/terminate', { session_id: sessionId });
        }
    };

    const handleWarn = async (sessionId) => {
        const msg = prompt("Enter warning message for student:");
        if (msg) {
            await axios.post('http://localhost:5000/api/admin/warn', { session_id: sessionId, message: msg });
        }
    };

    return (
        <div className="dash-layout">
            {selectedSession && (
                <EvidenceModal
                    session={selectedSession}
                    onClose={() => setSelectedSession(null)}
                />
            )}

            <header className="dash-header">
                <div>
                    <h1>Live Command Center</h1>
                    <p>Real-time Threat Monitoring Matrix</p>
                </div>
                <div className="header-actions">
                    {activeViolations > 0 && (
                        <motion.div
                            initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ repeat: Infinity, duration: 1 }}
                            className="live-alert"
                        >
                            <AlertOctagon size={20} />
                            <span>{activeViolations} CRITICAL THREATS ACTIVE</span>
                        </motion.div>
                    )}
                    <div className="search-bar glass">
                        <Search size={18} />
                        <input
                            placeholder="Search student..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            {/* KPI Cards */}
            <div className="kpi-grid">
                <KPICard title="Total Active" value={processedData.length} icon={<Users />} color="var(--primary)" />
                <KPICard title="High Risk" value={activeViolations} icon={<AlertOctagon />} color="#ef4444" />
                <KPICard title="Suspicious" value={suspiciousCount} icon={<AlertTriangle />} color="#f59e0b" />
                <KPICard title="System Status" value="Online" icon={<Activity />} color="#22c55e" />
            </div>

            {/* Main Table */}
            <div className="table-container glass">
                <table className="modern-table">
                    <thead>
                        <tr>
                            <th>Status</th>
                            <th>Student Identity</th>
                            <th>Risk Assessment</th>
                            <th>AI Trust Score</th>
                            <th>Intervention</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map((user) => (
                            <motion.tr
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1, backgroundColor: user.riskLevel === 'CRITICAL' ? 'rgba(239, 68, 68, 0.1)' : 'transparent' }}
                                key={user.user_id}
                                className={`row-${user.riskLevel.toLowerCase()}`}
                            >
                                <td>
                                    <div className={`status-dot ${user.riskLevel.toLowerCase()}`}></div>
                                </td>
                                <td>
                                    <div className="user-cell">
                                        <div className="avatar">{user.nama_lengkap[0]}</div>
                                        <div>
                                            <p className="u-name">{user.nama_lengkap}</p>
                                            <p className="u-nim">{user.nim}</p>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    {user.riskLevel === 'CRITICAL' && <span className="badge badge-danger">CRITICAL</span>}
                                    {user.riskLevel === 'SUSPICIOUS' && <span className="badge badge-warning">SUSPICIOUS</span>}
                                    {user.riskLevel === 'SAFE' && <span className="badge badge-success">SAFE</span>}
                                    <span className="violation-sub">{user.violations} flags</span>
                                </td>
                                <td>
                                    <div className="score-cell">
                                        <div className="score-bar-bg">
                                            <div className="score-bar" style={{
                                                width: `${(1 - user.avgScore) * 100}%`, // Trust score
                                                background: user.riskLevel === 'CRITICAL' ? '#ef4444' : '#22c55e'
                                            }}></div>
                                        </div>
                                        <span>{((1 - user.avgScore) * 100).toFixed(0)}% Trust</span>
                                    </div>
                                </td>
                                <td>
                                    <div className="action-buttons">
                                        <button className="btn-icon" title="View Evidence" onClick={() => setSelectedSession(user.activeSession)}>
                                            <Eye size={16} />
                                        </button>
                                        {user.activeSession?.status === 'ACTIVE' ? (
                                            <>
                                                <button className="btn-icon warn" title="Send Warning" onClick={() => handleWarn(user.activeSession.session_id)}>
                                                    <AlertTriangle size={16} />
                                                </button>
                                                <button className="btn-icon term" title="Terminate Exam" onClick={() => handleTerminate(user.activeSession.session_id)}>
                                                    <AlertOctagon size={16} />
                                                </button>
                                            </>
                                        ) : (
                                            <span className="terminated-badge">TERMINATED</span>
                                        )}
                                    </div>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <style>{`
        .dash-layout { padding: 3rem 2rem; max-width: 1400px; margin: 0 auto; min-height: 100vh; display: flex; flex-direction: column; }
        .dash-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem; }
        .header-actions { display: flex; gap: 1rem; align-items: center; }
        .live-alert { background: #ef4444; color: white; padding: 0.5rem 1rem; border-radius: 8px; font-weight: 700; display: flex; align-items: center; gap: 8px; font-size: 0.8rem; }
        .search-bar { display: flex; align-items: center; gap: 10px; padding: 0.75rem 1.5rem; width: 300px; }
        .search-bar input { background: transparent; border: none; padding: 0; box-shadow: none; }
        
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem; }
        .kpi-card { padding: 1.25rem; display: flex; align-items: center; gap: 1rem; }
        .icon-box { width: 48px; height: 48px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        .kpi-info h4 { margin: 0; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; }
        .kpi-info p { margin: 0; font-size: 1.5rem; font-weight: 700; }
        
        .modern-table { width: 100%; border-collapse: collapse; }
        .modern-table th { padding: 1rem; text-align: left; color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; border-bottom: 1px solid var(--border); }
        .modern-table td { padding: 1rem; border-bottom: 1px solid var(--border); vertical-align: middle; }
        
        .status-dot { width: 10px; height: 10px; border-radius: 50%; }
        .status-dot.critical { background: #ef4444; box-shadow: 0 0 10px #ef4444; animation: pulse 1s infinite; }
        .status-dot.suspicious { background: #f59e0b; }
        .status-dot.safe { background: #22c55e; }

        .user-cell { display: flex; align-items: center; gap: 12px; }
        .avatar { width: 36px; height: 36px; background: rgba(255,255,255,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.9rem; }
        .u-name { margin: 0; font-weight: 600; font-size: 0.9rem; }
        .u-nim { margin: 0; font-size: 0.75rem; color: var(--text-muted); }

        .violation-sub { display: block; font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; }
        
        .score-bar-bg { width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; margin-bottom: 4px; }
        .score-bar { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
        .score-cell span { font-size: 0.8rem; font-weight: 600; }

        .action-buttons { display: flex; gap: 8px; }
        .btn-icon { width: 32px; height: 32px; padding: 0; border: 1px solid var(--border); background: transparent; color: var(--text-main); border-radius: 6px; }
        .btn-icon:hover { background: rgba(255,255,255,0.1); }
        .btn-icon.warn:hover { border-color: #f59e0b; color: #f59e0b; }
        .btn-icon.term:hover { border-color: #ef4444; color: #ef4444; }
        .terminated-badge { font-size: 0.7rem; font-weight: 700; color: #ef4444; border: 1px solid #ef4444; padding: 2px 6px; border-radius: 4px; }
      `}</style>
        </div>
    );
};

const KPICard = ({ title, value, icon, color }) => (
    <div className="kpi-card glass">
        <div className="icon-box" style={{ background: `${color}20`, color: color }}>
            {React.cloneElement(icon, { size: 24 })}
        </div>
        <div className="kpi-info">
            <h4>{title}</h4>
            <p style={{ color }}>{value}</p>
        </div>
    </div>
);

export default Dashboard;
