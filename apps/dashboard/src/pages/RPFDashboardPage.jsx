import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- Design System Tokens ---
const COLORS = {
  brandOrange: '#E8621A',
  navy: '#1A3557',
  sosRed: '#CC0000',
  background: '#F5F5F5',
  cardBg: '#FFFFFF',
  textBody: '#555555',
  textHeading: '#111111',
};

const BADGES = {
  CRITICAL: { bg: '#FFEBEE', text: '#CC0000', border: '#CC0000' },
  HIGH: { bg: '#FFF3EC', text: '#E8621A', border: '#E8621A' },
  MEDIUM: { bg: '#FFF8E1', text: '#FF8F00', border: '#FFC107' },
};

// --- Styles ---
const styles = {
  container: {
    fontFamily: '"Inter", sans-serif',
    backgroundColor: COLORS.background,
    minHeight: '100vh',
    color: COLORS.textBody,
    fontSize: '14px',
    paddingBottom: '40px'
  },
  headerBar: {
    backgroundColor: COLORS.navy,
    color: '#FFF',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
  },
  headerTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 'bold'
  },
  livePill: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
    padding: '4px 12px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  statsBar: {
    display: 'flex',
    gap: '16px',
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  statCard: {
    backgroundColor: COLORS.cardBg,
    padding: '16px',
    borderRadius: '8px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    flex: 1,
    textAlign: 'center'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: COLORS.textHeading,
    marginTop: '8px'
  },
  feedContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '32px'
  },
  sectionTitle: {
    color: COLORS.textHeading,
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '16px',
    borderBottom: `2px solid #EEE`,
    paddingBottom: '8px'
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: '8px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    padding: '20px',
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    transition: 'opacity 0.5s ease-out'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #EEE',
    paddingBottom: '12px'
  },
  cardTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  badge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  timestamp: {
    color: '#888',
    fontSize: '12px'
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
    backgroundColor: '#FAFAFA',
    padding: '12px',
    borderRadius: '4px'
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column'
  },
  detailLabel: {
    fontSize: '11px',
    color: '#888',
    textTransform: 'uppercase'
  },
  detailValue: {
    fontWeight: 'bold',
    color: COLORS.textHeading
  },
  mapLink: {
    color: COLORS.brandOrange,
    textDecoration: 'none',
    fontWeight: 'bold',
    display: 'inline-block',
    marginTop: '8px'
  },
  actionsRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px'
  },
  btn: {
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '13px'
  },
  btnAcknowledge: { backgroundColor: '#E3F2FD', color: '#1565C0' },
  btnResolve: { backgroundColor: '#E8F5E9', color: '#2E7D32' },
  btnFalseAlarm: { backgroundColor: '#FFF3E0', color: '#E65100' },
  stateContainer: {
    textAlign: 'center',
    padding: '60px 20px'
  },
  spinner: {
    border: `4px solid #FFF3EC`,
    borderTop: `4px solid ${COLORS.brandOrange}`,
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 16px'
  }
};

export default function RPFDashboardPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Audio Alert ---
  const playAlertSound = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      
      gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (err) {
      console.warn("Audio alert failed", err);
    }
  }, []);

  // --- Fetch Data ---
  const fetchLiveEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
      const res = await fetch(`${API_BASE}/safety/rpf/live`);
      if (!res.ok) throw new Error('Failed to fetch events');
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); }
      catch { throw new Error('API waking up. Please click Retry in ~30 seconds.'); }
      setEvents(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveEvents();

    // --- Realtime Sub ---
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const channel = supabase.channel('rpf_live_feed')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'safety_events' }, payload => {
          setEvents(prev => [payload.new, ...prev]);
          playAlertSound();
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [playAlertSound]);

  // --- Actions ---
  const handleAction = async (id, newStatus) => {
    try {
      // Optimistic UI update
      setEvents(prev => prev.map(ev => 
        ev.id === id ? { ...ev, status: newStatus } : ev
      ));

      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
      const res = await fetch(`${API_BASE}/safety/events/${id}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        // Auth token would be added here in real app, assuming cookies or intercepted fetch
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) throw new Error('Action failed');
    } catch (err) {
      console.error(err);
      // Revert on error could be implemented here
      fetchLiveEvents();
    }
  };

  // --- Derived State ---
  const activeEvents = events.filter(e => e.status === 'ACTIVE' || e.status === 'ACKNOWLEDGED');
  const resolvedEvents = events.filter(e => e.status === 'RESOLVED' || e.status === 'FALSE_ALARM');

  const stats = useMemo(() => ({
    active: activeEvents.length,
    sos: activeEvents.filter(e => e.event_type === 'SOS').length,
    compartment: activeEvents.filter(e => e.event_type === 'COMPARTMENT_VIOLATION').length,
    todayTotal: events.filter(e => new Date(e.created_at).toDateString() === new Date().toDateString()).length
  }), [activeEvents, events]);

  // --- Render Helpers ---
  const formatTime = (isoStr) => {
    if (!isoStr) return '';
    return new Date(isoStr).toLocaleTimeString('en-US', { hour12: false });
  };

  const renderCard = (ev, isResolved = false) => {
    const pBadge = BADGES[ev.priority] || BADGES.MEDIUM;
    const borderLeft = `4px solid ${pBadge.border}`;

    return (
      <div key={ev.id} style={{ ...styles.card, borderLeft, opacity: isResolved ? 0.6 : 1 }}>
        <div style={styles.cardHeader}>
          <div style={styles.cardTitleRow}>
            <span style={{ ...styles.badge, backgroundColor: pBadge.bg, color: pBadge.text }}>
              {ev.priority}
            </span>
            <span style={{ fontWeight: 'bold', color: COLORS.textHeading }}>
              {ev.event_type.replace('_', ' ')}
            </span>
            {ev.alert_subtype && (
              <span style={{ fontSize: '12px', color: COLORS.textBody }}>
                ({ev.alert_subtype.replace('_', ' ')})
              </span>
            )}
          </div>
          <div style={styles.timestamp}>
            {formatTime(ev.created_at)}
            {ev.status !== 'ACTIVE' && ` • ${ev.status}`}
          </div>
        </div>

        <div style={styles.detailsGrid}>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Train / Station</span>
            <span style={styles.detailValue}>{ev.train_number || ev.station_code || 'N/A'}</span>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Coach / Berth</span>
            <span style={styles.detailValue}>
              {ev.coach ? `${ev.coach} - ${ev.berth || 'N/A'}` : 'N/A'}
            </span>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Passenger Initials</span>
            <span style={styles.detailValue}>{ev.masked_initials || 'Unknown'}</span>
          </div>
        </div>

        {ev.description && (
          <div style={{ fontStyle: 'italic', fontSize: '13px', marginTop: '4px' }}>
            "{ev.description}"
          </div>
        )}

        {(ev.lat && ev.lng) && (
          <a 
            href={`https://maps.google.com/?q=${ev.lat},${ev.lng}`} 
            target="_blank" 
            rel="noopener noreferrer"
            style={styles.mapLink}
          >
            📍 View Location on Maps
          </a>
        )}

        {!isResolved && (
          <div style={styles.actionsRow}>
            {ev.status !== 'ACKNOWLEDGED' && (
              <button 
                style={{ ...styles.btn, ...styles.btnAcknowledge }}
                onClick={() => handleAction(ev.id, 'ACKNOWLEDGED')}
              >
                Acknowledge
              </button>
            )}
            <button 
              style={{ ...styles.btn, ...styles.btnResolve }}
              onClick={() => handleAction(ev.id, 'RESOLVED')}
            >
              Resolve
            </button>
            <button 
              style={{ ...styles.btn, ...styles.btnFalseAlarm }}
              onClick={() => handleAction(ev.id, 'FALSE_ALARM')}
            >
              False Alarm
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <style>
        {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
      </style>
      
      <header style={styles.headerBar}>
        <h1 style={styles.headerTitle}>🚨 RailSaathi RPF Alert Dashboard</h1>
        <div style={styles.livePill}>
          <span style={{ color: '#CC0000' }}>●</span> LIVE
        </div>
      </header>

      {loading && events.length === 0 ? (
        <div style={styles.stateContainer}>
          <div style={styles.spinner} />
          <div>Loading alerts...</div>
        </div>
      ) : error ? (
        <div style={styles.stateContainer}>
          <div style={{ color: COLORS.brandOrange, fontWeight: 'bold', marginBottom: '16px' }}>{error}</div>
          <button style={{ ...styles.btn, backgroundColor: COLORS.brandOrange, color: '#FFF' }} onClick={fetchLiveEvents}>
            Retry
          </button>
        </div>
      ) : (
        <>
          <div style={styles.statsBar}>
            <div style={styles.statCard}>
              <div style={styles.detailLabel}>Active Alerts</div>
              <div style={{ ...styles.statValue, color: COLORS.brandOrange }}>{stats.active}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.detailLabel}>SOS Alerts</div>
              <div style={{ ...styles.statValue, color: COLORS.sosRed }}>{stats.sos}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.detailLabel}>Compartment Issues</div>
              <div style={styles.statValue}>{stats.compartment}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.detailLabel}>Today's Total</div>
              <div style={styles.statValue}>{stats.todayTotal}</div>
            </div>
          </div>

          <div style={styles.feedContainer}>
            <section>
              <h2 style={styles.sectionTitle}>Active & Acknowledged Alerts</h2>
              {activeEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#888', backgroundColor: COLORS.cardBg, borderRadius: '8px' }}>
                  No active alerts currently.
                </div>
              ) : (
                activeEvents.map(ev => renderCard(ev, false))
              )}
            </section>

            {resolvedEvents.length > 0 && (
              <section>
                <h2 style={styles.sectionTitle}>Recently Resolved</h2>
                {resolvedEvents.slice(0, 10).map(ev => renderCard(ev, true))}
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
}
