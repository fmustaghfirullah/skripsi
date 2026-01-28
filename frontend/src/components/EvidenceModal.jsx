import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Activity, Search, ShieldAlert } from 'lucide-react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const EvidenceModal = ({ session, onClose }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvidence = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/admin/evidence/${session.session_id}`);
                setLogs(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchEvidence();
    }, [session]);

    const chartData = logs.map((l, i) => ({
        time: new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        score: l.RFModelResult ? l.RFModelResult.conf_score * 100 : 0
    }));

    const avgTrust = chartData.length > 0
        ? 100 - (chartData.reduce((a, b) => a + b.score, 0) / chartData.length)
        : 100;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="modal-overlay"
            >
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="modal-content glass"
                >
                    <div className="modal-header">
                        <div>
                            <h2>Forensic Analysis</h2>
                            <p>Session ID: #{session.session_id} • {session.User?.nama_lengkap}</p>
                        </div>
                        <button onClick={onClose} className="close-btn"><X size={20} /></button>
                    </div>

                    <div className="evidence-grid">
                        {/* Trust Gauge */}
                        <div className="gauge-card glass-inner">
                            <h3>Trust Score</h3>
                            <div className="gauge-circle" style={{
                                background: `conic-gradient(${avgTrust > 50 ? '#22c55e' : '#ef4444'} ${avgTrust}%, transparent 0)`
                            }}>
                                <div className="inner-circle">
                                    <span>{avgTrust.toFixed(1)}%</span>
                                </div>
                            </div>
                            <p>{avgTrust > 70 ? 'SAFE' : avgTrust > 40 ? 'SUSPICIOUS' : 'CRITICAL'}</p>
                        </div>

                        {/* Timeline Chart */}
                        <div className="chart-card glass-inner">
                            <h3>Cheat Probability Timeline</h3>
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={chartData}>
                                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} />
                                    <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} />
                                    <Tooltip
                                        contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px' }}
                                        itemStyle={{ color: '#f8fafc' }}
                                    />
                                    <Line type="monotone" dataKey="score" stroke="#ef4444" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Crime Log */}
                    <div className="crime-log glass-inner">
                        <h3>Event Context Log</h3>
                        <div className="log-list">
                            {logs.map((log) => (
                                <div key={log.log_id} className={`log-item ${log.activity_type === 'forbidden_key' ? 'high-risk' : ''}`}>
                                    <span className="log-time">{new Date(log.createdAt).toLocaleTimeString()}</span>
                                    <div className="log-type">
                                        {log.activity_type === 'blur' && <Activity size={14} />}
                                        {log.activity_type === 'forbidden_key' && <AlertTriangle size={14} />}
                                        <span>{log.activity_type.toUpperCase().replace('_', ' ')}</span>
                                    </div>
                                    <span className="log-detail">{log.details || 'No details captured'}</span>
                                    {log.RFModelResult && (
                                        <span className="log-score">{(log.RFModelResult.conf_score * 100).toFixed(0)}% Risk</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                </motion.div>
            </motion.div>

            <style>{`
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(5px);
          display: flex; justify-content: center; align-items: center;
          z-index: 999;
          padding: 2rem;
        }
        .modal-content {
          width: 900px;
          max-height: 90vh;
          background: #0f172a;
          border: 1px solid var(--border);
          display: flex; flex-direction: column;
          overflow: hidden;
        }
        .modal-header {
          padding: 1.5rem;
          border-bottom: 1px solid var(--border);
          display: flex; justify-content: space-between; align-items: flex-start;
        }
        .modal-header h2 { margin: 0; font-size: 1.25rem; }
        .modal-header p { margin: 4px 0 0; color: var(--text-muted); font-size: 0.9rem; }
        .close-btn { background: transparent; color: var(--text-muted); padding: 4px; }
        .close-btn:hover { color: white; background: rgba(255,255,255,0.1); }

        .evidence-grid {
          display: grid; grid-template-columns: 200px 1fr; gap: 1rem;
          padding: 1.5rem;
        }
        .glass-inner {
          background: rgba(255,255,255,0.03);
          border-radius: 12px;
          padding: 1rem;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .evidence-grid h3, .crime-log h3 { 
          margin: 0 0 1rem; font-size: 0.85rem; 
          text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); 
        }

        /* Gauge */
        .gauge-card { text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .gauge-circle {
          width: 100px; height: 100px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 0.5rem;
          position: relative;
        }
        .inner-circle {
          width: 80px; height: 80px;
          background: #0f172a;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 1.5rem;
        }

        /* Crime Log */
        .crime-log { flex: 1; margin: 0 1.5rem 1.5rem; overflow: hidden; display: flex; flex-direction: column; }
        .log-list { overflow-y: auto; padding-right: 8px; flex: 1; }
        .log-item { display: flex; align-items: center; padding: 0.75rem; border-bottom: 1px solid var(--border); font-size: 0.9rem; }
        .log-item:last-child { border-bottom: none; }
        .log-time { color: var(--text-muted); font-family: monospace; width: 80px; }
        .log-type { display: flex; align-items: center; gap: 6px; width: 140px; font-weight: 600; color: var(--primary); }
        .log-detail { flex: 1; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .log-score { font-size: 0.8rem; color: #ef4444; font-weight: 600; }
        
        .log-item.high-risk { background: rgba(239, 68, 68, 0.05); }
      `}</style>
        </AnimatePresence>
    );
};

export default EvidenceModal;
