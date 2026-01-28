import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Shield, User as UserIcon, LogIn } from 'lucide-react';

const Login = ({ onLogin }) => {
    const [nama, setNama] = useState('');
    const [nim, setNim] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await axios.post('http://localhost:5000/api/login', { nama, nim });
            onLogin(res.data);
        } catch (err) {
            alert("Login gagal. Pastikan server backend sudah berjalan.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="login-card glass"
            >
                <div className="login-header">
                    <div className="logo-box">
                        <Shield size={32} color="#00b4db" />
                    </div>
                    <h1>CBT Secure</h1>
                    <p>Rule-Based & AI Behavior Monitoring</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <UserIcon size={18} className="input-icon" />
                        <input
                            type="text"
                            placeholder="Full Name"
                            value={nama}
                            onChange={(e) => setNama(e.target.value)}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <Shield size={18} className="input-icon" />
                        <input
                            type="text"
                            placeholder="NIM / Student ID"
                            value={nim}
                            onChange={(e) => setNim(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? "Initializing..." : <><LogIn size={20} /> Enter Examination</>}
                    </button>
                </form>

                <div className="login-footer">
                    <p>Admin access: use NIM <span>admin</span></p>
                </div>
            </motion.div>

            <style>{`
        .login-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
        }
        .login-card {
          width: 400px;
          padding: 3rem 2.5rem;
          text-align: center;
        }
        .login-header h1 {
          margin: 1rem 0 0.25rem;
          font-size: 1.75rem;
        }
        .login-header p {
          color: var(--text-muted);
          font-size: 0.9rem;
          margin-bottom: 2rem;
        }
        .logo-box {
          background: rgba(0, 180, 219, 0.1);
          width: 64px;
          height: 64px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
        }
        .input-group {
          position: relative;
          margin-bottom: 1.25rem;
        }
        .input-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }
        .input-group input {
          padding-left: 40px;
        }
        .login-footer {
          margin-top: 1.5rem;
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .login-footer span {
          color: var(--primary);
          font-weight: 600;
        }
      `}</style>
        </div>
    );
};

export default Login;
