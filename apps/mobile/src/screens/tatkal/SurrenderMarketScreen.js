import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  SafeAreaView,
  ScrollView
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../../constants';
import { getSurrenders, listSurrender, requestSurrender } from './services/tatkalService';

export default function SurrenderMarketScreen() {
  const [surrenders, setSurrenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form modal visibility and state
  const [modalVisible, setModalVisible] = useState(false);
  const [pnr, setPnr] = useState('');
  const [fromStation, setFromStation] = useState('');
  const [toStation, setToStation] = useState('');
  const [travelDate, setTravelDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [trainClass, setTrainClass] = useState('3A');
  const [trainNumber, setTrainNumber] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const CLASSES = ['1A', '2A', '3A', 'SL', 'GEN'];

  const fetchSurrenders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getSurrenders();
      const data = response.data?.data || response.data || [];
      setSurrenders(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch surrender list');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await getSurrenders();
        if (active) {
          const data = response.data?.data || response.data || [];
          setSurrenders(data);
        }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.error || err.message || 'Failed to fetch surrender list');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [fetchSurrenders]);

  // Request a ticket
  const handleRequestTicket = async (id) => {
    try {
      Alert.alert(
        'Confirm Claim',
        'Are you sure you want to request this surrendered ticket?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Claim',
            onPress: async () => {
              try {
                await requestSurrender(id);
                Alert.alert('Success', 'Ticket claimed successfully!');
                fetchSurrenders();
              } catch (err) {
                Alert.alert('Error', err.response?.data?.error || err.message || 'Failed to claim ticket');
              }
            }
          }
        ]
      );
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred.');
    }
  };

  // Submit list ticket for surrender
  const handleListTicket = async () => {
    if (!pnr || pnr.length !== 10) {
      Alert.alert('Validation Error', 'PNR must be exactly 10 digits.');
      return;
    }
    if (!fromStation || !toStation) {
      Alert.alert('Validation Error', 'Please specify origin and destination stations.');
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        pnr,
        from_station: fromStation.toUpperCase().trim(),
        to_station: toStation.toUpperCase().trim(),
        travel_date: travelDate.toISOString().split('T')[0],
        class: trainClass,
        train_number: trainNumber || null
      };

      await listSurrender(payload);
      Alert.alert('Success', 'Ticket listed for surrender successfully.');
      setModalVisible(false);
      // Reset form
      setPnr('');
      setFromStation('');
      setToStation('');
      setTrainNumber('');
      setTravelDate(new Date());
      fetchSurrenders();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || err.message || 'Failed to list ticket');
    } finally {
      setFormLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.ticketCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.routeText}>{item.from_station} ➔ {item.to_station}</Text>
        <View style={styles.classBadge}>
          <Text style={styles.classBadgeText}>{item.class || 'GEN'}</Text>
        </View>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>Travel Date</Text>
          <Text style={styles.detailVal}>{item.travel_date}</Text>
        </View>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>Train No.</Text>
          <Text style={styles.detailVal}>{item.train_number || 'N/A'}</Text>
        </View>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>Status</Text>
          <Text style={styles.statusListed}>{item.status}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.claimBtn}
        activeOpacity={0.75}
        onPress={() => handleRequestTicket(item.id)}
      >
        <Text style={styles.claimBtnText}>Request Ticket</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Surrender Market</Text>
          <Text style={styles.subtitle}>Claim unused tickets from other passengers</Text>
        </View>
        <TouchableOpacity
          style={styles.listTicketBtn}
          activeOpacity={0.75}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.listTicketBtnText}>List My Ticket</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchSurrenders}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.brandOrange} />
        </View>
      ) : surrenders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎫</Text>
          <Text style={styles.emptyText}>No tickets listed in the market right now</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={fetchSurrenders}>
            <Text style={styles.refreshBtnText}>Refresh Market</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={surrenders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={fetchSurrenders}
        />
      )}

      {/* List Ticket Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>List Ticket for Surrender</Text>
            <ScrollView style={{ width: '100%' }}>
              <Text style={styles.inputLabel}>10-Digit PNR</Text>
              <TextInput
                style={styles.input}
                value={pnr}
                onChangeText={setPnr}
                placeholder="e.g. 4321659870"
                keyboardType="numeric"
                maxLength={10}
              />

              <Text style={styles.inputLabel}>From Station</Text>
              <TextInput
                style={styles.input}
                value={fromStation}
                onChangeText={setFromStation}
                placeholder="e.g. SBC"
                autoCapitalize="characters"
                maxLength={7}
              />

              <Text style={styles.inputLabel}>To Station</Text>
              <TextInput
                style={styles.input}
                value={toStation}
                onChangeText={setToStation}
                placeholder="e.g. NDLS"
                autoCapitalize="characters"
                maxLength={7}
              />

              <Text style={styles.inputLabel}>Travel Date</Text>
              <TouchableOpacity
                style={styles.pickerBtn}
                activeOpacity={0.75}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.pickerBtnText}>{travelDate.toDateString()}</Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={travelDate}
                  mode="date"
                  minimumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) setTravelDate(selectedDate);
                  }}
                />
              )}

              <Text style={styles.inputLabel}>Class</Text>
              <View style={styles.classRow}>
                {CLASSES.map((cls) => (
                  <TouchableOpacity
                    key={cls}
                    style={[styles.classOption, trainClass === cls && styles.classOptionActive]}
                    activeOpacity={0.75}
                    onPress={() => setTrainClass(cls)}
                  >
                    <Text style={[styles.classOptionText, trainClass === cls && styles.classOptionTextActive]}>
                      {cls}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Train Number (Optional)</Text>
              <TextInput
                style={styles.input}
                value={trainNumber}
                onChangeText={setTrainNumber}
                placeholder="e.g. 12627"
                keyboardType="numeric"
                maxLength={6}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  activeOpacity={0.75}
                  onPress={() => setModalVisible(false)}
                  disabled={formLoading}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitBtn}
                  activeOpacity={0.75}
                  onPress={handleListTicket}
                  disabled={formLoading}
                >
                  {formLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>List Ticket</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surfaceGrey },
  header: {
    backgroundColor: COLORS.pageWhite,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.dividerGrey
  },
  title: { fontSize: 20, fontWeight: 'bold', color: COLORS.brandNavy },
  subtitle: { fontSize: 12, color: '#666', marginTop: 2 },
  listTicketBtn: { backgroundColor: COLORS.brandOrange, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  listTicketBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16 },
  ticketCard: {
    backgroundColor: COLORS.pageWhite,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000', shadowOffset: { width:0, height:2 }, shadowOpacity:0.1, shadowRadius:4
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  routeText: { fontSize: 18, fontWeight: 'bold', color: COLORS.brandNavy },
  classBadge: { backgroundColor: '#F0F7FF', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  classBadgeText: { color: '#0066CC', fontWeight: 'bold', fontSize: 12 },
  cardDetails: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 12 },
  detailCol: { alignItems: 'flex-start' },
  detailLabel: { fontSize: 11, color: '#888', marginBottom: 4 },
  detailVal: { fontSize: 14, fontWeight: '600', color: '#333' },
  statusListed: { fontSize: 12, color: '#27AE60', fontWeight: 'bold', textTransform: 'uppercase' },
  claimBtn: { backgroundColor: '#1A3557', padding: 12, borderRadius: 8, alignItems: 'center' },
  claimBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, color: '#888', textAlign: 'center', marginBottom: 24 },
  refreshBtn: { borderWidth: 1, borderColor: COLORS.brandOrange, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24 },
  refreshBtnText: { color: COLORS.brandOrange, fontWeight: '700' },
  errorBox: { margin: 16, padding: 16, backgroundColor: '#FFF0E6', borderWidth: 1, borderColor: COLORS.brandOrange, borderRadius: 8 },
  errorText: { color: COLORS.brandOrange, fontWeight: 'bold', textAlign: 'center' },
  retryBtn: { marginTop: 12, alignSelf: 'center', backgroundColor: COLORS.brandOrange, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 },
  retryBtnText: { color: '#FFF', fontWeight: 'bold' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, width: '100%', maxHeight: '85%', alignItems: 'center', elevation: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.brandNavy, marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.brandNavy, alignSelf: 'flex-start', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, fontSize: 15, width: '100%' },
  pickerBtn: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 14, backgroundColor: '#FFF', width: '100%' },
  pickerBtnText: { fontSize: 15, color: '#333' },
  classRow: { flexDirection: 'row', gap: 6, marginVertical: 8, flexWrap: 'wrap' },
  classOption: { borderWidth: 1, borderColor: '#DDD', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#FFF' },
  classOptionActive: { borderColor: COLORS.brandOrange, backgroundColor: '#FFF0E6' },
  classOptionText: { fontSize: 13, color: '#555' },
  classOptionTextActive: { color: COLORS.brandOrange, fontWeight: 'bold' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 14, alignItems: 'center', backgroundColor: '#FFF' },
  cancelBtnText: { color: '#555', fontWeight: '700' },
  submitBtn: { flex: 1, backgroundColor: COLORS.brandOrange, borderRadius: 8, padding: 14, alignItems: 'center' },
  submitBtnText: { color: '#FFF', fontWeight: '700' }
});
