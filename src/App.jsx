import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard.jsx';
import AdminPanel from './components/AdminPanel.jsx';
import UserSelector from './components/UserSelector.jsx';

export default function App() {
  const [people, setPeople] = useState([]);
  const [settings, setSettings] = useState({ theme: 'dark', adminPin: '1234' });
  const [currentUser, setCurrentUser] = useState(null);
  const [activeView, setActiveView] = useState('dashboard'); // dashboard, admin
  const [theme, setTheme] = useState('dark');
  const [isLoading, setIsLoading] = useState(true);

  // Load initial settings and people list
  useEffect(() => {
    fetchInitialData();
    
    // Check localStorage for a saved user session
    const savedUser = localStorage.getItem('lunch_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse saved user session');
      }
    }
  }, []);

  // Sync index.css variables with current theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [peopleRes, settingsRes] = await Promise.all([
        fetch('/api/people'),
        fetch('/api/settings')
      ]);

      if (peopleRes.ok && settingsRes.ok) {
        const peopleData = await peopleRes.json();
        const settingsData = await settingsRes.json();
        
        setPeople(peopleData);
        setSettings(settingsData);
        setTheme(settingsData.theme || 'dark');
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshData = async () => {
    try {
      const res = await fetch('/api/people');
      if (res.ok) {
        const data = await res.json();
        setPeople(data);
        
        // Update current user score/info if they are in the list
        if (currentUser) {
          const updatedSelf = data.find(p => p.id === currentUser.id);
          if (updatedSelf) {
            setCurrentUser(updatedSelf);
            localStorage.setItem('lunch_user', JSON.stringify(updatedSelf));
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const handleSelectUser = (user) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem('lunch_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('lunch_user');
    }
  };

  const handleUpdateTheme = async (newTheme) => {
    setTheme(newTheme);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme })
      });
      setSettings(prev => ({ ...prev, theme: newTheme }));
    } catch (error) {
      console.error('Failed to save theme setting to backend:', error);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)',
        backgroundImage: 'radial-gradient(var(--border-card) 2px, transparent 2px)',
        backgroundSize: '28px 28px'
      }}>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <div style={{
          fontSize: '3.5rem',
          animation: 'spin 3s linear infinite',
          display: 'inline-block',
          marginBottom: '1.5rem',
          filter: 'drop-shadow(3px 3px 0px var(--border-card))'
        }}>🍕</div>
        <p style={{ 
          fontWeight: '800', 
          fontSize: '1.25rem', 
          color: 'var(--text-primary)', 
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          border: '3px solid var(--border-card)',
          background: 'var(--accent-amber)',
          padding: '0.75rem 1.5rem',
          borderRadius: '16px',
          boxShadow: '4px 4px 0px var(--border-card)'
        }}>
          🧑‍🍳 Baking the diner table... 🧑‍🍳
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Background radial overlays */}
      <div className="bg-gradient-mesh"></div>

      {/* User Login splash screen overlay */}
      {!currentUser && (
        <UserSelector 
          onSelectUser={handleSelectUser} 
        />
      )}

      <div className="app-container">
        {/* Top Header Navigation */}
        <header className="app-header">
          <div className="header-content-inner">
            <div className="header-brand">
              <div className="logo-icon">🍕</div>
              <span className="logo-text">HIT Lunch Club</span>
            </div>

            <div className="header-actions">
              {currentUser && (
                <>
                  <span className="user-operator-badge">
                    👤 diner // {currentUser.name}
                  </span>

                  <button 
                    className={`btn ${activeView === 'admin' ? 'btn-primary' : ''}`}
                    onClick={() => setActiveView(activeView === 'admin' ? 'dashboard' : 'admin')}
                  >
                    {activeView === 'admin' ? '🍽️ Dining Room' : '⚙️ Manager Office'}
                  </button>

                  <button 
                    className="btn"
                    onClick={() => handleUpdateTheme(theme === 'dark' ? 'light' : 'dark')}
                    title="Toggle diner theme"
                  >
                    {theme === 'dark' ? '☀️ Day Cafe' : '🌙 Night Tavern'}
                  </button>

                  <button 
                    className="btn btn-logout"
                    onClick={() => handleSelectUser(null)}
                    title="Leave the table"
                  >
                    🚪 Leave Table
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

      {/* Right Content Area */}
      <main className="app-main">
        {/* Title HUD Bar */}
        <div className="view-title-container">
          <h1 className="view-title">
            {activeView === 'dashboard' ? '🍕 The Great Diner Table' : '⚙️ Clubhouse Controls'}
          </h1>
          <div className="last-sync-badge">
            <span className="pulse-dot"></span>
            <span>DINER: <span className="badge-value">OPEN</span></span>
          </div>
        </div>

        {/* View Component Switcher */}
        {activeView === 'dashboard' ? (
          <Dashboard 
            people={people} 
            currentUser={currentUser} 
            onRefreshData={handleRefreshData}
          />
        ) : (
          <AdminPanel 
            people={people} 
            onRefreshData={handleRefreshData}
            themeSetting={theme}
            onUpdateTheme={handleUpdateTheme}
          />
        )}
      </main>
    </div>
  </>
);
}
