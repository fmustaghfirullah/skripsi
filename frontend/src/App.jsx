import React, { useState } from 'react';
import Login from './components/Login';
import Exam from './components/Exam';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  const [user, setUser] = useState(null);

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  if (user.nim === 'admin') {
    return <Dashboard />;
  }

  return <Exam user={user} />;
}

export default App;
