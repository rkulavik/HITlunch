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
        <h1 className="splash-title">HIT Lunch Club</h1>
        <p className="splash-subtitle">🍔 diner entrance // grab a seat! 🍟</p>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="form-group">
            <label className="form-label">Diner Username</label>
            <input
              type="text"
              className="form-input"
              placeholder="Who are you? (e.g. Richard)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoggingIn}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Diner Passcode</label>
            <input
              type="password"
              className="form-input"
              placeholder="Enter secret passcode"
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
              fontWeight: '700',
              background: 'var(--accent-rose)',
              color: '#ffffff',
              border: '3px solid var(--border-card)',
              borderRadius: '12px',
              boxShadow: '3px 3px 0px var(--border-card)'
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
            disabled={isLoggingIn || !username.trim() || !password}
          >
            {isLoggingIn ? '🚪 Opening the door...' : '🚪 Step Inside!'}
          </button>
        </form>

        {/* Diagnostic local details styled as a yellow VIP sticky note */}
        <div style={{
          marginTop: '2.25rem',
          padding: '0.85rem 1.1rem',
          background: '#fff59d',
          color: '#1a1a1a',
          border: '3px solid var(--border-card)',
          borderRadius: '12px',
          fontFamily: 'var(--font-sans)',
          fontSize: '0.8rem',
          boxShadow: '4px 4px 0px var(--border-card)',
          transform: 'rotate(1.5deg)',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: '-10px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(239, 68, 68, 0.4)',
            width: '60px',
            height: '14px',
            borderRadius: '2px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }} title="Tape indicator"></div>
          <div style={{ color: '#795548', fontWeight: '800', marginBottom: '0.3rem', textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'center' }}>
            🤫 DINER VIP MEMO:
          </div>
          <div style={{ color: '#4e342e', fontWeight: '600', lineHeight: '1.4' }}>
            Eaters: <strong>Richard</strong>, <strong>Sarah</strong>, <strong>David</strong>, <strong>Emma</strong>
            <br />
            Secret Code: <strong style={{ color: '#c2185b' }}>password123</strong>
          </div>
        </div>

      </div>
    </div>
  );
}
