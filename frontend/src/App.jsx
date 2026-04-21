import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './components/Login';
import Exam from './components/Exam';
import Dashboard from './components/Dashboard';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import './App.css';

// Base URL terpusat — ubah sesuai environment
axios.defaults.baseURL = 'http://localhost:5000';

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles, user }) => {
  if (!user) return <Navigate to="/" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'admin')   return <Navigate to="/dashboard" replace />;
    if (user.role === 'teacher') return <Navigate to="/teacher" replace />;
    return <Navigate to="/student-dashboard" replace />;
  }
  return children;
};

function App() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Muat sesi & token dari localStorage
  useEffect(() => {
    const storedUser  = localStorage.getItem('user_session');
    const storedToken = localStorage.getItem('auth_token');

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }
    setLoading(false);
  }, []);

  // Interceptor: auto-logout jika token expired (401)
  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      res => res,
      err => {
        if (err.response?.status === 401) {
          handleLogout();
        }
        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(interceptorId);
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('user_session', JSON.stringify(userData));
    localStorage.setItem('auth_token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user_session');
    localStorage.removeItem('auth_token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    window.location.href = '/';
  };

  if (loading) return null;

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          user ? (
            user.role === 'admin'   ? <Navigate to="/dashboard" /> :
            user.role === 'teacher' ? <Navigate to="/teacher" /> :
            <Navigate to="/student-dashboard" />
          ) : (
            <Login onLogin={handleLogin} />
          )
        } />

        {/* Student */}
        <Route path="/student-dashboard" element={
          <ProtectedRoute user={user} allowedRoles={['student']}>
            <StudentDashboard user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        } />
        <Route path="/exam/:examId" element={
          <ProtectedRoute user={user} allowedRoles={['student']}>
            <Exam user={user} />
          </ProtectedRoute>
        } />

        {/* Teacher */}
        <Route path="/teacher" element={
          <ProtectedRoute user={user} allowedRoles={['teacher']}>
            <TeacherDashboard onLogout={handleLogout} />
          </ProtectedRoute>
        } />

        {/* Admin */}
        <Route path="/dashboard" element={
          <ProtectedRoute user={user} allowedRoles={['admin']}>
            <Dashboard onLogout={handleLogout} />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
