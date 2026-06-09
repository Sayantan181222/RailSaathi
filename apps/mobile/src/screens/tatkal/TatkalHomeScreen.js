import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants';
import { getMyRequests, fireRequest, cancelRequest } from './services/tatkalService';

// Live countdown sub-component
function CountdownCard({ scheduledFireTime, status }) {
  const [timeLeft, setTimeLeft] = React.useState('');

  React.useEffect(() => {
    const target = new Date(scheduledFireTime).getTime();

    const updateCountdown = () => {
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft(status === 'FIRED' ? 'Fired' : 'Ready to fire');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      let str = '';
      if (days > 0) str += `${days}d `;
      str += `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
      setTimeLeft(str);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [scheduledFireTime, status]);

  return (
    <View style={styles.countdownBox}>
      <Text style={styles.countdownLabel}>Auto-booking triggers in:</Text>
      <Text style={styles.countdownTime}>{timeLeft || 'Calculating...'}</Text>
    </View>
  );
}

export default function TatkalHomeScreen({ navigation }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // stores request ID if action is running

  const fetchRequests = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await getMyRequests();
      const data = response.data?.data || response.data || [];
      setRequests(data);
    } catch (err) {
      console.log('Failed to fetch Tatkal requests:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [fetchRequests])
  );

  const handleFireDemo = async (id) => {
    try {
      Alert.alert(
        'Demo Fire',
        'This will simulate firing your Tatkal booking immediately. The state changes to FIRED, then CONFIRMED with a generated PNR after 2 seconds.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Fire Now',
            onPress: async () => {
              setActionLoading(id);
              try {
                await fireRequest(id);
                Alert.alert('Success', 'Tatkal booking executed successfully!');
                fetchRequests();
              } catch (err) {
                Alert.alert('Error', err.response?.data?.error || err.message || 'Failed to execute booking');
              } finally {
                setActionLoading(null);
              }
            }
          }
        ]
      );
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred.');
    }
  };

  const handleCancelRequest = async (id) => {
    try {
      Alert.alert(
        'Cancel Request',
        'Are you sure you want to cancel this pending Tatkal request?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, Cancel',
            onPress: async () => {
              setActionLoading(id);
              try {
                await cancelRequest(id);
                Alert.alert('Success', 'Request cancelled successfully.');
                fetchRequests();
              } catch (err) {
                Alert.alert('Error', err.response?.data?.error || err.message || 'Failed to cancel request');
              } finally {
                setActionLoading(null);
              }
            }
          }
        ]
      );
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred.');
    }
  };

  const activeRequest = requests.find(r => r.status === 'PENDING' || r.status === 'FIRED');
  const confirmedRequests = requests.filter(r => r.status === 'CONFIRMED');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchRequests(true)} />
        }
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.brandOrange} />
          </View>
        ) : !activeRequest && confirmedRequests.length === 0 ? (
          /* State A: No Requests */
          <View style={styles.stateACard}>
            <Text style={styles.iconLarge}>⏰</Text>
            <Text style={styles.titleLarge}>Tatkal Assist</Text>
            <Text style={styles.subtitleLarge}>
              Pre-fill your journey details now and we will fire your booking at exactly 10:00 AM (AC) or 11:00 AM (Non-AC) on the booking day!
            </Text>
            <TouchableOpacity
              style={styles.bookBtn}
              activeOpacity={0.75}
              onPress={() => navigation.navigate('PreFillForm')}
            >
              <Text style={styles.bookBtnText}>Book Tatkal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.marketLink}
              activeOpacity={0.75}
              onPress={() => navigation.navigate('SurrenderMarket')}
            >
              <Text style={styles.marketLinkText}>Explore Surrender Market ➔</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Render Active and Confirmed Requests */
          <View style={styles.requestsContainer}>
            {/* Active Request (PENDING / FIRED) */}
            {activeRequest && (
              <View style={styles.activeCard}>
                <View style={styles.activeCardHeader}>
                  <Text style={styles.sectionHeader}>Active Request</Text>
                  <View style={[styles.statusBadge, activeRequest.status === 'FIRED' && styles.statusBadgeFired]}>
                    <Text style={styles.statusBadgeText}>{activeRequest.status}</Text>
                  </View>
                </View>

                <CountdownCard scheduledFireTime={activeRequest.scheduled_fire_time} status={activeRequest.status} />

                <View style={styles.requestInfoRow}>
                  <View>
                    <Text style={styles.routeText}>{activeRequest.from_station} ➔ {activeRequest.to_station}</Text>
                    <Text style={styles.dateText}>Travel Date: {activeRequest.travel_date}</Text>
                    <Text style={styles.classText}>Class: {activeRequest.class} | Passengers: {activeRequest.passengers?.length || 0}</Text>
                  </View>
                  {activeRequest.is_urgent && (
                    <View style={styles.urgencyBadge}>
                      <Text style={styles.urgencyBadgeText}>Urgency: {Number(activeRequest.urgency_score).toFixed(1)}/10</Text>
                    </View>
                  )}
                </View>

                {activeRequest.status === 'PENDING' && (
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      activeOpacity={0.75}
                      onPress={() => handleCancelRequest(activeRequest.id)}
                      disabled={actionLoading !== null}
                    >
                      {actionLoading === activeRequest.id ? (
                        <ActivityIndicator color="#D32F2F" />
                      ) : (
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.fireBtn}
                      activeOpacity={0.75}
                      onPress={() => handleFireDemo(activeRequest.id)}
                      disabled={actionLoading !== null}
                    >
                      {actionLoading === activeRequest.id ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text style={styles.fireBtnText}>Demo Fire</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Confirmed Requests (State C) */}
            {confirmedRequests.length > 0 && (
              <View style={styles.confirmedSection}>
                <Text style={styles.sectionHeader}>Confirmed Bookings</Text>
                {confirmedRequests.map((item) => (
                  <View key={item.id} style={styles.confirmedCard}>
                    <View style={styles.confirmedHeader}>
                      <Text style={styles.routeTextConfirmed}>{item.from_station} ➔ {item.to_station}</Text>
                      <View style={styles.checkmarkBadge}>
                        <Text style={styles.checkmarkIcon}>✓</Text>
                        <Text style={styles.checkmarkText}>CONFIRMED</Text>
                      </View>
                    </View>

                    <View style={styles.confirmedDetails}>
                      <Text style={styles.pnrText}>PNR: <Text style={styles.pnrVal}>{item.simulated_pnr}</Text></Text>
                      <Text style={styles.confirmedSubtext}>Date: {item.travel_date} | Class: {item.class}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Quick Actions (State B & C) */}
            <View style={styles.quickActions}>
              {!activeRequest && (
                <TouchableOpacity
                  style={styles.quickActionBtn}
                  activeOpacity={0.75}
                  onPress={() => navigation.navigate('PreFillForm')}
                >
                  <Text style={styles.quickActionBtnText}>+ New Tatkal Pre-fill</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.quickActionBtnSecondary}
                activeOpacity={0.75}
                onPress={() => navigation.navigate('SurrenderMarket')}
              >
                <Text style={styles.quickActionBtnSecondaryText}>Explore Surrender Market ➔</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surfaceGrey },
  scroll: { padding: 16 },
  centerContainer: { height: 300, justifyContent: 'center', alignItems: 'center' },
  stateACard: {
    backgroundColor: COLORS.pageWhite,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    marginTop: 40,
    elevation: 3,
    shadowColor: '#000', shadowOffset: { width:0, height:2 }, shadowOpacity:0.1, shadowRadius:4
  },
  iconLarge: { fontSize: 64, marginBottom: 16 },
  titleLarge: { fontSize: 24, fontWeight: 'bold', color: COLORS.brandNavy, marginBottom: 12 },
  subtitleLarge: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 32 },
  bookBtn: { backgroundColor: COLORS.brandOrange, paddingVertical: 16, paddingHorizontal: 40, borderRadius: 8, width: '100%', alignItems: 'center' },
  bookBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  marketLink: { marginTop: 24, paddingVertical: 8 },
  marketLinkText: { color: COLORS.brandNavy, fontWeight: '700', fontSize: 14 },
  requestsContainer: { gap: 16 },
  activeCard: {
    backgroundColor: COLORS.pageWhite,
    borderRadius: 14,
    padding: 16,
    elevation: 3,
    shadowColor: '#000', shadowOffset: { width:0, height:2 }, shadowOpacity:0.1, shadowRadius:4
  },
  activeCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionHeader: { fontSize: 16, fontWeight: 'bold', color: COLORS.brandNavy },
  statusBadge: { backgroundColor: '#FFF0E6', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  statusBadgeFired: { backgroundColor: '#E1F5FE' },
  statusBadgeText: { color: COLORS.brandOrange, fontWeight: 'bold', fontSize: 11 },
  countdownBox: { backgroundColor: '#FFF9F5', borderLeftWidth: 4, borderLeftColor: COLORS.brandOrange, padding: 16, borderRadius: 8, marginBottom: 16 },
  countdownLabel: { fontSize: 12, color: '#888' },
  countdownTime: { fontSize: 22, fontWeight: 'bold', color: COLORS.brandOrange, marginTop: 4 },
  requestInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: '#EEE', paddingBottom: 16, marginBottom: 16 },
  routeText: { fontSize: 18, fontWeight: 'bold', color: COLORS.brandNavy },
  dateText: { fontSize: 13, color: '#666', marginTop: 4 },
  classText: { fontSize: 13, color: '#666', marginTop: 2 },
  urgencyBadge: { backgroundColor: '#FFEBEE', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  urgencyBadgeText: { color: '#CC0000', fontSize: 11, fontWeight: 'bold' },
  buttonRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D32F2F', borderRadius: 8, padding: 12, alignItems: 'center' },
  cancelBtnText: { color: '#D32F2F', fontWeight: 'bold' },
  fireBtn: { flex: 2, backgroundColor: COLORS.brandOrange, borderRadius: 8, padding: 12, alignItems: 'center' },
  fireBtnText: { color: '#FFF', fontWeight: 'bold' },
  confirmedSection: { marginTop: 8 },
  confirmedCard: {
    backgroundColor: COLORS.pageWhite,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000', shadowOffset: { width:0, height:2 }, shadowOpacity:0.1, shadowRadius:4
  },
  confirmedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  routeTextConfirmed: { fontSize: 16, fontWeight: 'bold', color: COLORS.brandNavy },
  checkmarkBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  checkmarkIcon: { color: '#27AE60', fontWeight: 'bold', marginRight: 4, fontSize: 12 },
  checkmarkText: { color: '#27AE60', fontWeight: 'bold', fontSize: 10 },
  confirmedDetails: { borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 12 },
  pnrText: { fontSize: 14, color: '#333' },
  pnrVal: { fontWeight: 'bold', color: COLORS.brandOrange, fontSize: 15 },
  confirmedSubtext: { fontSize: 12, color: '#666', marginTop: 4 },
  quickActions: { gap: 12, marginTop: 12 },
  quickActionBtn: { backgroundColor: COLORS.brandOrange, padding: 16, borderRadius: 8, alignItems: 'center' },
  quickActionBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  quickActionBtnSecondary: { borderWidth: 1, borderColor: COLORS.brandNavy, padding: 16, borderRadius: 8, alignItems: 'center', backgroundColor: '#FFF' },
  quickActionBtnSecondaryText: { color: COLORS.brandNavy, fontWeight: 'bold', fontSize: 15 }
});
