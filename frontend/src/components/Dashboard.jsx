import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Users, AlertTriangle, ShieldCheck, Activity, Search } from 'lucide-react';

const Dashboard = () => {
    const [data, setData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

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
        const interval = setInterval(fetch, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    // Stats calculation
    const totalStudents = data.length;
    let totalViolations = 0;
    let suspiciousAlerts = 0;

    const processedData = data.map(user => {
        let violations = 0;
        let scores = [];
        user.SessionMonitorings?.forEach(s => {
            s.EventLogs?.forEach(l => {
                if (l.RuleViolation) violations++;
                if (l.RFModelResult) scores.push(l.RFModelResult.conf_score);
            });
        });
        const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        totalViolations += violations;
        if (violations > 3 || avgScore > 0.7) suspiciousAlerts++;

        return { ...user, violations, avgScore };
    });

    const filteredData = processedData.filter(u =>
        u.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.nim.includes(searchTerm)
    );

    return (
        <div className="dash-layout">
            <header className="dash-header">
                <div>
                    <h1>Control Center</h1>
                    <p>Real-time Behavioral Analytics Dashboard</p>
                </div>
                <div className="search-bar glass">
                    <Search size={18} />
                    <input
                        placeholder="Search by student name or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </header>

            {/* KPI Cards */}
            <div className="kpi-grid">
                <KPICard title="Total Participants" value={totalStudents} icon={<Users />} color="var(--primary)" />
                <KPICard title="Rule Violations" value={totalViolations} icon={<AlertTriangle />} color="var(--warning)" />
                <KPICard title="Suspicious Flags" value={suspiciousAlerts} icon={<Activity />} color="var(--danger)" />
                <KPICard title="System Integrity" value="98.4%" icon={<ShieldCheck />} color="var(--success)" />
            </div>

            {/* Main Table */}
            <div className="table-container glass">
                <table className="modern-table">
                    <thead>
                        <tr>
                            <th>Student Identity</th>
                            <th>Rule Violation Count</th>
                            <th>AI Suspicion Score</th>
                            <th>Live Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map((user) => (
                            <motion.tr
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                key={user.user_id}
                            >
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
                                    <span className={`count-pill ${user.violations > 3 ? 'danger' : ''}`}>
                                        {user.violations} Events
                                    </span>
                                </td>
                                <td>
                                    <div className="score-cell">
                                        <div className="score-bar-bg">
                                            <div className="score-bar" style={{ width: `${user.avgScore * 100}%`, background: user.avgScore > 0.7 ? 'var(--danger)' : 'var(--primary)' }}></div>
                                        </div>
                                        <span>{(user.avgScore).toFixed(2)}</span>
                                    </div>
                                </td>
                                <td>
                                    {user.violations > 3 || user.avgScore > 0.7 ?
                                        <span className="badge badge-danger">High Risk</span> :
                                        <span className="badge badge-success">Normal</span>
                                    }
                                </td>
                                <td>
                                    <button className="view-details">View Logs</button>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <style>{`
        .dash-layout { padding: 2rem; max-width: 1400px; margin: 0 auto; }
        .dash-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .search-bar { display: flex; align-items: center; gap: 10px; padding: 0.75rem 1.5rem; width: 400px; }
        .search-bar input { background: transparent; border: none; padding: 0; box-shadow: none; }
        
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
        .kpi-card { padding: 1.5rem; display: flex; align-items: center; gap: 1.5rem; }
        .icon-box { width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .kpi-info h4 { margin: 0; font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; }
        .kpi-info p { margin: 0.25rem 0 0; font-size: 1.5rem; font-weight: 700; }
        
        .table-container { padding: 1rem; }
        .modern-table { width: 100%; border-collapse: collapse; }
        .modern-table th { padding: 1rem; text-align: left; color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase; border-bottom: 1px solid var(--border); }
        .modern-table td { padding: 1.25rem 1rem; border-bottom: 1px solid var(--border); }
        
        .user-cell { display: flex; align-items: center; gap: 12px; }
        .avatar { width: 40px; height: 40px; background: rgba(0, 180, 219, 0.2); color: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; }
        .u-name { margin: 0; font-weight: 600; }
        .u-nim { margin: 0; font-size: 0.75rem; color: var(--text-muted); }
        
        .count-pill { padding: 4px 12px; background: rgba(255,255,255,0.05); border-radius: 6px; font-size: 0.85rem; }
        .count-pill.danger { background: rgba(239,68,68,0.15); color: #f87171; }
        
        .score-cell { display: flex; align-items: center; gap: 10px; width: 120px; }
        .score-bar-bg { flex: 1; height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; }
        .score-bar { height: 100%; border-radius: 3px; }
        
        .view-details { background: transparent; border: 1px solid var(--border); color: var(--text-muted); font-size: 0.75rem; padding: 6px 12px; }
        .view-details:hover { border-color: var(--primary); color: var(--primary); }
      `}</style>
        </div>
    );
};

const KPICard = ({ title, value, icon, color }) => (
    <div className="kpi-card glass">
        <div className="icon-box" style={{ background: `${color}15`, color: color }}>
            {React.cloneElement(icon, { size: 28 })}
        </div>
        <div className="kpi-info">
            <h4>{title}</h4>
            <p>{value}</p>
        </div>
    </div>
);

export default Dashboard;
