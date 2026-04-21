import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Shield, User as UserIcon, LogIn, Eye, EyeOff, Lock } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [nim,      setNim]      = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/api/login', { nim, password: password || nim });
      onLogin(res.data.user, res.data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Login gagal. Pastikan server backend sudah berjalan.');
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
          <p>Rule-Based &amp; AI Behavior Monitoring</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* NIM */}
          <div className="input-group">
            <UserIcon size={18} className="input-icon" />
            <input
              type="text"
              placeholder="NIM / Student ID"
              value={nim}
              onChange={e => setNim(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          {/* Password */}
          <div className="input-group">
            <Lock size={18} className="input-icon" />
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Password (default: NIM Anda)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              style={{ paddingRight: '42px' }}
            />
            <button
              type="button"
              className="pw-toggle"
              onClick={() => setShowPw(v => !v)}
              tabIndex={-1}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="login-error">
              ⚠️ {error}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading || !nim}>
            {loading ? 'Memeriksa...' : <><LogIn size={20} /> Masuk ke Ujian</>}
          </button>
        </form>

        <div className="login-footer">
          <p>Admin: <span>admin</span> &bull; Guru: <span>guru</span> &bull; Siswa: NIM</p>
          <p style={{ marginTop: '0.25rem', fontSize: '0.72rem', opacity: 0.6 }}>
            Password default = NIM Anda (hubungi admin jika lupa)
          </p>
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
          width: 420px;
          padding: 3rem 2.5rem;
          text-align: center;
        }
        .login-header h1 { margin: 1rem 0 0.25rem; font-size: 1.75rem; }
        .login-header p  { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 2rem; }
        .logo-box {
          background: rgba(0, 180, 219, 0.1);
          width: 64px; height: 64px;
          border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto;
        }
        .input-group {
          position: relative;
          margin-bottom: 1.25rem;
        }
        .input-icon {
          position: absolute; left: 12px; top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }
        .input-group input { padding-left: 40px; }
        .pw-toggle {
          position: absolute; right: 10px; top: 50%;
          transform: translateY(-50%);
          background: transparent; border: none; padding: 4px;
          color: var(--text-muted); cursor: pointer;
          display: flex; align-items: center;
        }
        .pw-toggle:hover { color: var(--primary); }
        .login-error {
          background: rgba(239,68,68,0.12);
          border: 1px solid rgba(239,68,68,0.3);
          border-radius: 8px;
          padding: 0.6rem 1rem;
          font-size: 0.85rem; color: #fca5a5;
          margin-bottom: 1rem;
          text-align: left;
        }
        .login-footer {
          margin-top: 1.5rem; font-size: 0.8rem; color: var(--text-muted);
        }
        .login-footer span { color: var(--primary); font-weight: 600; }
      `}</style>
    </div>
  );
};

export default Login;
