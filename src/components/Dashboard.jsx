import React, { useState, useEffect } from 'react';

const renderAlligatorArms = (score) => {
  if (score === 0) return null;
  
  const absScore = Math.abs(score);
  
  if (score < 0) {
    // Alligator arms: shrink to be extremely short.
    // Base width is 38px, shrinks down to 14px.
    const widthPx = Math.max(14, 38 - (absScore * 3.5));
    
    // Wiggle speed: more negative = faster wiggling (frantic vibration/reach attempt)
    // Duration decreases from 0.8s down to 0.08s (ludicrous speed)
    const duration = Math.max(0.08, 1.0 - (absScore * 0.16));
    
    return (
      <div className="alligator-arms-wrapper">
        <svg 
          className="alligator-arm left-arm negative-arm" 
          viewBox="0 0 50 30" 
          style={{ 
            width: `${widthPx}px`, 
            height: `${widthPx * 0.7}px`,
            '--wiggle-dur': `${duration}s`, 
            '--wiggle-dur-hover': `${duration * 0.4}s` 
          }}
        >
          <path d="M50,15 C42,10 30,10 25,14 C20,18 16,16 12,14 C8,12 4,14 1,18 C3,18 5,16 7,17 C5,18 3,20 2,22 C1,23 3,24 5,23 C7,22 9,19 11,18 C14,19 17,17 19,17 C24,21 38,21 50,15 Z" fill="#10b981" />
          <circle cx="4" cy="15" r="2.2" fill="#ffffff" />
          <circle cx="5" cy="17" r="2.2" fill="#ffffff" />
          <circle cx="4" cy="19" r="2.2" fill="#ffffff" />
        </svg>
        <svg 
          className="alligator-arm right-arm negative-arm" 
          viewBox="0 0 50 30" 
          style={{ 
            width: `${widthPx}px`, 
            height: `${widthPx * 0.7}px`,
            '--wiggle-dur': `${duration}s`, 
            '--wiggle-dur-hover': `${duration * 0.4}s` 
          }}
        >
          <path d="M0,15 C8,10 20,10 25,14 C30,18 34,16 38,14 C42,12 46,14 49,18 C50,15 50,17 49,18 C47,18 45,16 43,17 C45,18 47,20 48,22 C49,23 47,24 45,23 C43,22 41,19 39,18 C36,19 33,17 31,17 C26,21 12,21 0,15 Z" fill="#10b981" />
          <circle cx="46" cy="15" r="2.2" fill="#ffffff" />
          <circle cx="45" cy="17" r="2.2" fill="#ffffff" />
          <circle cx="46" cy="19" r="2.2" fill="#ffffff" />
        </svg>
      </div>
    );
  } else {
    // Golden elastic arms: grow longer as the score gets more positive.
    // Base width is 45px, grows up to 130px.
    const widthPx = Math.min(130, 45 + absScore * 12);
    
    return (
      <div className="alligator-arms-wrapper">
        <svg 
          className="alligator-arm left-arm positive-arm" 
          viewBox="0 0 50 30" 
          style={{ 
            width: `${widthPx}px`,
            height: `${widthPx * 0.6}px`
          }}
        >
          <path d="M50,12 C40,10 20,10 15,13 C10,16 8,15 5,15 C3,15 2,13 1,14 C0,15 0,17 1,18 C2,19 4,17 6,18 C5,19 3,21 3,22 C3,23 5,24 6,23 C8,22 8,20 10,19 C12,19 14,18 16,17 C22,15 40,15 50,18 Z" fill="#fbbf24" />
          <path d="M45,13 C38,12 25,12 18,14" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.65" fill="none" />
        </svg>
        <svg 
          className="alligator-arm right-arm positive-arm" 
          viewBox="0 0 50 30" 
          style={{ 
            width: `${widthPx}px`,
            height: `${widthPx * 0.6}px`
          }}
        >
          <path d="M0,12 C10,10 30,10 35,13 C40,16 42,15 45,15 C47,15 48,13 49,14 C50,15 50,17 49,18 C48,19 46,17 44,18 C45,19 47,21 47,22 C47,23 45,24 44,23 C42,22 42,20 40,19 C38,19 36,18 34,17 C28,15 10,15 0,18 Z" fill="#fbbf24" />
          <path d="M5,13 C12,12 25,12 32,14" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.65" fill="none" />
        </svg>
      </div>
    );
  }
};

export default function Dashboard({ people, currentUser, onRefreshData }) {
  const [payerId, setPayerId] = useState('');
  const [selectedAttendees, setSelectedAttendees] = useState([]);
  const [restaurant, setRestaurant] = useState('');
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [gpsStatus, setGpsStatus] = useState('idle'); // idle, locating, success, error
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' });
  const [celebrationPayer, setCelebrationPayer] = useState(null);
  const [celebrationActive, setCelebrationActive] = useState(false);

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

    // Find the lowest active person before submit
    const lowestActiveBefore = activePeople.length > 0
      ? [...activePeople].sort((a, b) => a.score - b.score)[0]
      : null;
    const isLowestPayerPaying = lowestActiveBefore && payerId === lowestActiveBefore.id;

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

      if (isLowestPayerPaying) {
        setCelebrationPayer(lowestActiveBefore.name);
        setCelebrationActive(true);
        setTimeout(() => {
          setCelebrationActive(false);
          setCelebrationPayer(null);
        }, 8000);
      }
      
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
      
      {/* Celebration Banner */}
      {celebrationActive && (
        <div className="celebration-banner">
          🎉 CONGRATULATIONS TO {celebrationPayer.toUpperCase()}! 🎉
          <div className="celebration-subtitle">They finally reached their wallet and paid the bill! 🦖💸</div>
        </div>
      )}
      
      {/* Top Leaderboard */}
      <div>
        <h2 className="leaderboard-title">🦖 The Alligator Arms Diner Table 🍽️</h2>
        <div className="leaderboard-scroll">
          {celebrationActive && (
            <div className="confetti-container">
              {Array.from({ length: 25 }).map((_, i) => (
                <span 
                  key={i} 
                  className="confetti-piece" 
                  style={{ 
                    left: `${(i * 4) + (Math.random() * 2)}%`, 
                    animationDelay: `${Math.random() * 2}s`,
                    fontSize: `${1.0 + Math.random() * 1.5}rem` 
                  }}
                >
                  {['🎉', '🍕', '🍔', '🦖', '💸', '💪', '👑', '🥳'][i % 8]}
                </span>
              ))}
            </div>
          )}
          {sortedLeaderboard.map((person, idx) => {
            const isLowestActive = person.isActive && 
              person.id === sortedLeaderboard.filter(p => p.isActive)[0]?.id;
            const isMostNegative = isLowestActive && person.score < 0;
            
            return (
              <div 
                key={person.id} 
                className={`leaderboard-card ${isLowestActive ? 'payer-target' : ''} ${isMostNegative ? 'most-negative' : ''} ${!person.isActive ? 'inactive' : ''} ${celebrationActive ? 'celebrating-card' : ''}`}
                style={{ 
                  opacity: person.isActive ? 1 : 0.4,
                  '--idx': idx
                }}
              >
                {/* Comic Speech Bubble */}
                {person.isActive && (
                  <div className="speech-bubble">
                    {celebrationActive ? (
                      person.name === celebrationPayer ? (
                        "I did it! My arms grew! 🦖💪"
                      ) : (
                        [
                          `Praise be! ${celebrationPayer} reached! 🙌`,
                          `Historic reach by ${celebrationPayer}! 🦖`,
                          `Woohoo! Proud of you, ${celebrationPayer}! 👏`,
                          `Is this a dream? ${celebrationPayer} paid! 🤯`,
                          `Amazing! A miracle just happened! 🍕`,
                          `Golden Arm status unlocked! 👑`,
                          `I can't believe my eyes! 🌟`,
                          `No alligator arms today! 💸`
                        ][idx % 8]
                      )
                    ) : person.score < 0 ? (
                      isLowestActive ? "🦖 Rob Arms Alert! Just out of reach!" : "🦖 Uh oh... my arms can't reach!"
                    ) : person.score > 0 ? (
                      "💪 Golden Arm to the rescue!"
                    ) : (
                      "🧍 Perfectly balanced diner!"
                    )}
                  </div>
                )}

                <div className={`avatar ${isMostNegative ? 'alligator-avatar' : ''}`}>
                  {isMostNegative ? (
                    <svg viewBox="0 0 100 100" className="cartoon-alligator-svg">
                      {/* Green Head & Snout */}
                      <ellipse cx="50" cy="32" rx="22" ry="18" fill="#10b981" stroke="#111" strokeWidth="3" />
                      <ellipse cx="50" cy="42" rx="26" ry="12" fill="#10b981" stroke="#111" strokeWidth="3" />
                      
                      {/* Nostrils */}
                      <circle cx="44" cy="45" r="2" fill="#111" />
                      <circle cx="56" cy="45" r="2" fill="#111" />
                      
                      {/* Cute Eyes popping up */}
                      <circle cx="36" cy="18" r="8" fill="#fff" stroke="#111" strokeWidth="3" />
                      <circle cx="36" cy="18" r="3.5" fill="#111" />
                      
                      <circle cx="64" cy="18" r="8" fill="#fff" stroke="#111" strokeWidth="3" />
                      <circle cx="64" cy="18" r="3.5" fill="#111" />
                      
                      {/* Smile */}
                      <path d="M40,36 Q50,42 60,36" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
                      
                      {/* Trapezoid Green Body (Chest) */}
                      <path d="M30,48 L70,48 L78,96 L22,96 Z" fill="#10b981" stroke="#111" strokeWidth="3" />
                      
                      {/* Cream Chest/Belly Patch */}
                      <ellipse cx="50" cy="72" rx="20" ry="20" fill="#fef08a" stroke="#111" strokeWidth="2" />
                      
                      {/* Letter on chest */}
                      <text 
                        x="50" 
                        y="79" 
                        textAnchor="middle" 
                        fontSize="22" 
                        fontWeight="900" 
                        fill="#111" 
                        fontFamily="var(--font-display)"
                      >
                        {getInitials(person.name)}
                      </text>
                    </svg>
                  ) : (
                    getInitials(person.name)
                  )}
                  {person.isActive && renderAlligatorArms(person.score)}
                  
                  {/* Dynamic food emoji piles for plates based on balance */}
                  {!isMostNegative && person.isActive && person.score < 0 && (
                    <span className="food-pile" title="Stuffed with free food!">🍔</span>
                  )}
                  {!isMostNegative && person.isActive && person.score <= -3.0 && (
                    <span className="food-pile-2" title="Double free loader!">🍕</span>
                  )}
                  {person.isActive && person.score > 0 && (
                    <span className="food-pile" style={{ background: 'var(--accent-cyan)' }} title="Chef / Sponsor">🧑‍🍳</span>
                  )}
                </div>
                
                <div className="user-name">{person.name}</div>
                <div className="user-score">
                  <span className={`score-badge ${
                    person.score > 0 ? 'score-positive' : person.score < 0 ? 'score-negative' : 'score-zero'
                  }`}>
                    {person.score > 0 ? `+${person.score.toFixed(2)}` : person.score.toFixed(2)}
                  </span>
                </div>
                
                {person.isActive && person.score < 0 && (
                  <span className="arm-status-text negative">
                    🦖 Reach: {Math.max(10, Math.round(70 - (Math.abs(person.score) * 10)))}%
                  </span>
                )}
                {person.isActive && person.score > 0 && (
                  <span className="arm-status-text positive">
                    💪 Reach: {Math.min(200, Math.round(100 + (person.score * 15)))}%
                  </span>
                )}
                {person.isActive && person.score === 0 && (
                  <span className="arm-status-text zero">
                    🧍 Reach: 100%
                  </span>
                )}
                {!person.isActive && (
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px', textTransform: 'uppercase' }}>Left Diner</span>
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
          <h3 className="console-title">👑 Who is Sponsoring? 💸</h3>
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
                  <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '0.75rem', margin: 0, border: '2px solid var(--border-card)' }}>
                    {getInitials(person.name)}
                  </div>
                  <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>{person.name}</span>
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
          <h3 className="console-title">👥 Hungry Eaters Present 🤤</h3>
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

        {/* Column 3 - Details & Verification styled as a thermal receipt */}
        <div className="glass-card receipt-box" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 className="console-title receipt-title">Official Check Bill</h3>
          
          <div className="meta-panel">
            {/* Location Name */}
            <div className="form-group">
              <label className="form-label" style={{ color: '#1a1a1a' }}>Diner Table Location 📍</label>
              <div className="form-input-wrapper">
                <input
                  type="text"
                  className="form-input"
                  style={{ background: '#fdfdfd', border: '3px solid #1a1a1a', color: '#1a1a1a' }}
                  placeholder="Acquiring table address..."
                  value={restaurant}
                  onChange={(e) => setRestaurant(e.target.value)}
                />
                <button
                  type="button"
                  className="gps-refresh-btn"
                  onClick={detectLocation}
                  title="Ping diner GPS"
                >
                  🛰️
                </button>
              </div>
            </div>

            {/* Location Status Badge */}
            <div className="location-indicator" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#555555' }}>
              {gpsStatus === 'locating' && <span style={{ color: 'var(--accent-amber)' }}>Acquiring table GPS...</span>}
              {gpsStatus === 'success' && (
                <span style={{ color: 'var(--accent-emerald)' }}>
                  COORD LOCKED: {location.lat?.toFixed(4)}, {location.lng?.toFixed(4)}
                </span>
              )}
              {gpsStatus === 'error' && (
                <span>GPS offline (Manual overwrite)</span>
              )}
              {gpsStatus === 'idle' && <span>Position unlocked</span>}
            </div>

            <div style={{ fontSize: '0.75rem', color: '#555555', fontFamily: 'var(--font-mono)' }}>
              Waiter Check-in: <strong style={{ color: '#1a1a1a' }}>{currentUser?.name || 'Manager'}</strong>
            </div>
          </div>

          {/* Score Live Preview styled like receipt items */}
          {payerId && selectedAttendees.length > 0 && (
            <div className="receipt-grid">
              <div className="receipt-pill payer">
                <span>👑 Sponsor: {people.find(p => p.id === payerId)?.name}</span>
                <span>+{selectedAttendees.length.toFixed(2)}</span>
              </div>
              <div className="receipt-divider"></div>
              {selectedAttendees.map(id => (
                <div key={id} className="receipt-pill attendee">
                  <span>🍽️ Eater: {people.find(p => p.id === id)?.name}</span>
                  <span>-1.00</span>
                </div>
              ))}
              <div className="receipt-divider"></div>
              <div className="receipt-pill" style={{ fontWeight: '900', color: '#1a1a1a', fontSize: '0.9rem' }}>
                <span>ZERO-SUM BALANCED</span>
                <span>0.00</span>
              </div>
            </div>
          )}

          {/* Barcode representation */}
          <div className="receipt-barcode">
            <div className="barcode-stripes"></div>
            <span className="barcode-number">ROB-ALLIGATOR-ARMS-GEICO</span>
          </div>

          {/* Response Alerts */}
          {submitMessage.text && (
            <div style={{
              padding: '0.6rem 0.85rem',
              fontSize: '0.8rem',
              fontWeight: '700',
              borderRadius: '12px',
              background: submitMessage.type === 'success' ? 'var(--accent-emerald)' : 'var(--accent-rose)',
              color: '#ffffff',
              border: '3px solid #1a1a1a',
              boxShadow: '3px 3px 0px #1a1a1a',
              textAlign: 'center'
            }}>
              {submitMessage.text}
            </div>
          )}

          {/* Submit button */}
          <div style={{ marginTop: 'auto', paddingBottom: '0.5rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem', border: '3px solid #1a1a1a', color: '#ffffff', background: 'var(--accent-indigo)' }}
              disabled={isSubmitting || !payerId || selectedAttendees.length === 0}
            >
              {isSubmitting ? '🍕 Transmitting check...' : '🚨 RECORD RECEIPT & PAY 🚨'}
            </button>
          </div>

          {/* Jagged Bottom Decoration */}
          <div className="receipt-jagged-edge"></div>
        </div>

      </form>

    </div>
  );
}
