import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Vite missing Leaflet icons issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const getMarkerColor = (type) => {
  switch (type) {
    case 'Cleanliness':
      return '#F5A623'; // Amber
    case 'Safety':
      return '#CC0000'; // Red
    case 'Staff Behaviour':
      return '#1A3557'; // Navy
    default:
      return '#E8621A'; // Orange
  }
};

export default function ComplaintMap({ stations = [], onSelectStation }) {
  const center = [20.5937, 78.9629]; // India centroid
  const zoom = 5;

  return (
    <div style={styles.mapWrapper}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={styles.mapContainer}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {stations.map((st) => {
          const markerColor = getMarkerColor(st.topType);
          return (
            <CircleMarker
              key={st.code}
              center={[st.lat, st.lng]}
              radius={Math.min(5 + st.count * 0.5, 30)}
              pathOptions={{
                color: markerColor,
                fillColor: markerColor,
                fillOpacity: 0.7,
                weight: 1.5
              }}
              eventHandlers={{
                click: () => onSelectStation(st)
              }}
            >
              <Popup>
                <div style={styles.popup}>
                  <h3 style={styles.popupTitle}>{st.name} ({st.code})</h3>
                  <p style={styles.popupSubtitle}>
                    <strong>{st.count}</strong> complaints this period
                  </p>
                  <hr style={styles.divider} />
                  <div style={styles.breakdownHeader}>Top Complaint Types:</div>
                  <ul style={styles.breakdownList}>
                    {st.top3Breakdown.map(([type, count]) => (
                      <li key={type} style={styles.breakdownItem}>
                        <span>{type}</span>
                        <span style={styles.breakdownCount}>{count}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    style={styles.popupBtn}
                    onClick={() => onSelectStation(st)}
                  >
                    View complaints
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}

const styles = {
  mapWrapper: {
    flex: '1',
    height: '500px',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #F0F0F0',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
  },
  mapContainer: {
    width: '100%',
    height: '100%',
    zIndex: 1
  },
  popup: {
    fontFamily: "'Inter', -apple-system, sans-serif",
    color: '#111111',
    padding: '4px',
    minWidth: '180px'
  },
  popupTitle: {
    fontSize: '14px',
    fontWeight: '700',
    margin: '0 0 4px 0',
    color: '#1A3557'
  },
  popupSubtitle: {
    fontSize: '12px',
    margin: '0 0 8px 0',
    color: '#555555'
  },
  divider: {
    border: 'none',
    borderTop: '1px solid #E0E0E0',
    margin: '8px 0'
  },
  breakdownHeader: {
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    color: '#AAAAAA',
    marginBottom: '6px'
  },
  breakdownList: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 12px 0'
  },
  breakdownItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#111111',
    marginBottom: '4px'
  },
  breakdownCount: {
    fontWeight: '600'
  },
  popupBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#E8621A',
    fontWeight: '600',
    fontSize: '12px',
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline',
    display: 'block',
    textAlign: 'left',
    marginTop: '4px'
  }
};
