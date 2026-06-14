import React, { useState, useEffect } from 'react';

export default function Dashboard({ people, currentUser, onRefreshData }) {
  const [payerId, setPayerId] = useState('');
  const [selectedAttendees, setSelectedAttendees] = useState([]);
  const [restaurant, setRestaurant] = useState('');
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [gpsStatus, setGpsStatus] = useState('idle'); // idle, locating, success, error
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' });

  // Get active people for picker lists
  const activePeople = people.filter(p => p.isActive);

  // Auto-detect location on load
  useEffect(() => {
    detectLocation();
  }, []);

  // Set the default next payer (person with lowest score) as selected payer
  useEffect(() => {
    if (activePeople.length > 0 && !payerId) {
      const sorted = [...activePeople].sort((a, b) => a.score - b.score);
      setPayerId(sorted[0].id);
    }
  }, [people]);

  // Handle geolocation detection
  const detectLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      return;
    }

    setGpsStatus('locating');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        setGpsStatus('success');

        // Reverse geocoding using OpenStreetMap Nominatim API
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const placeName = addr.restaurant || 
                              addr.cafe || 
                              addr.fast_food || 
                              addr.bar ||
                              addr.pub ||
                              addr.food_court ||
                              addr.amenity ||
                              data.display_name.split(',')[0];
            
            if (placeName) {
              setRestaurant(placeName);
            }
          }
        } catch (error) {
          console.warn('Reverse geocoding failed:', error);
        }
      },
      (error) => {
        console.warn('Geolocation error:', error);
        setGpsStatus('error');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Toggle attendee presence
  const handleToggleAttendee = (id) => {
    if (selectedAttendees.includes(id)) {
      setSelectedAttendees(selectedAttendees.filter(aId => aId !== id));
    } else {
      setSelectedAttendees([...selectedAttendees, id]);
    }
  };

  // Clear selections after submission
  const resetForm = () => {
    setSelectedAttendees([]);
    setRestaurant('');
    detectLocation();
  };

  // Submit transaction to Express backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!payerId) {
      setSubmitMessage({ type: 'error', text: 'Select a payer.' });
      return;
    }
    if (selectedAttendees.length === 0) {
      setSubmitMessage({ type: 'error', text: 'Select at least one attendee present.' });
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/lunches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payerId,
          attendees: selectedAttendees,
          restaurant: restaurant.trim(), // Optional backend defaults to 'Coordinates Locked' if empty
          location,
          recordedBy: currentUser ? currentUser.name : 'Unknown User'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit transaction.');
      }

      setSubmitMessage({ type: 'success', text: 'Transaction recorded. Balance vectors updated.' });
      resetForm();
      onRefreshData();
      
      setTimeout(() => setSubmitMessage({ type: '', text: '' }), 4000);
    } catch (err) {
      setSubmitMessage({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedLeaderboard = [...people].sort((a, b) => a.score - b.score);

  // Get initials for profile representation
  const getInitials = (name) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Top Leaderboard */}
      <div>
        <h2 className="leaderboard-title">Balances</h2>
        <div className="leaderboard-scroll">
          {sortedLeaderboard.map((person, idx) => {
            const isLowestActive = person.isActive && 
              person.id === sortedLeaderboard.filter(p => p.isActive)[0]?.id;
            
            return (
              <div 
                key={person.id} 
                className={`leaderboard-card ${isLowestActive ? 'payer-target' : ''} ${!person.isActive ? 'inactive' : ''}`}
                style={{ opacity: person.isActive ? 1 : 0.4 }}
              >
                <div className="avatar">
                  {getInitials(person.name)}
                </div>
                <div className="user-name">{person.name}</div>
                <div className="user-score">
                  <span className={`score-badge ${
                    person.score > 0 ? 'score-positive' : person.score < 0 ? 'score-negative' : 'score-zero'
                  }`}>
                    {person.score > 0 ? `+${person.score.toFixed(2)}` : person.score.toFixed(2)}
                  </span>
                </div>
                {!person.isActive && (
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px', textTransform: 'uppercase' }}>Disabled</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Form 3-Column Side-by-Side Grid Layout */}
      <form onSubmit={handleSubmit} className="main-console">
        
        {/* Column 1 - Select Payer */}
        <div className="glass-card">
          <h3 className="console-title">Select Payer</h3>
          <div className="picker-grid">
            {activePeople.map(person => (
              <label
                key={person.id}
                className="picker-item"
              >
                <input
                  type="radio"
                  name="payer"
                  value={person.id}
                  checked={payerId === person.id}
                  onChange={() => {
                    setPayerId(person.id);
                    setSelectedAttendees(selectedAttendees.filter(aId => aId !== person.id));
                  }}
                  className="hidden-input"
                />
                <div className="picker-left">
                  <div className="mlt-indicator radio"></div>
                  <div className="avatar" style={{ width: '28px', height: '28px', fontSize: '0.75rem', margin: 0 }}>
                    {getInitials(person.name)}
                  </div>
                  <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>{person.name}</span>
                </div>
                <span className={`score-badge ${person.score >= 0 ? 'score-positive' : 'score-negative'}`} style={{ fontSize: '0.7rem' }}>
                  {person.score > 0 ? `+${person.score.toFixed(2)}` : person.score.toFixed(2)}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Column 2 - Select Attendees */}
        <div className="glass-card">
          <h3 className="console-title">Select Attendees Present</h3>
          <div className="picker-grid">
            {activePeople.map(person => {
              const isPayer = person.id === payerId;
              const isChecked = selectedAttendees.includes(person.id);
              
              return (
                <label
                  key={person.id}
                  className="picker-item"
                  style={{ 
                    opacity: isPayer ? 0.35 : 1,
                    cursor: isPayer ? 'not-allowed' : 'pointer'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isPayer}
                    onChange={() => handleToggleAttendee(person.id)}
                    className="hidden-input"
                  />
                  <div className="picker-left">
                    <div className="mlt-indicator checkbox"></div>
                    <div className="avatar" style={{ width: '28px', height: '28px', fontSize: '0.75rem', margin: 0 }}>
                      {getInitials(person.name)}
                    </div>
                    <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>{person.name} {isPayer && '(Payer)'}</span>
                  </div>
                  <span className={`score-badge ${person.score >= 0 ? 'score-positive' : 'score-negative'}`} style={{ fontSize: '0.7rem' }}>
                    {person.score > 0 ? `+${person.score.toFixed(2)}` : person.score.toFixed(2)}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Column 3 - Details & Verification */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
          <h3 className="console-title">Transaction Details</h3>
          
          <div className="meta-panel">
            {/* Location Name */}
            <div className="form-group">
              <label className="form-label">Location (Optional)</label>
              <div className="form-input-wrapper">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Auto-detecting position..."
                  value={restaurant}
                  onChange={(e) => setRestaurant(e.target.value)}
                />
                <button
                  type="button"
                  className="gps-refresh-btn"
                  onClick={detectLocation}
                  title="Refresh geolocation data"
                >
                  🛰️
                </button>
              </div>
            </div>

            {/* Location Status Badge */}
            <div className="location-indicator">
              {gpsStatus === 'locating' && <span style={{ color: 'var(--accent-amber)' }}>Acquiring GPS position...</span>}
              {gpsStatus === 'success' && (
                <span style={{ color: 'var(--accent-cyan)' }}>
                  Locked: {location.lat?.toFixed(5)}, {location.lng?.toFixed(5)}
                </span>
              )}
              {gpsStatus === 'error' && (
                <span>Coordinates unavailable (manual overrides active)</span>
              )}
              {gpsStatus === 'idle' && <span>Position unlocked</span>}
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Recorded by: <strong style={{ color: 'var(--text-primary)' }}>{currentUser?.name || 'Admin'}</strong>
            </div>
          </div>

          {/* Score Live Preview */}
          {payerId && selectedAttendees.length > 0 && (
            <div className="preview-box">
              <div className="preview-title">Balance Delta Review</div>
              <div className="preview-grid">
                <span className="preview-pill" style={{ color: 'var(--accent-cyan)' }}>
                  {people.find(p => p.id === payerId)?.name}: +{selectedAttendees.length.toFixed(2)}
                </span>
                
                {selectedAttendees.map(id => (
                  <span key={id} className="preview-pill" style={{ color: 'var(--accent-rose)' }}>
                    {people.find(p => p.id === id)?.name}: -1.00
                  </span>
                ))}
              </div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Verification: +{selectedAttendees.length.toFixed(2)} + ({selectedAttendees.length.toFixed(2) * -1}) = <strong>0.00</strong> (Strict Zero-Sum)
              </div>
            </div>
          )}

          {/* Response Alerts */}
          {submitMessage.text && (
            <div style={{
              padding: '0.6rem 0.85rem',
              fontSize: '0.8rem',
              fontWeight: '600',
              borderRadius: '6px',
              background: submitMessage.type === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
              color: submitMessage.type === 'success' ? 'var(--accent-emerald)' : 'var(--accent-rose)',
              border: `1px solid ${submitMessage.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'}`
            }}>
              {submitMessage.text}
            </div>
          )}

          {/* Submit button */}
          <div style={{ marginTop: 'auto' }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem' }}
              disabled={isSubmitting || !payerId || selectedAttendees.length === 0}
            >
              {isSubmitting ? 'Transmitting transaction...' : 'Record Transaction'}
            </button>
          </div>

        </div>

      </form>

    </div>
  );
}
