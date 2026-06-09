import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Animated, Dimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { getPublicMap } from './services/safetyService';

const { height: screenHeight } = Dimensions.get('window');

const FILTER_OPTIONS = [
  { id: 'ALL', label: 'All' },
  { id: 'SOS', label: 'SOS' },
  { id: 'COMPARTMENT_VIOLATION', label: 'Compartment' },
  { id: 'HAZARD_REPORT', label: 'Hazard' },
];

export default function SafetyMapScreen() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [slideAnim] = useState(new Animated.Value(300)); // bottom sheet initial offset

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await getPublicMap();
      if (response && response.data) {
        // Depending on backend shape, data might be response.data or response.data.data
        const fetchedEvents = Array.isArray(response.data) ? response.data : (response.data.data || []);
        setEvents(fetchedEvents);
      }
    } catch (error) {
      console.warn("Failed to fetch public map data", error);
    } finally {
      setLoading(false);
    }
  };

  const openBottomSheet = (event) => {
    setSelectedEvent(event);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0
    }).start();
  };

  const closeBottomSheet = () => {
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 200,
      useNativeDriver: true
    }).start(() => setSelectedEvent(null));
  };

  const filteredEvents = events.filter(ev => {
    if (activeFilter === 'ALL') return true;
    return ev.event_type === activeFilter;
  });

  const getMarkerConfig = (type) => {
    switch (type) {
      case 'SOS': return { color: '#CC0000', icon: '!' };
      case 'COMPARTMENT_VIOLATION': return { color: '#E8621A', icon: 'W' };
      case 'HAZARD_REPORT': return { color: '#F5A623', icon: '⚠' };
      default: return { color: '#888888', icon: '?' };
    }
  };

  const getRelativeTime = (isoString) => {
    if (!isoString) return 'Unknown time';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  };

  const getStatusStyle = (status) => {
    if (status === 'RESOLVED' || status === 'FALSE_ALARM') {
      return { bg: '#E8F5E9', text: '#2E7D32' };
    }
    // Pending / ACTIVE
    return { bg: '#FFF3EC', text: '#E8621A' };
  };

  return (
    <View style={styles.container}>
      
      {/* Map View */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 20.59,
          longitude: 78.96,
          latitudeDelta: 25,
          longitudeDelta: 25,
        }}
        onPress={closeBottomSheet}
      >
        {filteredEvents.map(ev => {
          if (!ev.lat || !ev.lng) return null;
          const config = getMarkerConfig(ev.event_type);
          
          return (
            <Marker
              key={ev.id}
              coordinate={{ latitude: parseFloat(ev.lat), longitude: parseFloat(ev.lng) }}
              onPress={(e) => {
                e.stopPropagation();
                openBottomSheet(ev);
              }}
            >
              <View style={[styles.customMarker, { backgroundColor: config.color }]}>
                <Text style={styles.markerText}>{config.icon}</Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#E8621A" />
        </View>
      )}

      {/* Top Filter Row */}
      <View style={styles.filterRow}>
        {FILTER_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.id}
            style={[styles.filterBtn, activeFilter === opt.id && styles.filterBtnActive]}
            onPress={() => {
              setActiveFilter(opt.id);
              closeBottomSheet();
            }}
          >
            <Text style={[styles.filterText, activeFilter === opt.id && styles.filterTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bottom Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#CC0000' }]} />
          <Text style={styles.legendText}>SOS</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#E8621A' }]} />
          <Text style={styles.legendText}>Compartment</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F5A623' }]} />
          <Text style={styles.legendText}>Hazard</Text>
        </View>
      </View>

      {/* Bottom Sheet */}
      <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: slideAnim }] }]}>
        {selectedEvent && (
          <View>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {selectedEvent.event_type.replace(/_/g, ' ')}
              </Text>
              
              <View style={[
                styles.statusPill, 
                { backgroundColor: getStatusStyle(selectedEvent.status).bg }
              ]}>
                <Text style={[
                  styles.statusText, 
                  { color: getStatusStyle(selectedEvent.status).text }
                ]}>
                  {selectedEvent.status === 'ACTIVE' ? 'Pending' : selectedEvent.status}
                </Text>
              </View>
            </View>

            {selectedEvent.alert_subtype && (
              <Text style={styles.sheetSubtype}>
                {selectedEvent.alert_subtype.replace(/_/g, ' ')}
              </Text>
            )}

            <View style={styles.sheetDetails}>
              {selectedEvent.train_number && (
                <Text style={styles.sheetInfoText}>
                  🚂 Train: {selectedEvent.train_number}
                </Text>
              )}
              {selectedEvent.station_code && (
                <Text style={styles.sheetInfoText}>
                  🚉 Station: {selectedEvent.station_code}
                </Text>
              )}
              <Text style={styles.sheetTimeText}>
                🕒 {getRelativeTime(selectedEvent.created_at)}
              </Text>
            </View>
            
            {/* Grab handle decoration */}
            <View style={styles.handleBar} />
          </View>
        )}
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  filterRow: {
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  filterBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  filterBtnActive: {
    backgroundColor: '#E8621A',
  },
  filterText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#555555',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  customMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  markerText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  legendContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#555555',
    fontWeight: 'bold',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    padding: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    minHeight: 180,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111111',
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  sheetSubtype: {
    fontSize: 14,
    color: '#E8621A',
    fontWeight: '600',
    marginBottom: 12,
  },
  sheetDetails: {
    gap: 6,
    marginBottom: 20,
  },
  sheetInfoText: {
    fontSize: 14,
    color: '#555555',
    fontWeight: '500',
  },
  sheetTimeText: {
    fontSize: 14,
    color: '#888888',
    marginTop: 4,
    fontStyle: 'italic',
  },
  handleBar: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
  }
});
