import React, { useState } from 'react';

export default function UserSelector({ onSelectUser }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setError('');
    setIsLoggingIn(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid username or passcode credentials.');
      }

      onSelectUser(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="splash-overlay">
      <div className="splash-card">
        <h1 className="splash-title">HIT Lunch</h1>
        <p className="splash-subtitle">System Authentication Console</p>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoggingIn}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Security Passcode</label>
            <input
              type="password"
              className="form-input"
              placeholder="Enter passcode"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoggingIn}
            />
          </div>

          {error && (
            <div style={{
              padding: '0.6rem 0.85rem',
              fontSize: '0.8rem',
              fontWeight: '600',
              fontFamily: 'var(--font-sans)',
              background: 'rgba(244, 63, 94, 0.08)',
              color: 'var(--accent-rose)',
              border: '1px solid rgba(244, 63, 94, 0.2)',
              borderRadius: '6px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
            disabled={isLoggingIn || !username.trim() || !password}
          >
            {isLoggingIn ? 'Verifying session...' : 'Log In'}
          </button>
        </form>

        {/* Diagnostic local details */}
        <div style={{
          marginTop: '2rem',
          padding: '0.75rem',
          background: 'rgba(255, 255, 255, 0.01)',
          border: '1px dashed var(--border-card)',
          borderRadius: '8px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.7rem'
        }}>
          <div style={{ color: 'var(--accent-cyan)', fontWeight: '700', marginBottom: '0.3rem' }}>
            🛰️ System Seeding Accounts:
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            Users: <strong>Richard</strong>, <strong>Sarah</strong>, <strong>David</strong>, <strong>Emma</strong>
            <br />
            Password: <strong>password123</strong>
          </div>
        </div>

      </div>
    </div>
  );
}
