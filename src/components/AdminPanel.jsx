import React, { useState, useEffect } from 'react';

export default function AdminPanel({ people, onRefreshData, themeSetting, onUpdateTheme }) {
  const [activeTab, setActiveTab] = useState('people'); // people, history, settings
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonPassword, setNewPersonPassword] = useState('password123');
  const [history, setHistory] = useState([]);
  const [dbType, setDbType] = useState('DETECTING...');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [resetNamesList, setResetNamesList] = useState('Richard, Sarah, David, Emma');
  const [isResetting, setIsResetting] = useState(false);

  const handleResetDb = async (e) => {
    e.preventDefault();
    const names = resetNamesList
      .split(',')
      .map(n => n.trim())
      .filter(n => n.length > 0);

    if (names.length === 0) {
      alert('You must provide at least one person name.');
      return;
    }

    if (!confirm('🚨 CRITICAL WARNING 🚨\n\nThis will permanently DELETE all lunch transactions, reset all user profiles, and re-seed the system with only the listed users (all starting with a 0.00 balance).\n\nAre you absolutely sure you want to proceed?')) {
      return;
    }

    setIsResetting(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/settings/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ people: names })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset database.');
      }
      setMessage({ type: 'success', text: 'Database reset successfully. All scores reset to 0.00.' });
      onRefreshData();
      if (activeTab === 'history') {
        fetchHistory();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsResetting(false);
    }
  };

  // Load history when tab is clicked
  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
    fetchSettings();
  }, [activeTab]);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/lunches');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.dbType) {
          setDbType(data.dbType.toUpperCase());
        }
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  // Add person
  const handleAddPerson = async (e) => {
    e.preventDefault();
    if (!newPersonName.trim()) return;

    setIsAdding(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newPersonName.trim(),
          password: newPersonPassword || 'password123'
        })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to add user profile');

      setMessage({ type: 'success', text: `Profile registered: ${newPersonName.trim()}` });
      setNewPersonName('');
      setNewPersonPassword('password123');
      onRefreshData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsAdding(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (id, currentActive) => {
    try {
      const res = await fetch(`/api/people/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive })
      });
      if (res.ok) {
        onRefreshData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update user status');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete person profile (with balance redistribution warning)
  const handleDeletePerson = async (id, name, score) => {
    const activeOthers = people.filter(p => p.id !== id && p.isActive);
    
    let alertMsg = `DELETE PROFILE\n------------------\n` +
                   `User: ${name}\n` +
                   `Balance: ${score.toFixed(2)}\n\n` +
                   `Warning: Deleting a profile is permanent. `;
    
    if (score !== 0) {
      if (activeOthers.length === 0) {
        alertMsg += `Because there are no other active members, this non-zero balance cannot be redistributed. Please deactivate the user profile instead.`;
        alert(alertMsg);
        return;
      } else {
        alertMsg += `To maintain a zero-sum balance, this profile's score of ${score.toFixed(2)} will be redistributed evenly among the other ${activeOthers.length} active users (${activeOthers.map(o=>o.name).join(', ')}).\n\nDelete profile?`;
      }
    } else {
      alertMsg += `Delete profile?`;
    }

    if (!confirm(alertMsg)) return;

    try {
      const res = await fetch(`/api/people/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Deleted profile "${name}". Balances redistributed.` });
        onRefreshData();
      } else {
        throw new Error(data.error || 'Failed to delete user profile.');
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleUpdatePassword = async (id, name) => {
    const newPassword = prompt(`CHANGE PASSCODE\n------------------\nEnter new security passcode for ${name}:`);
    if (newPassword === null) return;
    if (newPassword.trim() === '') {
      alert('Passcode cannot be empty.');
      return;
    }
    
    try {
      const res = await fetch(`/api/people/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Passcode updated successfully for ${name}.` });
      } else {
        throw new Error(data.error || 'Failed to update passcode.');
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // Revert transaction
  const handleDeleteLunch = async (lunchId) => {
    if (!confirm('REVERT TRANSACTION\n------------------\nAre you sure you want to delete this lunch log? Payer credit and attendee debits will be reversed.')) {
      return;
    }

    try {
      const res = await fetch(`/api/lunches/${lunchId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Transaction reverted and balances updated.' });
        fetchHistory();
        onRefreshData();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to revert transaction.');
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const getPersonName = (id) => {
    const person = people.find(p => p.id === id);
    return person ? person.name : 'DELETED PROFILE';
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n=>n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className="admin-layout">
      
      {/* Sidebar Links */}
      <div className="admin-nav">
        <button 
          className={`admin-nav-item ${activeTab === 'people' ? 'active' : ''}`}
          onClick={() => setActiveTab('people')}
        >
          👤 Profiles
        </button>
        <button 
          className={`admin-nav-item ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📜 Transaction Log
        </button>
        <button 
          className={`admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Utilities & Storage
        </button>
      </div>

      {/* Main Content card */}
      <div className="glass-card" style={{ flex: 1 }}>
        
        {message.text && (
          <div style={{
            padding: '0.6rem 0.85rem',
            fontSize: '0.8rem',
            fontWeight: '600',
            borderRadius: '6px',
            marginBottom: '1.5rem',
            background: message.type === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
            color: message.type === 'success' ? 'var(--accent-emerald)' : 'var(--accent-rose)',
            border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'}`
          }}>
            {message.text}
          </div>
        )}

        {/* Tab 1: Profiles */}
        {activeTab === 'people' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Add User Profile Form */}
            <div>
              <h3 className="console-title">Register New Profile</h3>
              <form onSubmit={handleAddPerson} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter full name"
                    value={newPersonName}
                    onChange={(e) => setNewPersonName(e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Passcode</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Default: password123"
                    value={newPersonPassword}
                    onChange={(e) => setNewPersonPassword(e.target.value)}
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ alignSelf: 'flex-start' }}
                  disabled={isAdding}
                >
                  {isAdding ? 'Registering...' : 'Register Profile'}
                </button>
              </form>
            </div>

            {/* People List Table */}
            <div>
              <h3 className="console-title">Registered User Profiles</h3>
              <div className="history-table-wrapper">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Initials</th>
                      <th>Name</th>
                      <th>Balance</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {people.map(person => (
                      <tr key={person.id} style={{ opacity: person.isActive ? 1 : 0.45 }}>
                        <td>
                          <div className="avatar" style={{ width: '28px', height: '28px', fontSize: '0.75rem', margin: 0 }}>
                            {getInitials(person.name)}
                          </div>
                        </td>
                        <td style={{ fontWeight: '600' }}>{person.name}</td>
                        <td className="mono-val">
                          <span className={`score-badge ${
                            person.score > 0 ? 'score-positive' : person.score < 0 ? 'score-negative' : 'score-zero'
                          }`}>
                            {person.score > 0 ? `+${person.score.toFixed(2)}` : person.score.toFixed(2)}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <label className="switch">
                              <input 
                                type="checkbox" 
                                checked={person.isActive} 
                                onChange={() => handleToggleActive(person.id, person.isActive)}
                              />
                              <span className="slider"></span>
                            </label>
                            <span style={{ fontSize: '0.75rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                              {person.isActive ? 'Active' : 'Disabled'}
                            </span>
                          </div>
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(person.createdAt || new Date()).toLocaleDateString()}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              className="btn"
                              style={{ 
                                padding: '0.25rem 0.5rem', 
                                fontSize: '0.7rem', 
                                color: 'var(--accent-cyan)', 
                                borderColor: 'var(--border-card)'
                              }}
                              onClick={() => handleUpdatePassword(person.id, person.name)}
                            >
                              Password
                            </button>
                            <button
                              className="btn"
                              style={{ 
                                padding: '0.25rem 0.5rem', 
                                fontSize: '0.7rem', 
                                color: 'var(--accent-rose)', 
                                borderColor: 'var(--border-card)'
                              }}
                              onClick={() => handleDeletePerson(person.id, person.name, person.score)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* Tab 2: Transaction History Log */}
        {activeTab === 'history' && (
          <div>
            <h3 className="console-title">Transaction Log Archive</h3>
            {history.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', fontSize: '0.85rem' }}>
                No recorded logs found in database.
              </p>
            ) : (
              <div className="history-table-wrapper">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Location</th>
                      <th>Credit Node</th>
                      <th>Debit Nodes</th>
                      <th>Operator</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(log => (
                      <tr key={log.id}>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {new Date(log.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td style={{ fontWeight: '600' }}>
                          {log.restaurant}
                          {log.location?.lat && (
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '400' }}>
                              GPS: {log.location.lat.toFixed(5)}, {log.location.lng.toFixed(5)}
                            </div>
                          )}
                        </td>
                        <td style={{ color: 'var(--accent-emerald)', fontWeight: '600' }}>
                          {getPersonName(log.payerId)} <small>(+{log.amount.toFixed(2)})</small>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {log.attendees.map(aId => getPersonName(aId)).join(', ')}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {log.recordedBy || 'SYSTEM'}
                        </td>
                        <td>
                          <button
                            className="btn"
                            style={{ 
                              padding: '0.25rem 0.5rem', 
                              fontSize: '0.7rem', 
                              color: 'var(--accent-rose)', 
                              borderColor: 'var(--border-card)'
                            }}
                            onClick={() => handleDeleteLunch(log.id)}
                          >
                            Revert
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Settings & Configuration */}
        {activeTab === 'settings' && (
          <div className="settings-section">
            <h3 className="console-title">Database & HUD Infrastructure</h3>
            
            {/* Database mode connection */}
            <div className="settings-row">
              <div>
                <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Storage Provider</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Indicates if database is hosted locally or via GCP Firestore Cloud Services
                </div>
              </div>
              <span className="score-badge" style={{ 
                background: 'rgba(99, 102, 241, 0.08)', 
                color: 'var(--accent-indigo)',
                fontWeight: '700',
                fontSize: '0.75rem',
                padding: '0.35rem 0.75rem',
                border: '1px solid rgba(99, 102, 241, 0.2)'
              }}>
                DB://{dbType}
              </span>
            </div>

            {/* Light/Dark settings */}
            <div className="settings-row">
              <div>
                <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Color Scheme Theme</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Switch browser display modes
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', fontWeight: '600' }}>
                <span>LIGHT</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={themeSetting === 'dark'} 
                    onChange={() => onUpdateTheme(themeSetting === 'dark' ? 'light' : 'dark')}
                  />
                  <span className="slider"></span>
                </label>
                <span>DARK</span>
              </div>
            </div>

            {/* System Status Indicators */}
            <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-card)', borderRadius: '8px', fontSize: '0.75rem' }}>
              <div style={{ color: 'var(--accent-indigo)', fontWeight: '700', marginBottom: '0.5rem' }}>DATA INTEGRITY ENGINE SPECIFICATIONS:</div>
              <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <li>SUM(VECTORS) == 0.00 (STRICT ZERO-SUM POOL GUARANTEE).</li>
                <li>PROFILE DELETION TRIGGERS REMAINDER-SAFE BALANCE REDISTRIBUTION.</li>
                <li>TRANSACTION ROLLBACKS PERFORM ATOMIC DEBT INVERSION.</li>
                <li>DEACTIVATING USERS RETAINS BALANCE IN SUMMATION BUT HIDES TOGGLE INTERFACES.</li>
              </ul>
            </div>

            {/* Database Reset / Danger Zone */}
            <div style={{ marginTop: '2.5rem', borderTop: '1px solid var(--border-card)', paddingTop: '2rem' }}>
              <h4 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.95rem',
                fontWeight: '700',
                marginBottom: '0.75rem',
                color: 'var(--accent-rose)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                ⚠️ Danger Zone: Initial State Setup
              </h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: '1.4' }}>
                Wipe all transaction logs and seed database with a clean zero-sum initial state. Enter a comma-separated list of names to seed as active profiles.
              </p>
              
              <form onSubmit={handleResetDb} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Seed Users (Comma Separated)</label>
                  <textarea
                    className="form-input"
                    style={{ 
                      minHeight: '80px', 
                      fontFamily: 'var(--font-sans)', 
                      resize: 'vertical',
                      lineHeight: '1.5'
                    }}
                    placeholder="e.g. Richard, Sarah, David, Emma"
                    value={resetNamesList}
                    onChange={(e) => setResetNamesList(e.target.value)}
                    required
                    disabled={isResetting}
                  />
                </div>
                
                <button
                  type="submit"
                  className="btn"
                  style={{
                    alignSelf: 'flex-start',
                    borderColor: 'var(--accent-rose)',
                    color: 'var(--accent-rose)',
                    background: 'rgba(244, 63, 94, 0.02)'
                  }}
                  disabled={isResetting || !resetNamesList.trim()}
                >
                  {isResetting ? 'Resetting System...' : 'Initialize & Restart State'}
                </button>
              </form>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
