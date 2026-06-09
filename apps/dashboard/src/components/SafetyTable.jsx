import { useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';

const formatTime = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
  const timeStr = date.toLocaleTimeString([], timeOptions);

  if (isToday) {
    return `Today ${timeStr}`;
  } else {
    const monthOptions = { month: 'short', day: 'numeric' };
    const datePart = date.toLocaleDateString([], monthOptions);
    return `${datePart}, ${timeStr}`;
  }
};

const formatLocation = (lat, lng) => {
  if (lat == null || lng == null) return 'N/A';
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`;
};

const getTypeStyles = (type) => {
  switch (type) {
    case 'SOS':
      return { backgroundColor: '#CC0000', color: '#FFFFFF' };
    case 'Harassment':
      return { backgroundColor: '#E8621A', color: '#FFFFFF' };
    case 'Medical':
      return { backgroundColor: '#F5A623', color: '#FFFFFF' };
    case 'Theft':
      return { backgroundColor: '#1A3557', color: '#FFFFFF' };
    default:
      return { backgroundColor: '#888888', color: '#FFFFFF' };
  }
};

export default function SafetyTable({ incidents = [], onResolve, resolvingId }) {
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortedIncidents = () => {
    const sorted = [...incidents];
    sorted.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle nulls
      if (aVal == null) return sortDirection === 'asc' ? -1 : 1;
      if (bVal == null) return sortDirection === 'asc' ? 1 : -1;

      // Handle custom fields
      if (sortField === 'created_at') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown size={13} style={{ marginLeft: '6px', opacity: 0.4 }} />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp size={13} style={{ marginLeft: '6px', color: 'var(--color-orange)' }} />
      : <ArrowDown size={13} style={{ marginLeft: '6px', color: 'var(--color-orange)' }} />;
  };

  const sortedIncidents = getSortedIncidents();

  return (
    <div style={styles.tableContainer}>
      <table style={styles.table}>
        <thead>
          <tr style={styles.headerRow}>
            <th style={styles.th} onClick={() => handleSort('created_at')}>
              <div style={styles.thContent}>Time {renderSortIcon('created_at')}</div>
            </th>
            <th style={styles.th} onClick={() => handleSort('train_number')}>
              <div style={styles.thContent}>Train {renderSortIcon('train_number')}</div>
            </th>
            <th style={styles.th}>Coach</th>
            <th style={styles.th} onClick={() => handleSort('event_type')}>
              <div style={styles.thContent}>Incident Type {renderSortIcon('event_type')}</div>
            </th>
            <th style={styles.th}>Location</th>
            <th style={styles.th} onClick={() => handleSort('status')}>
              <div style={styles.thContent}>Status {renderSortIcon('status')}</div>
            </th>
            <th style={styles.th}>Action</th>
          </tr>
        </thead>
        <tbody>
          {sortedIncidents.map((incident) => {
            const isUnresolved = incident.status === 'ACTIVE';
            const isResolving = resolvingId === incident.id;
            const rowStyle = {
              ...styles.row,
              backgroundColor: isUnresolved ? '#FFF5F5' : '#FFFFFF',
            };

            return (
              <tr key={incident.id} style={rowStyle}>
                <td style={styles.td}>{formatTime(incident.created_at)}</td>
                <td style={styles.td}><strong>{incident.train_number}</strong></td>
                <td style={styles.td}>{incident.coach || 'N/A'}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, ...getTypeStyles(incident.event_type) }}>
                    {incident.event_type}
                  </span>
                </td>
                <td style={styles.td}>{formatLocation(incident.lat, incident.lng)}</td>
                <td style={styles.td}>
                  {incident.status === 'RESOLVED' ? (
                    <span style={{ ...styles.badge, ...styles.badgeResolved }}>Resolved</span>
                  ) : (
                    <span style={{ ...styles.badge, ...styles.badgeUnresolved }}>Active</span>
                  )}
                </td>
                <td style={styles.td}>
                  {isUnresolved && (
                    <button
                      type="button"
                      disabled={isResolving}
                      style={styles.resolveBtn}
                      onClick={() => onResolve(incident.id)}
                    >
                      {isResolving ? (
                        <>
                          <Loader2 size={12} style={styles.spinner} />
                          Resolving...
                        </>
                      ) : (
                        'Resolve'
                      )}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  tableContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #F0F0F0',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    overflowX: 'auto',
    width: '100%'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '14px',
    color: '#111111'
  },
  headerRow: {
    borderBottom: '2px solid #E0E0E0',
    backgroundColor: '#F9F9F9'
  },
  th: {
    padding: '16px 20px',
    fontWeight: '600',
    color: '#555555',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background-color 150ms ease',
    ':hover': {
      backgroundColor: '#F1F1F1'
    }
  },
  thContent: {
    display: 'flex',
    alignItems: 'center'
  },
  row: {
    borderBottom: '1px solid #F0F0F0',
    transition: 'background-color 100ms ease'
  },
  td: {
    padding: '14px 20px',
    verticalAlign: 'middle'
  },
  badge: {
    display: 'inline-block',
    fontSize: '11px',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: '12px',
    textAlign: 'center',
    textTransform: 'uppercase'
  },
  badgeResolved: {
    backgroundColor: '#E8F5E9',
    color: '#27AE60'
  },
  badgeUnresolved: {
    backgroundColor: '#FFEBEE',
    color: '#CC0000'
  },
  resolveBtn: {
    backgroundColor: '#E8621A',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 150ms ease',
    outline: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    ':hover': {
      backgroundColor: '#C9551A'
    }
  },
  spinner: {
    animation: 'spin 1s linear infinite'
  }
};
