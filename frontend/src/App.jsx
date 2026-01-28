import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './components/Login';
import Exam from './components/Exam';
import Dashboard from './components/Dashboard';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import './App.css';

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles, user }) => {
  if (!user) return <Navigate to="/" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect based on role if unauthorized
    if (user.role === 'admin') return <Navigate to="/dashboard" replace />;
    if (user.role === 'teacher') return <Navigate to="/teacher" replace />;
    return <Navigate to="/student-dashboard" replace />;
  }
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load session from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('user_session');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    localStorage.setItem('user_session', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user_session');
    setUser(null);
    window.location.href = '/';
  };

  if (loading) return null;

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          user ? (
            user.role === 'admin' ? <Navigate to="/dashboard" /> :
              user.role === 'teacher' ? <Navigate to="/teacher" /> :
                <Navigate to="/student-dashboard" />
          ) : (
            <Login onLogin={handleLogin} />
          )
        } />

        {/* Student Routes */}
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

        {/* Teacher Routes */}
        <Route path="/teacher" element={
          <ProtectedRoute user={user} allowedRoles={['teacher']}>
            <TeacherDashboard onLogout={handleLogout} />
          </ProtectedRoute>
        } />

        {/* Admin Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute user={user} allowedRoles={['admin']}>
            <Dashboard />
          </ProtectedRoute>
        } />

        {/* Catch All */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
