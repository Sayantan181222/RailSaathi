import { useState, useEffect, useCallback } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { X, AlertTriangle } from 'lucide-react';
import supabase from '../services/supabase-client';
import FilterBar from '../components/FilterBar';
import ComplaintMap from '../components/ComplaintMap';

const STATION_MAP = {
  NDLS: { name: 'New Delhi', lat: 28.6415, lng: 77.2193 },
  MMCT: { name: 'Mumbai Central', lat: 18.9696, lng: 72.8193 },
  HWH: { name: 'Howrah', lat: 22.5834, lng: 88.3385 },
  SBC: { name: 'KSR Bengaluru', lat: 12.9784, lng: 77.5694 },
  MAS: { name: 'Chennai Central', lat: 13.0827, lng: 80.2707 },
  PUNE: { name: 'Pune Jn', lat: 18.5289, lng: 73.8744 },
  AMD: { name: 'Ahmedabad', lat: 23.0276, lng: 72.5996 },
  BPL: { name: 'Bhopal', lat: 23.2599, lng: 77.4126 },
  LKO: { name: 'Lucknow', lat: 26.8322, lng: 80.9220 },
  JP: { name: 'Jaipur', lat: 26.9196, lng: 75.7878 },
  VSKP: { name: 'Visakhapatnam', lat: 17.7262, lng: 83.2986 },
  BZA: { name: 'Vijayawada', lat: 16.5183, lng: 80.6202 },
  SC: { name: 'Secunderabad', lat: 17.4344, lng: 78.5011 },
  ADI: { name: 'Ahmedabad Jn', lat: 23.0289, lng: 72.6011 },
  GKP: { name: 'Gorakhpur', lat: 26.7606, lng: 83.3731 },
  PNBE: { name: 'Patna Jn', lat: 25.6022, lng: 85.1376 },
  DBRG: { name: 'Dibrugarh', lat: 27.4728, lng: 94.9120 },
  UBL: { name: 'Hubballi', lat: 15.3444, lng: 75.1478 },
  MYS: { name: 'Mysuru', lat: 12.3164, lng: 76.6465 },
  CBE: { name: 'Coimbatore', lat: 11.0003, lng: 76.9672 }
};

export default function ComplaintMapPage() {
  const [filters, setFilters] = useState({ type: 'All', range: 'Last 30 days' });
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState(null);
  const [error, setError] = useState(false);

  const isMock = supabase.supabaseUrl.includes('mockproject.supabase.co');

  const generateMockComplaints = () => {
    const categories = ['Cleanliness', 'Staff Behaviour', 'Food Quality', 'Safety', 'Technical Issue', 'Catering', 'AC Failure', 'Delay'];
    const stationList = ['NDLS', 'MMCT', 'HWH', 'SBC', 'MAS', 'PUNE', 'AMD', 'BPL', 'LKO', 'JP', 'VSKP', 'BZA', 'SC', 'ADI', 'GKP', 'PNBE', 'DBRG', 'UBL', 'MYS', 'CBE'];
    const mockData = [];
    for (let i = 0; i < 300; i++) {
      const station = stationList[i % stationList.length];
      const complaint_type = categories[(i * 3) % categories.length];
      const date = new Date();
      date.setDate(date.getDate() - (i % 90));
      mockData.push({
        id: `mock-complaint-${i}`,
        station,
        complaint_type,
        description: `Mock complaint #${i + 1} regarding ${complaint_type.toLowerCase()} at ${station} station.`,
        created_at: date.toISOString(),
        status: i % 3 === 0 ? 'Resolved' : i % 3 === 1 ? 'In Progress' : 'Pending',
        train_number: 12000 + (i % 20),
      });
    }
    return mockData;
  };

  const getDateLimit = (range) => {
    const limit = new Date();
    if (range === 'Last 7 days') {
      limit.setDate(limit.getDate() - 7);
    } else if (range === 'Last 90 days') {
      limit.setDate(limit.getDate() - 90);
    } else {
      limit.setDate(limit.getDate() - 30);
    }
    return limit.toISOString();
  };

  const fetchAndProcessComplaints = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      let data;
      if (isMock) {
        const limitDate = new Date(getDateLimit(filters.range));
        data = generateMockComplaints().filter((c) => {
          const matchDate = new Date(c.created_at) >= limitDate;
          const matchType = filters.type === 'All' || c.complaint_type === filters.type;
          return matchDate && matchType;
        });
      } else {
        let query = supabase
          .from('complaints')
          .select('*')
          .gte('created_at', getDateLimit(filters.range));

        if (filters.type !== 'All') {
          query = query.eq('complaint_type', filters.type);
        }

        const { data: dbData, error } = await query;
        if (error) throw error;
        data = dbData;
      }

      // Group by station in memory
      const grouped = {};
      (data || []).forEach((c) => {
        const stationCode = c.station_code || c.station || 'UNKNOWN';
        if (!grouped[stationCode]) {
          const info = STATION_MAP[stationCode] || {
            name: c.station_name || stationCode,
            lat: c.station_lat || c.lat || 20.5937,
            lng: c.station_lng || c.lng || 78.9629
          };
          grouped[stationCode] = {
            code: stationCode,
            name: info.name,
            lat: info.lat,
            lng: info.lng,
            count: 0,
            breakdown: {},
            list: []
          };
        }

        const st = grouped[stationCode];
        st.count += 1;
        st.breakdown[c.complaint_type] = (st.breakdown[c.complaint_type] || 0) + 1;
        st.list.push(c);
      });

      // Format station stats
      const stationsArray = Object.values(grouped).map((st) => {
        st.list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const sortedBreakdown = Object.entries(st.breakdown).sort((a, b) => b[1] - a[1]);
        st.top3Breakdown = sortedBreakdown.slice(0, 3);
        st.topType = sortedBreakdown.length > 0 ? sortedBreakdown[0][0] : 'Other';
        return st;
      });

      setStations(stationsArray);

      // Keep sidebar updated if a station was previously selected
      if (selectedStation) {
        const updatedSelected = stationsArray.find((s) => s.code === selectedStation.code);
        setSelectedStation(updatedSelected || null);
      }
    } catch (err) {
      console.error('Error fetching complaints map data:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [filters, isMock, selectedStation]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAndProcessComplaints();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchAndProcessComplaints]);

  const handleSelectStation = (station) => {
    setSelectedStation(station);
  };

  const getChartData = (breakdown) => {
    return Object.entries(breakdown)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  return (
    <div style={styles.container}>
      <div>
        <h1 style={styles.heading}>Complaint Map</h1>
        <p style={styles.subheading}>Complaint density by station — last 30 days</p>
      </div>

      <FilterBar
        initialType={filters.type}
        initialRange={filters.range}
        onApply={(newFilters) => {
          setFilters(newFilters);
          setSelectedStation(null);
        }}
      />

      {error ? (
        <div style={styles.errorCard}>
          <span style={styles.errorText}>Something went wrong. Please refresh the page.</span>
          <button style={styles.retryBtn} onClick={fetchAndProcessComplaints}>
            Retry
          </button>
        </div>
      ) : loading ? (
        <div style={styles.loadingWrapper}>
          <div style={styles.spinner}></div>
          <span style={styles.loadingText}>Fetching database records...</span>
        </div>
      ) : stations.length === 0 ? (
        <div style={styles.emptyWrapper}>
          <AlertTriangle size={48} color="#CCCCCC" style={{ marginBottom: '12px' }} />
          <p style={styles.emptyText}>No complaints found for the selected filters.</p>
        </div>
      ) : (
        <div style={styles.contentGrid}>
          <ComplaintMap stations={stations} onSelectStation={handleSelectStation} />

          {selectedStation && (
            <div style={styles.sidebar}>
              <div style={styles.sidebarHeader}>
                <h2 style={styles.sidebarTitle}>{selectedStation.name}</h2>
                <button
                  type="button"
                  style={styles.closeBtn}
                  onClick={() => setSelectedStation(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={styles.statBox}>
                <span style={styles.statLabel}>Total Complaints</span>
                <span style={styles.statVal}>{selectedStation.count}</span>
              </div>

              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Breakdown by Type</h3>
                <div style={{ height: '140px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={getChartData(selectedStation.breakdown)}
                      layout="vertical"
                      margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={100}
                        axisLine={false}
                        tickLine={false}
                        style={{ fontSize: '11px', fill: '#555555', fontWeight: '500' }}
                      />
                      <Bar dataKey="value" fill="#E8621A" radius={[0, 4, 4, 0]} barSize={10} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Recent Complaints</h3>
                <div style={styles.recentList}>
                  {selectedStation.list.slice(0, 5).map((comp) => (
                    <div key={comp.id} style={styles.recentItem}>
                      <div style={styles.recentMeta}>
                        <span style={styles.typeBadge}>{comp.complaint_type}</span>
                        <span style={styles.timeLabel}>
                          {new Date(comp.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={styles.recentDesc}>
                        {comp.description.length > 70
                          ? `${comp.description.slice(0, 70)}...`
                          : comp.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  heading: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#111111',
    marginBottom: '4px'
  },
  subheading: {
    fontSize: '14px',
    color: '#555555'
  },
  loadingWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '400px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #F0F0F0',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #F3F3F3',
    borderTop: '4px solid #E8621A',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px'
  },
  loadingText: {
    color: '#555555',
    fontSize: '14px'
  },
  emptyWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '400px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #F0F0F0',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
  },
  emptyText: {
    color: '#555555',
    fontSize: '15px',
    fontWeight: '500'
  },
  contentGrid: {
    display: 'flex',
    gap: '24px',
    alignItems: 'stretch',
    flexWrap: 'wrap'
  },
  sidebar: {
    width: '320px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    border: '1px solid #F0F0F0',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    maxHeight: '500px',
    overflowY: 'auto'
  },
  sidebarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  sidebarTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1A3557',
    margin: 0,
    lineHeight: '1.2'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#AAAAAA',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  statBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: '8px',
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#555555'
  },
  statVal: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#E8621A'
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#111111',
    margin: 0,
    borderBottom: '1px solid #E0E0E0',
    paddingBottom: '6px'
  },
  recentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  recentItem: {
    borderBottom: '1px solid #F5F5F5',
    paddingBottom: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  recentMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  typeBadge: {
    fontSize: '10px',
    fontWeight: '600',
    backgroundColor: '#FFF3EC',
    color: '#E8621A',
    padding: '2px 8px',
    borderRadius: '10px'
  },
  timeLabel: {
    fontSize: '10px',
    color: '#AAAAAA'
  },
  recentDesc: {
    fontSize: '12px',
    color: '#555555',
    margin: 0,
    lineHeight: '1.4'
  },
  errorCard: {
    border: '1px solid var(--color-orange)',
    backgroundColor: '#FFF5F0',
    borderRadius: '8px',
    padding: '24px',
    margin: '24px 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    width: '100%',
  },
  errorText: {
    color: 'var(--color-orange)',
    fontWeight: '600',
    fontSize: '15px',
  },
  retryBtn: {
    backgroundColor: 'var(--color-orange)',
    color: 'var(--color-white)',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'background-color 150ms ease',
    outline: 'none',
  },
};
