// IMPORTANT: Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in apps/mobile/.env
// In app.json (or app.config.js), the Google Maps key needs to be set:
// "android": { "config": { "googleMaps": { "apiKey": "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY" } } },
// "ios": { "config": { "googleMapsApiKey": "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY" } }

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { AlertTriangle } from 'lucide-react-native';
import { getHeatmapData, getPublicStats } from './services/complaintService';
import StationMarker, { StationBottomSheet } from './components/StationMarker';
import { COLORS } from '../../../constants';

export default function PublicHeatMapScreen() {
  const [stations, setStations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);

  const fetchMapAndStatsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [heatmapResult, statsResult] = await Promise.all([
        getHeatmapData(),
        getPublicStats(),
      ]);
      setStations(heatmapResult.data || []);
      setStats(statsResult.data || {});
    } catch (err) {
      setError(err.message || 'Failed to load heatmap data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapAndStatsData();
  }, []);

  const getCircleColors = (complaints) => {
    if (complaints > 30) {
      return {
        fill: 'rgba(204, 0, 0, 0.4)',
        stroke: 'rgba(204, 0, 0, 0.8)',
      };
    } else if (complaints > 10) {
      return {
        fill: 'rgba(232, 98, 26, 0.4)',
        stroke: 'rgba(232, 98, 26, 0.8)',
      };
    } else {
      return {
        fill: 'rgba(39, 174, 96, 0.4)',
        stroke: 'rgba(39, 174, 96, 0.8)',
      };
    }
  };

  const handleMapPress = (e) => {
    // Tapping elsewhere on the map closes the bottom sheet
    if (selectedStation) {
      setSelectedStation(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* Stats Bar */}
      {stats && (
        <View style={styles.statsBar}>
          <Text style={styles.statsText}>
            <Text style={styles.statsValue}>{stats.total_complaints_today || 0}</Text> today
          </Text>
          <Text style={styles.statsDivider}>|</Text>
          <Text style={styles.statsText}>
            <Text style={styles.statsValue}>{stats.resolution_rate_percent || 0}%</Text> resolved
          </Text>
          <Text style={styles.statsDivider}>|</Text>
          <Text style={styles.statsText}>
            Top: <Text style={styles.statsValue}>{stats.most_common_type || 'N/A'}</Text>
          </Text>
        </View>
      )}

      {/* Map View */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: 20.5937,
          longitude: 78.9629,
          latitudeDelta: 15,
          longitudeDelta: 15,
        }}
        onPress={handleMapPress}
      >
        {!error &&
          stations
            .filter((s) => s.lat && s.lng && s.total_complaints > 0)
            .map((station) => {
              const lat = Number(station.lat);
              const lng = Number(station.lng);
              const colors = getCircleColors(station.total_complaints);
              const radius = Math.min(Math.max(15000, station.total_complaints * 3000), 80000);

              return (
                <React.Fragment key={station.station_code}>
                  {/* Heat Circle */}
                  <Circle
                    center={{ latitude: lat, longitude: lng }}
                    radius={radius}
                    fillColor={colors.fill}
                    strokeColor={colors.stroke}
                    strokeWidth={1.5}
                  />

                  {/* Intercept marker for tapping */}
                  <Marker
                    coordinate={{ latitude: lat, longitude: lng }}
                    onPress={() => setSelectedStation(station)}
                    tracksViewChanges={false}
                  >
                    <StationMarker station={station} />
                  </Marker>
                </React.Fragment>
              );
            })}
      </MapView>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.overlayContainer}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.brandOrange || '#E8621A'} />
            <Text style={styles.loadingText}>Loading heatmap...</Text>
          </View>
        </View>
      )}

      {/* Error State Overlay */}
      {error && !loading && (
        <View style={styles.overlayContainer}>
          <View style={styles.errorCard}>
            <AlertTriangle size={36} color="#CC0000" style={styles.errorIcon} />
            <Text style={styles.errorTitle}>Failed to Load Map</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchMapAndStatsData}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Empty State Overlay */}
      {!loading && !error && stations.length === 0 && (
        <View style={styles.emptyOverlay}>
          <Text style={styles.emptyText}>No complaint data available yet.</Text>
        </View>
      )}

      {/* Selected Station Bottom Sheet */}
      {selectedStation && (
        <View style={styles.bottomSheetContainer}>
          <StationBottomSheet station={selectedStation} onClose={() => setSelectedStation(null)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  statsBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 48,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsText: {
    fontSize: 12,
    color: '#555555',
    fontWeight: '500',
  },
  statsValue: {
    color: COLORS.brandOrange || '#E8621A',
    fontWeight: '700',
  },
  statsDivider: {
    color: COLORS.dividerGrey || '#E0E0E0',
    marginHorizontal: 12,
    fontSize: 12,
  },
  map: {
    flex: 1,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(245, 245, 245, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  loadingBox: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary || '#555555',
  },
  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    marginHorizontal: 20,
    borderWidth: 1.5,
    borderColor: '#FFCDD2',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  errorIcon: {
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#CC0000',
    marginBottom: 6,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.textSecondary || '#555555',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  retryBtn: {
    backgroundColor: COLORS.brandOrange || '#E8621A',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyOverlay: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomSheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 15,
  },
});
