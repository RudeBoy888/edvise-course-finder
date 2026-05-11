import React, { useState } from 'react';
import edviseLogo from '../assets/edvise-logo.png';
import '../styles/AgentLogin.css';

export function AgentLogin({ onSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const correct = (import.meta.env.VITE_AGENT_PASSWORD || '').trim();
    if (password.trim() === correct) {
      localStorage.setItem('edvise_agent_auth', 'true');
      onSuccess();
    } else {
      setError(true);
      setShaking(true);
      setPassword('');
      setTimeout(() => setShaking(false), 500);
    }
  };

  return (
    <div className="agent-login-overlay">
      <div className={`agent-login-box ${shaking ? 'shake' : ''}`}>
        <img src={edviseLogo} alt="EDVISE" className="agent-login-logo" />
        <h1 className="agent-login-title">EDVISE Course Finder</h1>
        <p className="agent-login-subtitle">Agent access only</p>

        <form onSubmit={handleSubmit} className="agent-login-form">
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(false); }}
            placeholder="Enter access password"
            className={`agent-login-input ${error ? 'error' : ''}`}
            autoFocus
          />
          {error && <p className="agent-login-error">Incorrect password</p>}
          <button type="submit" className="agent-login-btn">
            Access
          </button>
        </form>
      </div>
    </div>
  );
}
