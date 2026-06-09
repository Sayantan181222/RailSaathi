import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Loader2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix Vite default Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icons using L.divIcon for high fidelity
const sosIcon = L.divIcon({
  html: `<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background-color:#CC0000;border:2px solid #FFFFFF;box-shadow:0 2px 6px rgba(0,0,0,0.3);position:relative;">
           <span style="color:#FFFFFF;font-size:10px;font-weight:800;letter-spacing:0.5px;">SOS</span>
           <div style="position:absolute;width:100%;height:100%;border-radius:50%;border:2px solid #CC0000;animation:pulse 1.5s infinite;top:-2px;left:-2px;box-sizing:content-box;"></div>
         </div>`,
  className: 'custom-sos-leaflet-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const activeIcon = L.divIcon({
  html: `<div style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background-color:#E8621A;border:1.5px solid #FFFFFF;box-shadow:0 2px 4px rgba(0,0,0,0.25);">
           <div style="width:6px;height:6px;border-radius:50%;background-color:#FFFFFF;"></div>
         </div>`,
  className: 'custom-active-leaflet-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const resolvedIcon = L.divIcon({
  html: `<div style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background-color:#888888;border:1.5px solid #FFFFFF;box-shadow:0 1px 3px rgba(0,0,0,0.2);opacity:0.65;">
           <div style="width:6px;height:6px;border-radius:50%;background-color:#FFFFFF;"></div>
         </div>`,
  className: 'custom-resolved-leaflet-icon',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const getIncidentIcon = (incident) => {
  if (incident.status === 'RESOLVED') return resolvedIcon;
  if (incident.event_type === 'SOS') return sosIcon;
  return activeIcon;
};

const formatTime = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

export default function SafetyMap({ incidents = [], onResolve, resolvingId }) {
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
        {incidents
          .filter((inc) => inc.lat != null && inc.lng != null)
          .map((inc) => (
            <Marker
              key={inc.id}
              position={[inc.lat, inc.lng]}
              icon={getIncidentIcon(inc)}
            >
              <Popup>
                <div style={styles.popup}>
                  <h3
                    style={{
                      ...styles.popupTitle,
                      color: inc.status === 'RESOLVED' ? '#888888' : (inc.event_type === 'SOS' ? '#CC0000' : '#E8621A')
                    }}
                  >
                    {inc.event_type} {inc.status === 'RESOLVED' && '(Resolved)'}
                  </h3>
                  <p style={styles.popupText}>
                    <strong>Train:</strong> {inc.train_number} | <strong>Coach:</strong> {inc.coach || 'N/A'}
                  </p>
                  <p style={styles.popupText}>
                    <strong>Time:</strong> {formatTime(inc.created_at)}
                  </p>
                  {inc.description && (
                    <p style={styles.popupDesc}>"{inc.description}"</p>
                  )}
                  {inc.status !== 'RESOLVED' && (
                    <button
                      type="button"
                      disabled={resolvingId === inc.id}
                      style={styles.resolveBtn}
                      onClick={() => onResolve(inc.id)}
                    >
                      {resolvingId === inc.id ? (
                        <>
                          <Loader2 size={12} style={styles.spinner} />
                          Resolving...
                        </>
                      ) : (
                        'Mark Resolved'
                      )}
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}

const styles = {
  mapWrapper: {
    width: '100%',
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
    minWidth: '200px'
  },
  popupTitle: {
    fontSize: '14px',
    fontWeight: '700',
    margin: '0 0 6px 0',
    textTransform: 'uppercase'
  },
  popupText: {
    fontSize: '12px',
    margin: '0 0 4px 0',
    color: '#555555'
  },
  popupDesc: {
    fontSize: '11px',
    fontStyle: 'italic',
    color: '#777777',
    margin: '8px 0',
    backgroundColor: '#F9F9F9',
    padding: '6px',
    borderRadius: '4px',
    borderLeft: '2px solid #E0E0E0'
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
    width: '100%',
    marginTop: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'background-color 150ms ease'
  },
  spinner: {
    animation: 'spin 1s linear infinite'
  }
};
