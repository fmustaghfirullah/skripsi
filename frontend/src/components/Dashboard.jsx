import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, Users, BookOpen, Settings, AlertTriangle, AlertOctagon,
    Search, Eye, UserPlus, Upload, Trash2, Edit2, Check, X,
    RefreshCw, Shield, LogOut, RotateCcw, Download, Terminal,
    Key, ChevronDown, ChevronRight, Plus, Database, BarChart2
} from 'lucide-react';
import EvidenceModal from './EvidenceModal';

// ══════════════════════════════════════════════════════════════
// SUPERADMIN DASHBOARD — 4 TABS: Monitor | Pengguna | Ujian | Sistem
// ══════════════════════════════════════════════════════════════

const TABS = [
    { id: 'monitor',   label: 'Monitor',   icon: <Activity size={15} /> },
    { id: 'pengguna',  label: 'Pengguna',  icon: <Users size={15} /> },
    { id: 'ujian',     label: 'Ujian',     icon: <BookOpen size={15} /> },
    { id: 'sistem',    label: 'Sistem',    icon: <Settings size={15} /> },
];

const Dashboard = ({ onLogout }) => {
    const [activeTab, setActiveTab]   = useState('monitor');
    const [msg,       setMsg]         = useState({ text: '', type: '' });

    const showMsg = (text, type = 'success') => {
        setMsg({ text, type });
        setTimeout(() => setMsg({ text: '', type: '' }), 4000);
    };

    return (
        <div className="sa-shell">
            {/* ── Sidebar Navigation ── */}
            <aside className="sa-sidebar glass">
                <div className="sidebar-brand">
                    <div className="brand-icon"><Shield size={22} color="#00b4db" /></div>
                    <div>
                        <p className="brand-title">CBT Secure</p>
                        <p className="brand-sub">Superadmin</p>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </nav>

                <button className="nav-item logout-nav" onClick={onLogout}>
                    <LogOut size={15} /><span>Logout</span>
                </button>
            </aside>

            {/* ── Main Content ── */}
            <main className="sa-main">
                {msg.text && (
                    <div className={`sa-toast ${msg.type}`}>
                        {msg.type === 'error' ? '❌' : '✅'} {msg.text}
                    </div>
                )}

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.18 }}
                        style={{ height: '100%' }}
                    >
                        {activeTab === 'monitor'  && <MonitorTab showMsg={showMsg} />}
                        {activeTab === 'pengguna' && <PenggunaTab showMsg={showMsg} />}
                        {activeTab === 'ujian'    && <UjianTab showMsg={showMsg} />}
                        {activeTab === 'sistem'   && <SistemTab showMsg={showMsg} />}
                    </motion.div>
                </AnimatePresence>
            </main>

            <style>{`
                /* ── Shell Layout ── */
                .sa-shell { display: flex; height: 100vh; width: 100%; overflow: hidden; }
                .sa-sidebar {
                    width: 210px; min-width: 210px;
                    display: flex; flex-direction: column;
                    padding: 1.25rem 0.75rem; gap: 0.5rem;
                    border-radius: 0; border-top: none; border-bottom: none; border-left: none;
                    border-right: 1px solid var(--border);
                    background: rgba(15, 23, 42, 0.95);
                    backdrop-filter: blur(16px);
                }
                .sidebar-brand { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.5rem 1.25rem; border-bottom: 1px solid var(--border); margin-bottom: 0.5rem; }
                .brand-icon { width: 40px; height: 40px; background: rgba(0,180,219,0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .brand-title { margin: 0; font-size: 0.9rem; font-weight: 700; color: white; }
                .brand-sub   { margin: 0; font-size: 0.7rem; color: var(--primary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }

                .sidebar-nav { display: flex; flex-direction: column; gap: 4px; flex: 1; }
                .nav-item {
                    display: flex; align-items: center; gap: 10px;
                    padding: 0.65rem 0.85rem; border-radius: 10px;
                    background: transparent; border: none;
                    color: var(--text-muted); font-size: 0.875rem; font-weight: 500;
                    cursor: pointer; text-align: left; width: 100%;
                    transition: all 0.15s;
                }
                .nav-item:hover  { background: rgba(255,255,255,0.06); color: white; }
                .nav-item.active { background: rgba(0,180,219,0.15); color: var(--primary); border: 1px solid rgba(0,180,219,0.25); }
                .logout-nav { margin-top: auto; color: var(--text-muted); }
                .logout-nav:hover { background: rgba(239,68,68,0.1); color: #ef4444; }

                .sa-main { flex: 1; overflow-y: auto; position: relative; }
                .tab-page { padding: 2rem; max-width: 1300px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem; min-height: 100%; }
                .tab-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
                .tab-header-info h1 { font-size: 1.5rem; margin: 0 0 0.2rem; }
                .tab-header-info p  { margin: 0; color: var(--text-muted); font-size: 0.85rem; }

                /* Toast */
                .sa-toast {
                    position: fixed; top: 1rem; right: 1rem; z-index: 9999;
                    padding: 0.75rem 1.25rem; border-radius: 10px; font-size: 0.875rem; font-weight: 500;
                    animation: toastIn 0.3s ease;
                }
                .sa-toast.success { background: rgba(34,197,94,0.15); border: 1px solid rgba(34,197,94,0.3); color: #86efac; }
                .sa-toast.error   { background: rgba(239,68,68,0.15);  border: 1px solid rgba(239,68,68,0.3);  color: #fca5a5; }
                @keyframes toastIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }

                /* KPI Cards */
                .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
                .kpi-card { padding: 1.25rem; display: flex; align-items: center; gap: 1rem; border-radius: 14px; }
                .kpi-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .kpi-info h4 { margin: 0; font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.07em; }
                .kpi-info p  { margin: 0.15rem 0 0; font-size: 1.6rem; font-weight: 800; line-height: 1; }

                /* Toolbar */
                .toolbar { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; padding: 0.85rem 1rem; border-radius: 12px; }
                .toolbar-left  { display: flex; align-items: center; gap: 0.75rem; flex: 1; flex-wrap: wrap; }
                .toolbar-right { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
                .search-bar { display: flex; align-items: center; gap: 8px; padding: 0.55rem 0.85rem; min-width: 220px; border-radius: 9px; background: rgba(0,0,0,0.25); border: 1px solid var(--border); }
                .search-bar input { background: transparent; border: none; padding: 0; box-shadow: none; color: white; width: 100%; font-size: 0.875rem; }
                .search-bar input::placeholder { color: var(--text-muted); }

                /* Buttons */
                .btn-sm  { padding: 0.5rem 1rem; font-size: 0.82rem; border-radius: 8px; display: flex; align-items: center; gap: 6px; cursor: pointer; font-weight: 500; }
                .btn-primary   { background: linear-gradient(135deg, #00b4db, #0083b0); color: white; border: none; }
                .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0,180,219,0.35); }
                .btn-secondary { background: rgba(255,255,255,0.06); border: 1px solid var(--border); color: var(--text-muted); }
                .btn-secondary:hover { border-color: var(--primary); color: var(--primary); }
                .btn-danger    { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); color: #ef4444; }
                .btn-danger:hover:not(:disabled) { background: rgba(239,68,68,0.2); }
                .btn-icon { width: 30px; height: 30px; padding: 0; border: 1px solid var(--border); background: transparent; color: var(--text-muted); border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
                .btn-icon:hover           { background: rgba(255,255,255,0.07); color: white; }
                .btn-icon.ok:hover        { border-color: #22c55e; color: #22c55e; }
                .btn-icon.red:hover       { border-color: #ef4444; color: #ef4444; }
                .btn-icon.warn:hover      { border-color: #f59e0b; color: #f59e0b; }
                .btn-disabled { opacity: 0.5; cursor: not-allowed; }

                /* Table */
                .tbl-wrap { border-radius: 14px; overflow: hidden; border: 1px solid var(--border); background: rgba(15,23,42,0.6); }
                .sa-table { width: 100%; border-collapse: collapse; }
                .sa-table th { padding: 0.75rem 1rem; text-align: left; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); background: rgba(0,0,0,0.25); border-bottom: 1px solid var(--border); }
                .sa-table td { padding: 0.85rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.04); vertical-align: middle; font-size: 0.875rem; }
                .sa-table tr:last-child td { border-bottom: none; }
                .sa-table tr:hover td { background: rgba(255,255,255,0.02); }

                /* User cell */
                .uc { display: flex; align-items: center; gap: 0.6rem; }
                .uc-av { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; flex-shrink: 0; }
                .uc-name { margin: 0; font-weight: 600; font-size: 0.875rem; }
                .uc-nim  { margin: 0; font-size: 0.72rem; color: var(--text-muted); }

                /* Badges */
                .badge { padding: 3px 9px; border-radius: 20px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
                .badge-success { background: rgba(34,197,94,0.15); color: #86efac; }
                .badge-danger  { background: rgba(239,68,68,0.15); color: #fca5a5; }
                .badge-warning { background: rgba(245,158,11,0.15); color: #fcd34d; }
                .badge-info    { background: rgba(99,102,241,0.15); color: #a5b4fc; }
                .badge-primary { background: rgba(0,180,219,0.15); color: #7dd3fc; }

                /* Role pill */
                .role-pill { padding: 3px 8px; border-radius: 4px; font-size: 0.68rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
                .role-admin   { background: rgba(239,68,68,0.15); color: #fca5a5; border: 1px solid rgba(239,68,68,0.2); }
                .role-teacher { background: rgba(99,102,241,0.15); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.2); }
                .role-student { background: rgba(0,180,219,0.12); color: #7dd3fc; border: 1px solid rgba(0,180,219,0.2); }

                /* Monitor specific */
                .status-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
                .sd-critical   { background: #ef4444; box-shadow: 0 0 7px #ef4444; animation: sdpulse 1.2s infinite; }
                .sd-suspicious { background: #f59e0b; }
                .sd-safe       { background: #22c55e; }
                @keyframes sdpulse { 0%,100%{opacity:1}50%{opacity:0.35} }
                .score-bar-bg { width: 70px; height: 4px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; margin-bottom: 2px; }
                .score-bar { height: 100%; border-radius: 3px; }

                /* Action buttons row */
                .act-row { display: flex; gap: 5px; align-items: center; }
                .terminated-pill { font-size: 0.62rem; font-weight: 700; color: #ef4444; border: 1px solid rgba(239,68,68,0.35); padding: 2px 5px; border-radius: 4px; }

                /* Inline edit */
                .inline-edit { background: rgba(0,0,0,0.3); border: 1px solid var(--primary); border-radius: 6px; padding: 4px 8px; color: white; font-size: 0.85rem; width: 100%; max-width: 180px; }
                .inline-select { background: rgba(0,0,0,0.3); border: 1px solid var(--border); border-radius: 6px; padding: 4px 8px; color: white; font-size: 0.82rem; }

                /* Add Form */
                .add-form-wrap { background: rgba(0,180,219,0.05); border: 1px solid rgba(0,180,219,0.2); border-radius: 14px; padding: 1.5rem; }
                .form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; align-items: end; margin-top: 1rem; }
                .form-field { display: flex; flex-direction: column; gap: 0.4rem; }
                .form-field label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
                .form-field input, .form-field select { padding: 0.55rem 0.75rem; border-radius: 8px; background: rgba(0,0,0,0.25); border: 1px solid var(--border); color: white; font-size: 0.875rem; }
                .form-field input:focus, .form-field select:focus { border-color: var(--primary); outline: none; }
                .form-actions { display: flex; gap: 0.5rem; align-items: flex-end; }

                /* Loader */
                .loader { width: 36px; height: 36px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 3rem auto; }
                .loader-sm { width: 20px; height: 20px; border-width: 2px; }
                @keyframes spin { to { transform: rotate(360deg); } }

                /* Exam cards */
                .exam-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem; }
                .exam-card { background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
                .exam-card-head { padding: 1rem 1.25rem; display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
                .exam-card-body { padding: 0 1.25rem 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
                .exam-card-name { margin: 0; font-size: 1rem; font-weight: 700; }
                .exam-card-meta { display: flex; gap: 0.75rem; flex-wrap: wrap; }
                .exam-meta-chip { font-size: 0.72rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px; }
                .exam-expand { background: rgba(0,180,219,0.06); border-top: 1px solid var(--border); padding: 0 1.25rem 1.25rem; }

                /* Log viewer */
                .log-viewer { font-family: 'Courier New', monospace; font-size: 0.75rem; line-height: 1.6; background: #080f1a; border-radius: 10px; padding: 1rem; max-height: 420px; overflow-y: auto; color: #94a3b8; }
                .log-line.INFO  { color: #94a3b8; }
                .log-line.WARN  { color: #fcd34d; }
                .log-line.ERROR { color: #fca5a5; }
                .log-line .tag-LOGIN    { color: #86efac; }
                .log-line .tag-REQUEST  { color: #7dd3fc; }
                .log-line .tag-RESPONSE { color: #a5b4fc; }
                .log-line .tag-ADMIN    { color: #fdba74; }
                .log-line .tag-SERVER   { color: #f0abfc; }

                /* Sistem stats */
                .stat-section { background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
                .stat-section-head { padding: 1rem 1.25rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
                .stat-section-head h3 { margin: 0; font-size: 0.95rem; }
                .stat-section-body { padding: 1.25rem; }

                /* Responsive */
                @media (max-width: 900px) {
                    .sa-sidebar { width: 56px; min-width: 56px; }
                    .nav-item span, .brand-title, .brand-sub, .brand-icon { display: none; }
                    .sidebar-brand { padding: 0.5rem; justify-content: center; }
                    .kpi-grid { grid-template-columns: 1fr 1fr; }
                }
            `}</style>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════
// TAB 1 — MONITOR (Live monitoring)
// ══════════════════════════════════════════════════════════════
const MonitorTab = ({ showMsg }) => {
    const [data,    setData]    = useState([]);
    const [search,  setSearch]  = useState('');
    const [session, setSession] = useState(null);

    const fetch = useCallback(async () => {
        try { const r = await axios.get('/api/dashboard'); setData(r.data); } catch {}
    }, []);

    useEffect(() => { fetch(); const t = setInterval(fetch, 3000); return () => clearInterval(t); }, [fetch]);

    const processed = data.map(u => {
        let violations = 0, scores = [];
        const sessions = u.SessionMonitorings || [];
        const active   = sessions.find(s => s.status === 'ACTIVE') || sessions.slice(-1)[0];
        if (active) {
            (active.EventLogs || []).forEach(l => {
                if (l.RuleViolation) violations++;
                if (l.RFModelResult)  scores.push(l.RFModelResult.conf_score);
            });
        }
        const avg   = scores.length ? scores.reduce((a,b)=>a+b,0)/scores.length : 0;
        const risk  = (violations>3||avg>0.6)?'CRITICAL':avg>0.3?'SUSPICIOUS':'SAFE';
        return { ...u, violations, avg, risk, activeSession: active };
    }).sort((a,b) => ({ CRITICAL:3, SUSPICIOUS:2, SAFE:1 }[b.risk] - { CRITICAL:3, SUSPICIOUS:2, SAFE:1 }[a.risk]));

    const filtered = processed.filter(u =>
        u.nama_lengkap?.toLowerCase().includes(search.toLowerCase()) || u.nim?.includes(search)
    );

    const terminate = async (sid) => {
        if (!confirm('Hentikan paksa sesi ini?')) return;
        await axios.post('/api/admin/terminate', { session_id: sid });
        showMsg('Sesi dihentikan'); fetch();
    };
    const warn = async (sid) => {
        const m = prompt('Pesan peringatan untuk peserta:');
        if (m) { await axios.post('/api/admin/warn', { session_id: sid, message: m }); showMsg('Peringatan terkirim'); }
    };

    return (
        <div className="tab-page">
            {session && <EvidenceModal session={session} onClose={() => setSession(null)} />}
            <div className="tab-header">
                <div className="tab-header-info">
                    <h1>Live Command Center</h1>
                    <p>Auto-refresh setiap 3 detik · {processed.length} peserta terpantau</p>
                </div>
                <button className="btn-sm btn-secondary" onClick={fetch}><RefreshCw size={14}/> Refresh</button>
            </div>

            <div className="kpi-grid">
                <KPI title="Total Peserta"    value={processed.length}                                                icon={<Users/>}         color="#00b4db" />
                <KPI title="High Risk"        value={processed.filter(u=>u.risk==='CRITICAL').length}                icon={<AlertOctagon/>}  color="#ef4444" />
                <KPI title="Suspicious"       value={processed.filter(u=>u.risk==='SUSPICIOUS').length}              icon={<AlertTriangle/>} color="#f59e0b" />
                <KPI title="Sesi Aktif Skrg" value={processed.filter(u=>u.activeSession?.status==='ACTIVE').length} icon={<Activity/>}      color="#22c55e" />
            </div>

            <div className="toolbar glass">
                <div className="toolbar-left">
                    <div className="search-bar"><Search size={14}/><input placeholder="Cari peserta..." value={search} onChange={e=>setSearch(e.target.value)} /></div>
                </div>
            </div>

            <div className="tbl-wrap">
                <table className="sa-table">
                    <thead><tr>
                        <th>Status</th><th>Identitas</th><th>Risk</th><th>Trust AI</th><th>Aksi</th>
                    </tr></thead>
                    <tbody>
                        {filtered.length===0 ? (
                            <tr><td colSpan={5} style={{textAlign:'center',padding:'3rem',color:'var(--text-muted)'}}>Belum ada peserta aktif</td></tr>
                        ) : filtered.map(u => (
                            <motion.tr key={u.user_id} initial={{opacity:0}} animate={{opacity:1,backgroundColor:u.risk==='CRITICAL'?'rgba(239,68,68,0.06)':'transparent'}}>
                                <td><div className={`status-dot ${u.risk==='CRITICAL'?'sd-critical':u.risk==='SUSPICIOUS'?'sd-suspicious':'sd-safe'}`}/></td>
                                <td><div className="uc">
                                    <div className="uc-av" style={{background:`hsl(${u.user_id*47%360},55%,40%)`}}>{u.nama_lengkap?.[0]}</div>
                                    <div><p className="uc-name">{u.nama_lengkap}</p><p className="uc-nim">{u.nim}</p></div>
                                </div></td>
                                <td>
                                    <span className={`badge ${u.risk==='CRITICAL'?'badge-danger':u.risk==='SUSPICIOUS'?'badge-warning':'badge-success'}`}>{u.risk}</span>
                                    <p style={{margin:'3px 0 0',fontSize:'0.7rem',color:'var(--text-muted)'}}>{u.violations} flags</p>
                                </td>
                                <td>
                                    <div className="score-bar-bg"><div className="score-bar" style={{width:`${(1-u.avg)*100}%`,background:u.risk==='CRITICAL'?'#ef4444':'#22c55e'}}/></div>
                                    <span style={{fontSize:'0.75rem',fontWeight:700}}>{((1-u.avg)*100).toFixed(0)}%</span>
                                </td>
                                <td><div className="act-row">
                                    <button className="btn-icon" title="Lihat Bukti" onClick={()=>setSession(u.activeSession)}><Eye size={14}/></button>
                                    {u.activeSession?.status==='ACTIVE' ? (<>
                                        <button className="btn-icon warn" title="Peringatan" onClick={()=>warn(u.activeSession.session_id)}><AlertTriangle size={14}/></button>
                                        <button className="btn-icon red"  title="Terminasi"  onClick={()=>terminate(u.activeSession.session_id)}><AlertOctagon size={14}/></button>
                                    </>) : (
                                        <span className="terminated-pill">{u.activeSession?.status||'IDLE'}</span>
                                    )}
                                </div></td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════
// TAB 2 — PENGGUNA (All users: students + teachers)
// ══════════════════════════════════════════════════════════════
const PenggunaTab = ({ showMsg }) => {
    const [users,      setUsers]      = useState([]);
    const [exams,      setExams]      = useState([]);
    const [roleFilter, setRoleFilter] = useState('');
    const [search,     setSearch]     = useState('');
    const [loading,    setLoading]    = useState(false);
    const [showAdd,    setShowAdd]    = useState(false);
    const [editingId,  setEditingId]  = useState(null);
    const [editVals,   setEditVals]   = useState({});
    const [enrollModal,setEnrollModal]= useState(null);
    const [resetModal, setResetModal] = useState(null);
    const [newUser,    setNewUser]    = useState({ nama_lengkap:'', nim:'', role:'student', max_attempts:1, password:'' });
    const [importFile, setImportFile] = useState(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [uRes, eRes] = await Promise.all([
                axios.get('/api/admin/all-users' + (roleFilter ? `?role=${roleFilter}` : '')),
                axios.get('/api/exams'),
            ]);
            setUsers(uRes.data); setExams(eRes.data);
        } catch {} finally { setLoading(false); }
    }, [roleFilter]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/admin/users', newUser);
            setNewUser({ nama_lengkap:'', nim:'', role:'student', max_attempts:1, password:'' });
            setShowAdd(false); fetchAll();
            showMsg(`Akun "${newUser.nama_lengkap}" berhasil dibuat`);
        } catch (err) { showMsg(err.response?.data?.error || 'Gagal membuat akun', 'error'); }
    };

    const handleDelete = async (u) => {
        if (!confirm(`Hapus akun "${u.nama_lengkap}" (${u.nim})? Semua data terkait akan ikut terhapus.`)) return;
        try {
            await axios.delete(`/api/admin/users/${u.user_id}`);
            fetchAll(); showMsg(`${u.nama_lengkap} dihapus`);
        } catch (err) { showMsg(err.response?.data?.error || 'Gagal hapus', 'error'); }
    };

    const saveEdit = async (id) => {
        try {
            await axios.put(`/api/admin/users/${id}`, editVals);
            setEditingId(null); fetchAll(); showMsg('Data diperbarui');
        } catch (err) { showMsg(err.response?.data?.error || 'Gagal simpan', 'error'); }
    };

    const resetPassword = async (u, newPw) => {
        try {
            const r = await axios.post(`/api/admin/users/${u.user_id}/reset-password`, { password: newPw || u.nim });
            showMsg(r.data.message); setResetModal(null);
        } catch (err) { showMsg('Gagal reset password', 'error'); }
    };

    const handleImport = async () => {
        if (!importFile) return;
        const fd = new FormData(); fd.append('file', importFile);
        try {
            const r = await axios.post('/api/admin/students/bulk', fd);
            setImportFile(null); fetchAll();
            showMsg(`Import selesai: ${r.data.created} akun dibuat`);
        } catch (err) { showMsg('Gagal import', 'error'); }
    };

    const filtered = users.filter(u =>
        u.nama_lengkap.toLowerCase().includes(search.toLowerCase()) || u.nim.includes(search)
    );

    const PROTECTED = ['admin', 'guru'];

    return (
        <div className="tab-page">
            {enrollModal && <EnrollModal student={enrollModal} exams={exams} onClose={()=>{setEnrollModal(null);fetchAll();}} />}
            {resetModal && (
                <ResetPasswordModal user={resetModal} onConfirm={(pw)=>resetPassword(resetModal,pw)} onClose={()=>setResetModal(null)} />
            )}

            <div className="tab-header">
                <div className="tab-header-info">
                    <h1>Manajemen Pengguna</h1>
                    <p>Kelola semua akun: peserta, guru, dan admin</p>
                </div>
            </div>

            <div className="kpi-grid">
                <KPI title="Total Pengguna" value={users.length}                                  icon={<Users/>}  color="#00b4db" />
                <KPI title="Siswa"          value={users.filter(u=>u.role==='student').length}    icon={<Users/>}  color="#22c55e" />
                <KPI title="Guru"           value={users.filter(u=>u.role==='teacher').length}    icon={<Shield/>} color="#6366f1" />
                <KPI title="Admin"          value={users.filter(u=>u.role==='admin').length}      icon={<Shield/>} color="#ef4444" />
            </div>

            {/* Toolbar */}
            <div className="toolbar glass">
                <div className="toolbar-left">
                    <div className="search-bar"><Search size={14}/><input placeholder="Cari nama atau NIM..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
                    <select className="inline-select" value={roleFilter} onChange={e=>setRoleFilter(e.target.value)}>
                        <option value="">Semua Role</option>
                        <option value="student">Siswa</option>
                        <option value="teacher">Guru</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <div className="toolbar-right">
                    <label className="btn-sm btn-secondary" style={{cursor:'pointer'}}>
                        <Upload size={14}/> {importFile ? importFile.name.slice(0,18)+'…' : 'Import Excel'}
                        <input type="file" accept=".xlsx,.xls" hidden onChange={e=>setImportFile(e.target.files[0])}/>
                    </label>
                    {importFile && <button className="btn-sm btn-primary" onClick={handleImport}><Check size={14}/>Proses</button>}
                    <a href="/api/admin/download-student-template" className="btn-sm btn-secondary" style={{textDecoration:'none'}}><Download size={14}/>Template</a>
                    <button className="btn-sm btn-primary" onClick={()=>setShowAdd(v=>!v)}><UserPlus size={14}/> Tambah Akun</button>
                </div>
            </div>

            {/* Add Form */}
            {showAdd && (
                <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} className="add-form-wrap">
                    <h3 style={{margin:'0 0 0.25rem',fontSize:'0.95rem'}}>Buat Akun Baru</h3>
                    <form onSubmit={handleAdd}>
                        <div className="form-grid">
                            <div className="form-field">
                                <label>Nama Lengkap *</label>
                                <input value={newUser.nama_lengkap} onChange={e=>setNewUser(v=>({...v,nama_lengkap:e.target.value}))} placeholder="Nama lengkap" required/>
                            </div>
                            <div className="form-field">
                                <label>NIM / ID *</label>
                                <input value={newUser.nim} onChange={e=>setNewUser(v=>({...v,nim:e.target.value}))} placeholder="NIM atau ID unik" required/>
                            </div>
                            <div className="form-field">
                                <label>Role</label>
                                <select value={newUser.role} onChange={e=>setNewUser(v=>({...v,role:e.target.value}))}>
                                    <option value="student">Siswa</option>
                                    <option value="teacher">Guru</option>
                                </select>
                            </div>
                            {newUser.role==='student' && (
                                <div className="form-field">
                                    <label>Max Percobaan</label>
                                    <input type="number" min={1} max={20} value={newUser.max_attempts} onChange={e=>setNewUser(v=>({...v,max_attempts:e.target.value}))}/>
                                </div>
                            )}
                            <div className="form-field">
                                <label>Password (kosong = NIM)</label>
                                <input type="password" value={newUser.password} onChange={e=>setNewUser(v=>({...v,password:e.target.value}))} placeholder="Default: NIM"/>
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="btn-sm btn-primary"><Check size={14}/>Simpan</button>
                                <button type="button" className="btn-sm btn-secondary" onClick={()=>setShowAdd(false)}><X size={14}/>Batal</button>
                            </div>
                        </div>
                    </form>
                </motion.div>
            )}

            {/* Table */}
            <div className="tbl-wrap">
                <table className="sa-table">
                    <thead><tr>
                        <th>#</th><th>Identitas</th><th>Role</th><th>Status</th><th>Max Percobaan</th><th>Ujian</th><th>Aksi</th>
                    </tr></thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7}><div className="loader"/></td></tr>
                        ) : filtered.length===0 ? (
                            <tr><td colSpan={7} style={{textAlign:'center',padding:'3rem',color:'var(--text-muted)'}}>Tidak ada data</td></tr>
                        ) : filtered.map((u,i) => {
                            const isProtected = PROTECTED.includes(u.nim?.toLowerCase());
                            const isEditing   = editingId === u.user_id;
                            return (
                                <tr key={u.user_id}>
                                    <td style={{color:'var(--text-muted)',fontSize:'0.75rem'}}>{i+1}</td>
                                    <td><div className="uc">
                                        <div className="uc-av" style={{background:`hsl(${u.user_id*53%360},55%,42%)`}}>{u.nama_lengkap[0]}</div>
                                        <div>
                                            {isEditing ? <input className="inline-edit" value={editVals.nama_lengkap} onChange={e=>setEditVals(v=>({...v,nama_lengkap:e.target.value}))}/> : <p className="uc-name">{u.nama_lengkap}</p>}
                                            <p className="uc-nim">{u.nim}</p>
                                        </div>
                                    </div></td>
                                    <td>
                                        {isEditing && !isProtected && u.role!=='admin' ? (
                                            <select className="inline-select" value={editVals.role} onChange={e=>setEditVals(v=>({...v,role:e.target.value}))}>
                                                <option value="student">Siswa</option>
                                                <option value="teacher">Guru</option>
                                            </select>
                                        ) : <span className={`role-pill role-${u.role}`}>{u.role}</span>}
                                    </td>
                                    <td>
                                        {isEditing && !isProtected ? (
                                            <select className="inline-select" value={editVals.is_registered?'1':'0'} onChange={e=>setEditVals(v=>({...v,is_registered:e.target.value==='1'}))}>
                                                <option value="1">Aktif</option><option value="0">Nonaktif</option>
                                            </select>
                                        ) : <span className={`badge ${u.is_registered?'badge-success':'badge-danger'}`}>{u.is_registered?'Aktif':'Nonaktif'}</span>}
                                    </td>
                                    <td>
                                        {isEditing ? <input type="number" min={1} max={99} className="inline-edit" style={{width:'65px'}} value={editVals.max_attempts} onChange={e=>setEditVals(v=>({...v,max_attempts:e.target.value}))}/> : <span style={{fontWeight:700}}>{u.max_attempts}x</span>}
                                    </td>
                                    <td>
                                        <span style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>{u.ExamEnrollments?.length||0} ujian</span>
                                        {u.role==='student' && (
                                            <button className="btn-sm" style={{padding:'2px 6px',background:'transparent',border:'none',color:'var(--primary)',fontSize:'0.75rem',display:'inline-flex',cursor:'pointer'}} onClick={()=>setEnrollModal(u)}>Kelola →</button>
                                        )}
                                    </td>
                                    <td><div className="act-row">
                                        {isProtected ? (
                                            <span title="Akun sistem dilindungi" style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>🔒 Sistem</span>
                                        ) : isEditing ? (<>
                                            <button className="btn-icon ok" onClick={()=>saveEdit(u.user_id)}><Check size={13}/></button>
                                            <button className="btn-icon" onClick={()=>setEditingId(null)}><X size={13}/></button>
                                        </>) : (<>
                                            <button className="btn-icon" title="Edit" onClick={()=>{ setEditingId(u.user_id); setEditVals({nama_lengkap:u.nama_lengkap,max_attempts:u.max_attempts,is_registered:u.is_registered,role:u.role}); }}><Edit2 size={13}/></button>
                                            <button className="btn-icon warn" title="Reset Password" onClick={()=>setResetModal(u)}><Key size={13}/></button>
                                            <button className="btn-icon red" title="Hapus" onClick={()=>handleDelete(u)}><Trash2 size={13}/></button>
                                        </>)}
                                    </div></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════
// TAB 3 — UJIAN (Full exam + question management)
// ══════════════════════════════════════════════════════════════
const UjianTab = ({ showMsg }) => {
    const [exams,     setExams]     = useState([]);
    const [loading,   setLoading]   = useState(false);
    const [showAdd,   setShowAdd]   = useState(false);
    const [expandId,  setExpandId]  = useState(null);
    const [questions, setQuestions] = useState({});  // { exam_id: [...] }
    const [qLoading,  setQLoading]  = useState({});
    const [uploadFile,setUploadFile]= useState({});  // { exam_id: File }
    const [uploadSt,  setUploadSt]  = useState({});  // { exam_id: 'idle'|'uploading'|'done'|'error' }
    const [uploadRes, setUploadRes] = useState({});  // { exam_id: response }
    const [newExam,   setNewExam]   = useState({ subject_name:'', duration_minutes:90 });

    const fetchExams = useCallback(async () => {
        setLoading(true);
        try { const r = await axios.get('/api/exams'); setExams(r.data); } catch {} finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchExams(); }, [fetchExams]);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/exams', newExam);
            setNewExam({ subject_name:'', duration_minutes:90 }); setShowAdd(false);
            fetchExams(); showMsg('Ujian berhasil dibuat');
        } catch (err) { showMsg(err.response?.data?.error || 'Gagal', 'error'); }
    };

    const handleToggle = async (exam) => {
        try {
            await axios.put(`/api/exams/${exam.exam_id}`, { is_active: !exam.is_active });
            fetchExams();
        } catch (err) { showMsg('Gagal toggle', 'error'); }
    };

    const handleDeleteExam = async (exam) => {
        if (!confirm(`Hapus ujian "${exam.subject_name}"? Semua soal dan sesi akan ikut terhapus.`)) return;
        try {
            await axios.delete(`/api/exams/${exam.exam_id}`);
            fetchExams(); showMsg('Ujian dihapus');
        } catch (err) { showMsg(err.response?.data?.error || 'Gagal hapus ujian', 'error'); }
    };

    const loadQuestions = async (exam_id) => {
        setQLoading(v=>({...v,[exam_id]:true}));
        try {
            const r = await axios.get(`/api/admin/questions/${exam_id}`);
            setQuestions(v=>({...v,[exam_id]:r.data}));
        } catch {} finally { setQLoading(v=>({...v,[exam_id]:false})); }
    };

    const handleExpand = (exam_id) => {
        if (expandId === exam_id) { setExpandId(null); return; }
        setExpandId(exam_id);
        if (!questions[exam_id]) loadQuestions(exam_id);
    };

    const deleteQuestion = async (qId, examId) => {
        try {
            await axios.delete(`/api/admin/questions/${qId}`);
            setQuestions(v=>({...v,[examId]:(v[examId]||[]).filter(q=>q.question_id!==qId)}));
        } catch { showMsg('Gagal hapus soal', 'error'); }
    };

    const handleUpload = async (exam_id) => {
        const file = uploadFile[exam_id];
        if (!file) return;
        setUploadSt(v=>({...v,[exam_id]:'uploading'}));
        const fd = new FormData(); fd.append('file', file); fd.append('exam_id', exam_id);
        try {
            const r = await axios.post('/api/admin/upload-questions', fd, { headers:{'Content-Type':'multipart/form-data'} });
            setUploadRes(v=>({...v,[exam_id]:r.data}));
            setUploadSt(v=>({...v,[exam_id]:'done'}));
            setUploadFile(v=>({...v,[exam_id]:null}));
            loadQuestions(exam_id);
            showMsg(`${r.data.count} soal berhasil diupload`);
        } catch (err) {
            setUploadSt(v=>({...v,[exam_id]:'error'}));
            showMsg(err.response?.data?.error || 'Upload gagal', 'error');
        }
    };

    const clearQuestions = async (exam_id) => {
        if (!confirm('Hapus semua soal untuk ujian ini?')) return;
        try {
            await axios.post('/api/admin/clear-questions', { exam_id });
            setQuestions(v=>({...v,[exam_id]:[]}));
            showMsg('Semua soal dihapus');
        } catch { showMsg('Gagal', 'error'); }
    };

    return (
        <div className="tab-page">
            <div className="tab-header">
                <div className="tab-header-info"><h1>Manajemen Ujian & Soal</h1><p>Buat, edit, dan kelola konten ujian</p></div>
                <div style={{display:'flex',gap:'0.5rem'}}>
                    <a href="/api/admin/download-template" className="btn-sm btn-secondary" style={{textDecoration:'none'}}><Download size={14}/>Template Soal</a>
                    <button className="btn-sm btn-primary" onClick={()=>setShowAdd(v=>!v)}><Plus size={14}/>Buat Ujian</button>
                </div>
            </div>

            {showAdd && (
                <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} className="add-form-wrap">
                    <h3 style={{margin:'0 0 0.25rem',fontSize:'0.95rem'}}>Buat Ujian Baru</h3>
                    <form onSubmit={handleCreate}>
                        <div className="form-grid">
                            <div className="form-field" style={{gridColumn:'span 2'}}>
                                <label>Nama Mata Ujian *</label>
                                <input value={newExam.subject_name} onChange={e=>setNewExam(v=>({...v,subject_name:e.target.value}))} placeholder="cth: Matematika Dasar" required/>
                            </div>
                            <div className="form-field">
                                <label>Durasi (menit)</label>
                                <input type="number" min={10} max={300} value={newExam.duration_minutes} onChange={e=>setNewExam(v=>({...v,duration_minutes:e.target.value}))}/>
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="btn-sm btn-primary"><Check size={14}/>Simpan</button>
                                <button type="button" className="btn-sm btn-secondary" onClick={()=>setShowAdd(false)}><X size={14}/>Batal</button>
                            </div>
                        </div>
                    </form>
                </motion.div>
            )}

            {loading ? <div className="loader"/> : (
                <div className="exam-cards">
                    {exams.map(exam => (
                        <div key={exam.exam_id} className="exam-card">
                            <div className="exam-card-head">
                                <div style={{flex:1}}>
                                    <p className="exam-card-name">{exam.subject_name}</p>
                                    <div className="exam-card-meta">
                                        <span className="exam-meta-chip">⏱ {exam.duration_minutes} mnt</span>
                                        <span className={`badge ${exam.is_active?'badge-success':'badge-danger'}`}>{exam.is_active?'Aktif':'Nonaktif'}</span>
                                    </div>
                                </div>
                                <div className="act-row">
                                    <button className={`btn-sm ${exam.is_active?'btn-secondary':'btn-primary'}`} style={{fontSize:'0.72rem',padding:'4px 10px'}} onClick={()=>handleToggle(exam)}>
                                        {exam.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                    </button>
                                    <button className="btn-icon" onClick={()=>handleExpand(exam.exam_id)} title="Kelola Soal">
                                        {expandId===exam.exam_id ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                                    </button>
                                    <button className="btn-icon red" onClick={()=>handleDeleteExam(exam)} title="Hapus Ujian"><Trash2 size={13}/></button>
                                </div>
                            </div>

                            {/* Expanded: Upload + Questions */}
                            {expandId === exam.exam_id && (
                                <div className="exam-expand">
                                    {/* Upload Section */}
                                    <div style={{display:'flex',gap:'0.5rem',alignItems:'center',marginBottom:'0.75rem',flexWrap:'wrap'}}>
                                        <label className="btn-sm btn-secondary" style={{cursor:'pointer',flex:1,minWidth:'160px',justifyContent:'center'}}>
                                            <Upload size={13}/>
                                            {uploadFile[exam.exam_id] ? uploadFile[exam.exam_id].name.slice(0,20)+'…' : 'Pilih file Excel'}
                                            <input type="file" accept=".xlsx,.xls" hidden onChange={e=>setUploadFile(v=>({...v,[exam.exam_id]:e.target.files[0]}))}/>
                                        </label>
                                        {uploadFile[exam.exam_id] && (
                                            <button className="btn-sm btn-primary" onClick={()=>handleUpload(exam.exam_id)} disabled={uploadSt[exam.exam_id]==='uploading'}>
                                                {uploadSt[exam.exam_id]==='uploading' ? 'Uploading…' : '⬆ Upload'}
                                            </button>
                                        )}
                                        <button className="btn-sm btn-secondary" onClick={()=>loadQuestions(exam.exam_id)}><RefreshCw size={13}/></button>
                                        <button className="btn-sm btn-danger" onClick={()=>clearQuestions(exam.exam_id)}><Trash2 size={13}/> Hapus Semua</button>
                                    </div>

                                    {/* Upload result */}
                                    {uploadRes[exam.exam_id] && (
                                        <div style={{fontSize:'0.78rem',color:'#86efac',marginBottom:'0.5rem'}}>
                                            ✅ {uploadRes[exam.exam_id].count} soal berhasil
                                            {uploadRes[exam.exam_id].failed_rows?.length > 0 && (
                                                <span style={{color:'#fcd34d'}}> · ⚠ {uploadRes[exam.exam_id].failed_rows.length} baris gagal</span>
                                            )}
                                        </div>
                                    )}

                                    {/* Questions list */}
                                    {qLoading[exam.exam_id] ? (
                                        <div style={{display:'flex',justifyContent:'center',padding:'1rem'}}><div className="loader loader-sm" style={{margin:0}}/></div>
                                    ) : (questions[exam.exam_id]||[]).length === 0 ? (
                                        <p style={{color:'var(--text-muted)',fontSize:'0.82rem',margin:0}}>Belum ada soal. Upload file Excel untuk menambah soal.</p>
                                    ) : (
                                        <div style={{maxHeight:'380px',overflowY:'auto',display:'flex',flexDirection:'column',gap:'1px'}}>
                                            {(questions[exam.exam_id]||[]).map((q,i) => (
                                                <div key={q.question_id} style={{padding:'0.75rem',borderBottom:'1px solid rgba(255,255,255,0.05)',display:'flex',gap:'0.75rem',alignItems:'flex-start'}}>
                                                    <span style={{background:'rgba(0,180,219,0.12)',color:'var(--primary)',padding:'2px 7px',borderRadius:'4px',fontSize:'0.7rem',fontWeight:700,flexShrink:0,marginTop:'2px'}}>#{i+1}</span>
                                                    <div style={{flex:1,minWidth:0}}>
                                                        <p style={{margin:'0 0 0.5rem',fontSize:'0.875rem',fontWeight:500}}>{q.question_text}</p>
                                                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px'}}>
                                                            {q.options.map((opt,idx)=>(
                                                                <div key={idx} style={{fontSize:'0.75rem',padding:'3px 8px',borderRadius:'5px',background:idx===q.correct_option?'rgba(34,197,94,0.12)':'rgba(255,255,255,0.03)',color:idx===q.correct_option?'#86efac':'var(--text-muted)',border:`1px solid ${idx===q.correct_option?'rgba(34,197,94,0.3)':'rgba(255,255,255,0.05)'}`,display:'flex',gap:'6px',alignItems:'center'}}>
                                                                    <span style={{fontWeight:800,fontSize:'0.68rem'}}>{['A','B','C','D'][idx]}</span> {opt}
                                                                    {idx===q.correct_option && <span style={{marginLeft:'auto',fontSize:'0.6rem'}}>✓Kunci</span>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <button className="btn-icon red" onClick={()=>deleteQuestion(q.question_id,exam.exam_id)} style={{flexShrink:0}}><Trash2 size={12}/></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    {exams.length===0 && !loading && (
                        <div style={{gridColumn:'1/-1',textAlign:'center',padding:'4rem',color:'var(--text-muted)'}}>
                            <BookOpen size={48} style={{opacity:0.2,display:'block',margin:'0 auto 1rem'}}/> Belum ada ujian. Klik "Buat Ujian" untuk memulai.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ══════════════════════════════════════════════════════════════
// TAB 4 — SISTEM (Stats + Logs + Export)
// ══════════════════════════════════════════════════════════════
const SistemTab = ({ showMsg }) => {
    const [stats,    setStats]    = useState(null);
    const [logs,     setLogs]     = useState([]);
    const [logLines, setLogLines] = useState(100);
    const [logAuto,  setLogAuto]  = useState(false);
    const logRef = useRef(null);

    const fetchStats = useCallback(async () => {
        try { const r = await axios.get('/api/admin/stats'); setStats(r.data); } catch {}
    }, []);

    const fetchLogs = useCallback(async () => {
        try { const r = await axios.get(`/api/admin/logs?lines=${logLines}`); setLogs(r.data.lines||[]); } catch {}
    }, [logLines]);

    useEffect(() => { fetchStats(); fetchLogs(); }, [fetchStats, fetchLogs]);
    useEffect(() => { if (logAuto) { const t = setInterval(fetchLogs, 3000); return ()=>clearInterval(t); } }, [logAuto, fetchLogs]);
    useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [logs]);

    const clearAllLogs = async () => {
        if (!confirm('⚠️ Hapus SEMUA data sesi, log, dan reset semua percobaan ujian?\n\nTindakan ini TIDAK DAPAT dibatalkan.')) return;
        try {
            await axios.post('/api/admin/clear-all-logs');
            fetchStats(); fetchLogs();
            showMsg('Semua data sesi berhasil dihapus dan percobaan direset');
        } catch { showMsg('Gagal menghapus data', 'error'); }
    };

    const getLevelClass = (line) => {
        if (line.includes('[ERROR]')) return 'ERROR';
        if (line.includes('[WARN ]')) return 'WARN';
        return 'INFO';
    };
    const getTagClass = (line) => {
        const tags = ['LOGIN', 'REQUEST', 'RESPONSE', 'ADMIN', 'SERVER'];
        return tags.find(t => line.includes(`[${t}`)) || '';
    };

    return (
        <div className="tab-page">
            <div className="tab-header">
                <div className="tab-header-info"><h1>Panel Sistem</h1><p>Statistik, log server real-time, dan ekspor data</p></div>
                <button className="btn-sm btn-secondary" onClick={()=>{fetchStats();fetchLogs();}}><RefreshCw size={14}/> Refresh</button>
            </div>

            {/* System Stats */}
            <div className="kpi-grid">
                {stats ? (<>
                    <KPI title="Total Siswa"       value={stats.totalStudents}    icon={<Users/>}     color="#00b4db" />
                    <KPI title="Total Guru"         value={stats.totalTeachers}    icon={<Shield/>}    color="#6366f1" />
                    <KPI title="Total Ujian"        value={stats.totalExams}       icon={<BookOpen/>}  color="#f59e0b" />
                    <KPI title="Bank Soal"          value={stats.totalQuestions}   icon={<Database/>}  color="#22c55e" />
                    <KPI title="Total Sesi"         value={stats.totalSessions}    icon={<Activity/>}  color="#8b5cf6" />
                    <KPI title="Sesi Aktif Skrg"   value={stats.activeSessions}   icon={<Activity/>}  color="#ef4444" />
                    <KPI title="Total Pelanggaran" value={stats.totalViolations}  icon={<AlertTriangle/>} color="#f97316" />
                    <KPI title="Pendaftaran Ujian" value={stats.totalEnrollments} icon={<BarChart2/>}  color="#14b8a6" />
                </>) : <div style={{gridColumn:'1/-1'}}><div className="loader"/></div>}
            </div>

            {/* Export */}
            <div className="stat-section">
                <div className="stat-section-head">
                    <h3>📥 Ekspor Data</h3>
                </div>
                <div className="stat-section-body" style={{display:'flex',gap:'0.75rem',flexWrap:'wrap'}}>
                    <a href="/api/admin/export/students" className="btn-sm btn-secondary" style={{textDecoration:'none'}}><Download size={14}/> Export Peserta (.xlsx)</a>
                    <a href="/api/admin/export/sessions" className="btn-sm btn-secondary" style={{textDecoration:'none'}}><Download size={14}/> Export Sesi & Log (.xlsx)</a>
                    <button className="btn-sm btn-danger" onClick={clearAllLogs}><Trash2 size={14}/> Reset Semua Data Sesi</button>
                </div>
            </div>

            {/* Log Viewer */}
            <div className="stat-section">
                <div className="stat-section-head">
                    <h3><Terminal size={16} style={{display:'inline',marginRight:'6px'}}/>Log Server Real-time</h3>
                    <div style={{display:'flex',gap:'0.5rem',alignItems:'center'}}>
                        <select className="inline-select" value={logLines} onChange={e=>{setLogLines(e.target.value);fetchLogs();}}>
                            <option value={50}>50 baris</option>
                            <option value={100}>100 baris</option>
                            <option value={200}>200 baris</option>
                            <option value={500}>500 baris</option>
                        </select>
                        <button className={`btn-sm ${logAuto?'btn-primary':'btn-secondary'}`} onClick={()=>setLogAuto(v=>!v)}>
                            {logAuto ? '⏸ Stop' : '▶ Auto'}
                        </button>
                        <button className="btn-sm btn-secondary" onClick={fetchLogs}><RefreshCw size={13}/></button>
                    </div>
                </div>
                <div className="log-viewer" ref={logRef}>
                    {logs.length===0 ? (
                        <span style={{color:'#476291'}}>Belum ada log. Mulai jalankan server untuk merekam aktivitas.</span>
                    ) : logs.map((line, i) => {
                        const lvl = getLevelClass(line);
                        const tag = getTagClass(line);
                        return (
                            <div key={i} className={`log-line ${lvl}`}>
                                {line.replace(`[${tag}`, `<[${tag}`).split('<').map((part, pi) => (
                                    <span key={pi} className={pi===1 ? `tag-${tag}` : ''}>{pi===1 ? '<'+part : part}</span>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ══════════════════════════════════════════════════════════════

const KPI = ({ title, value, icon, color }) => (
    <div className="kpi-card glass">
        <div className="kpi-icon" style={{ background:`${color}1a`, color }}>
            {React.cloneElement(icon, { size: 22 })}
        </div>
        <div className="kpi-info">
            <h4>{title}</h4>
            <p style={{ color }}>{value ?? '—'}</p>
        </div>
    </div>
);

const EnrollModal = ({ student, exams, onClose }) => {
    const [enrollments, setEnrollments] = useState(student.ExamEnrollments || []);

    const isEnrolled = (eid) => enrollments.find(e => e.exam_id === eid);

    const toggle = async (exam) => {
        const ex = isEnrolled(exam.exam_id);
        if (ex) { await axios.delete(`/api/admin/enrollments/${ex.enrollment_id}`); }
        else     { await axios.post('/api/admin/enrollments', { user_id: student.user_id, exam_id: exam.exam_id, max_attempts: 1 }); }
        const r = await axios.get(`/api/admin/all-users?role=student`);
        const u = r.data.find(s => s.user_id === student.user_id);
        setEnrollments(u?.ExamEnrollments || []);
    };

    const updateAttempts = async (eid, val) => {
        await axios.put(`/api/admin/enrollments/${eid}`, { max_attempts: val });
        const r = await axios.get(`/api/admin/all-users?role=student`);
        const u = r.data.find(s => s.user_id === student.user_id);
        setEnrollments(u?.ExamEnrollments || []);
    };

    const resetAttempts = async (eid) => {
        if (!confirm('Reset percobaan ke 0?')) return;
        await axios.put(`/api/admin/enrollments/${eid}`, { reset_attempts: true });
        const r = await axios.get(`/api/admin/all-users?role=student`);
        const u = r.data.find(s => s.user_id === student.user_id);
        setEnrollments(u?.ExamEnrollments || []);
    };

    return (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(5px)',display:'flex',justifyContent:'center',alignItems:'center',zIndex:500,padding:'1rem'}}>
            <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} className="glass" style={{width:'600px',maxHeight:'80vh',display:'flex',flexDirection:'column',borderRadius:'20px',overflow:'hidden'}}>
                <div style={{padding:'1.25rem 1.5rem',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                    <div><h2 style={{margin:0,fontSize:'1.1rem'}}>Pendaftaran Ujian</h2><p style={{margin:'3px 0 0',fontSize:'0.8rem',color:'var(--text-muted)'}}>{student.nama_lengkap} — {student.nim}</p></div>
                    <button onClick={onClose} style={{background:'transparent',border:'none',color:'var(--text-muted)',padding:'4px',cursor:'pointer',borderRadius:'6px'}}><X size={20}/></button>
                </div>
                <div style={{flex:1,overflowY:'auto',padding:'1rem 1.25rem',display:'flex',flexDirection:'column',gap:'0.65rem'}}>
                    {exams.map(exam => {
                        const en = isEnrolled(exam.exam_id);
                        return (
                            <div key={exam.exam_id} style={{padding:'0.85rem',borderRadius:'10px',border:`1px solid ${en?'rgba(0,180,219,0.35)':'var(--border)'}`,background:en?'rgba(0,180,219,0.06)':'rgba(0,0,0,0.15)',display:'flex',alignItems:'center',gap:'0.75rem',flexWrap:'wrap'}}>
                                <span onClick={()=>toggle(exam)} style={{width:'26px',height:'26px',borderRadius:'7px',border:`1px solid ${en?'var(--primary)':'var(--border)'}`,background:en?'var(--primary)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,fontSize:'0.8rem',fontWeight:700,transition:'all 0.15s'}}>
                                    {en ? '✓' : '+'}
                                </span>
                                <div style={{flex:1}}>
                                    <p style={{margin:0,fontWeight:600,fontSize:'0.9rem'}}>{exam.subject_name}</p>
                                    <p style={{margin:0,fontSize:'0.72rem',color:'var(--text-muted)'}}>{exam.duration_minutes} menit</p>
                                </div>
                                {en && (<>
                                    <label style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>Max:</label>
                                    <input type="number" min={1} max={20} defaultValue={en.max_attempts} style={{width:'55px',padding:'3px 6px',borderRadius:'6px',background:'rgba(0,0,0,0.3)',border:'1px solid var(--border)',color:'white',fontSize:'0.82rem'}} onBlur={e=>updateAttempts(en.enrollment_id,e.target.value)}/>
                                    <span style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>Terpakai: <b style={{color:'white'}}>{en.attempts_used}</b></span>
                                    <button className="btn-icon" title="Reset" onClick={()=>resetAttempts(en.enrollment_id)} style={{width:'26px',height:'26px'}}><RotateCcw size={12}/></button>
                                </>)}
                            </div>
                        );
                    })}
                </div>
            </motion.div>
        </div>
    );
};

const ResetPasswordModal = ({ user, onConfirm, onClose }) => {
    const [pw, setPw] = useState('');
    return (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(5px)',display:'flex',justifyContent:'center',alignItems:'center',zIndex:500,padding:'1rem'}}>
            <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} className="glass" style={{width:'400px',borderRadius:'16px',padding:'1.5rem',display:'flex',flexDirection:'column',gap:'1rem'}}>
                <div style={{display:'flex',justifyContent:'space-between'}}><h3 style={{margin:0}}>Reset Password</h3><button onClick={onClose} style={{background:'transparent',border:'none',color:'var(--text-muted)',cursor:'pointer'}}><X size={18}/></button></div>
                <p style={{margin:0,color:'var(--text-muted)',fontSize:'0.875rem'}}>Reset password untuk <strong style={{color:'white'}}>{user.nama_lengkap}</strong> ({user.nim})</p>
                <div className="form-field">
                    <label>Password Baru (kosong = NIM)</label>
                    <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder={`Default: ${user.nim}`}/>
                </div>
                <div style={{display:'flex',gap:'0.5rem'}}>
                    <button className="btn-sm btn-primary" style={{flex:1,justifyContent:'center'}} onClick={()=>onConfirm(pw||user.nim)}><Key size={14}/> Reset Password</button>
                    <button className="btn-sm btn-secondary" onClick={onClose}><X size={14}/> Batal</button>
                </div>
            </motion.div>
        </div>
    );
};

export default Dashboard;
