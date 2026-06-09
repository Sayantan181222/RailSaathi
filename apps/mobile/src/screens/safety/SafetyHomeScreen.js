import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ShieldAlert, TriangleAlert, Map, Users } from 'lucide-react-native';
import SOSButton from './components/SOSButton';
import { getMyEvents } from './services/safetyService';
import { useRailSaathi } from '../../context/RailSaathiContext';

const ActionTile = ({ icon: Icon, label, onPress }) => (
  <TouchableOpacity style={styles.actionTile} onPress={onPress}>
    <Icon color="#E8621A" size={28} style={{ marginBottom: 12 }} />
    <Text style={styles.actionTileLabel}>{label}</Text>
  </TouchableOpacity>
);

export default function SafetyHomeScreen() {
  const { currentUser, activeJourney } = useRailSaathi();
  const navigation = useNavigation();
  const route = useRoute();
  const [recentEvents, setRecentEvents] = useState([]);

  useEffect(() => {
    // Check if coming back from an SOS cancel with cooldown
    if (route.params?.cancelCooldown) {
      // In a real app, this would trigger global state/context to disable the SOSButton
      // Alternatively, the SOSButton could listen to an event emitter.
    }

    // Fetch recent events
    getMyEvents().then(res => {
      // Assuming axios response structure
      if (res && res.data && res.data.data) {
        setRecentEvents(res.data.data.slice(0, 3));
      }
    }).catch(e => console.warn('Failed to fetch events:', e));
  }, [route.params]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Half: SOS Button & Instructions */}
      <View style={styles.topHalf}>
        <SOSButton />
        <Text style={styles.subtitle}>
          Press SOS to alert RPF and your emergency contacts
        </Text>
      </View>

      {/* Middle Row: Quick Action Tiles */}
      <View style={styles.tilesRow}>
        <ActionTile 
          icon={ShieldAlert} 
          label="Compartment Alert" 
          onPress={() => navigation.navigate('CompartmentAlert')} 
        />
        <ActionTile 
          icon={TriangleAlert} 
          label="Report Hazard" 
          onPress={() => navigation.navigate('HazardReport')} 
        />
        <ActionTile 
          icon={Map} 
          label="Safety Map" 
          onPress={() => navigation.navigate('SafetyMap')} 
        />
      </View>

      {/* Bottom Section: Events & Trusted Contacts */}
      <View style={styles.eventsSection}>
        <View style={styles.eventsHeader}>
          <Text style={styles.eventsTitle}>Recent Incidents</Text>
          <TouchableOpacity onPress={() => navigation.navigate('MyEvents')}>
            <Text style={styles.linkText}>My Safety Events</Text>
          </TouchableOpacity>
        </View>

        {recentEvents.length > 0 ? (
          recentEvents.map((ev, index) => (
            <View key={ev.id || index} style={styles.eventRow}>
              <Text style={styles.eventTypeText}>{ev.event_type.replace(/_/g, ' ')}</Text>
              <Text style={[styles.eventStatusText, ev.status === 'ACTIVE' && { color: '#E8621A' }]}>
                {ev.status}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyEventsText}>No recent incidents.</Text>
        )}
      </View>

      <TouchableOpacity 
        style={styles.fullWidthTile} 
        onPress={() => navigation.navigate('TrustedContacts')}
        activeOpacity={0.8}
      >
        <View style={styles.fullWidthTileContent}>
          <Users color="#E8621A" size={24} style={{ marginRight: 12 }} />
          <Text style={styles.fullWidthTileLabel}>Trusted Contacts</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  topHalf: {
    alignItems: 'center',
    marginVertical: 32,
  },
  subtitle: {
    color: '#555555',
    fontSize: 14,
    fontFamily: 'Inter',
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  tilesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 12,
  },
  actionTile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E8621A',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  actionTileLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111111',
    textAlign: 'center',
  },
  eventsSection: {
    marginBottom: 24,
  },
  eventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  eventsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111111',
    fontFamily: 'Inter',
  },
  linkText: {
    color: '#E8621A',
    fontWeight: 'bold',
    fontSize: 14,
  },
  eventRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  eventTypeText: {
    fontWeight: 'bold',
    color: '#111111',
    fontSize: 14,
  },
  eventStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#555555',
  },
  emptyEventsText: {
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  fullWidthTile: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  fullWidthTileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidthTileLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111111',
  }
});
