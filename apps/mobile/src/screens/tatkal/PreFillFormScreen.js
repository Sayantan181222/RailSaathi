import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Switch,
  Alert
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useRailSaathi } from '../../context/RailSaathiContext';
import { COLORS } from '../../constants';
import { submitPrefill } from './services/tatkalService';

export default function PreFillFormScreen({ navigation }) {
  const { currentUser } = useRailSaathi();

  // Step state: 1 (Journey), 2 (Passengers), 3 (Urgency)
  const [step, setStep] = useState(1);

  // Step 1: Journey State
  const [fromStation, setFromStation] = useState('');
  const [toStation, setToStation] = useState('');
  const [travelDate, setTravelDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d;
  });
  const [minDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [trainClass, setTrainClass] = useState(currentUser?.preferred_class || '3A');
  const [trainNumber, setTrainNumber] = useState('');

  // Step 2: Passengers State
  // First passenger default pre-filled from current user profile
  const [passengers, setPassengers] = useState([
    { name: currentUser?.name || '', age: '', gender: 'Male', berth_preference: 'No Preference' }
  ]);

  // Step 3: Urgency State
  const [isUrgent, setIsUrgent] = useState(false);
  const [urgencyReason, setUrgencyReason] = useState('medical');
  const [urgencyDocUrl, setUrgencyDocUrl] = useState('');

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Constants
  const CLASSES = ['1A', '2A', '3A', 'SL', 'GEN'];
  const GENDERS = ['Male', 'Female', 'Other'];
  const BERTHS = ['Lower', 'Middle', 'Upper', 'Side Lower', 'Side Upper', 'No Preference'];
  const REASONS = [
    { label: 'Medical Emergency', value: 'medical' },
    { label: 'Bereavement / Funeral', value: 'bereavement' },
    { label: 'Official Duty / Work', value: 'official' },
    { label: 'Personal Critical Travel', value: 'personal' }
  ];

  // Pick document / image
  const handlePickDocument = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Permission to access media library is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Mock upload url by setting it to the local asset URI
        setUrgencyDocUrl(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  // Add passenger
  const handleAddPassenger = () => {
    if (passengers.length >= 6) {
      Alert.alert('Limit Reached', 'You can add at most 6 passengers.');
      return;
    }
    setPassengers([...passengers, { name: '', age: '', gender: 'Male', berth_preference: 'No Preference' }]);
  };

  // Remove passenger
  const handleRemovePassenger = (index) => {
    if (passengers.length === 1) return;
    const list = [...passengers];
    list.splice(index, 1);
    setPassengers(list);
  };

  // Update passenger field
  const handleUpdatePassenger = (index, field, value) => {
    const list = [...passengers];
    list[index][field] = value;
    setPassengers(list);
  };

  // Urgency score preview
  const calculateUrgencyScore = () => {
    if (!isUrgent) return 0;
    const reasonScores = { medical: 9, bereavement: 8, official: 7, personal: 5 };
    let score = reasonScores[urgencyReason] || 0;
    if (urgencyDocUrl) score += 1;
    return score;
  };

  // Handle Form Submission
  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      const payload = {
        from_station: fromStation.toUpperCase().trim(),
        to_station: toStation.toUpperCase().trim(),
        travel_date: travelDate ? travelDate.toISOString().split('T')[0] : '',
        train_number: trainNumber.trim() || null,
        class: trainClass,
        passengers: passengers.map(p => ({
          ...p,
          age: parseInt(p.age, 10) || null
        })),
        is_urgent: isUrgent,
        urgency_reason: isUrgent ? urgencyReason : null,
        urgency_document_url: isUrgent ? urgencyDocUrl : null
      };

      await submitPrefill(payload);
      Alert.alert('Success', 'Tatkal pre-fill details saved successfully.', [
        { text: 'OK', onPress: () => navigation.navigate('MainTabs', { screen: 'Tatkal' }) }
      ]);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to submit form');
    } finally {
      setLoading(false);
    }
  };

  // Step 1 Validation
  const validateStep1 = () => {
    if (!fromStation || !toStation) {
      Alert.alert('Validation Error', 'Please specify origin and destination stations.');
      return false;
    }
    if (fromStation.toUpperCase().trim() === toStation.toUpperCase().trim()) {
      Alert.alert('Validation Error', 'Origin and destination stations cannot be the same.');
      return false;
    }
    return true;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      if (!p.name.trim()) {
        Alert.alert('Validation Error', `Please specify a name for Passenger #${i + 1}.`);
        return false;
      }
      if (!p.age || isNaN(p.age) || parseInt(p.age, 10) <= 0) {
        Alert.alert('Validation Error', `Please specify a valid age for Passenger #${i + 1}.`);
        return false;
      }
    }

    // Verify account holder is included
    const accountName = (currentUser?.name || '').toLowerCase().trim();
    const hasAccountHolder = passengers.some(p => p.name.toLowerCase().trim() === accountName);
    if (!hasAccountHolder) {
      Alert.alert(
        'Validation Error',
        `Account holder (${currentUser?.name || 'You'}) must be included in the passengers list.`
      );
      return false;
    }

    return true;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Stepper Header */}
      <View style={styles.stepperContainer}>
        <View style={styles.stepIndicatorRow}>
          <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]}>
            <Text style={styles.stepNum}>1</Text>
          </View>
          <View style={[styles.stepBar, step >= 2 && styles.stepBarActive]} />
          <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]}>
            <Text style={styles.stepNum}>2</Text>
          </View>
          <View style={[styles.stepBar, step >= 3 && styles.stepBarActive]} />
          <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]}>
            <Text style={styles.stepNum}>3</Text>
          </View>
        </View>
        <View style={styles.stepLabelRow}>
          <Text style={[styles.stepLabel, step === 1 && styles.stepLabelActive]}>Journey</Text>
          <Text style={[styles.stepLabel, step === 2 && styles.stepLabelActive]}>Passengers</Text>
          <Text style={[styles.stepLabel, step === 3 && styles.stepLabelActive]}>Urgency</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* STEP 1: Journey Details */}
        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Journey Details</Text>

            <Text style={styles.inputLabel}>From Station</Text>
            <TextInput
              style={styles.textInput}
              value={fromStation}
              onChangeText={setFromStation}
              placeholder="e.g. NDLS"
              autoCapitalize="characters"
              maxLength={7}
            />

            <Text style={styles.inputLabel}>To Station</Text>
            <TextInput
              style={styles.textInput}
              value={toStation}
              onChangeText={setToStation}
              placeholder="e.g. MMCT"
              autoCapitalize="characters"
              maxLength={7}
            />

            <Text style={styles.inputLabel}>Travel Date</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              activeOpacity={0.75}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.pickerButtonText}>{travelDate ? travelDate.toDateString() : 'Select Date'}</Text>
            </TouchableOpacity>

            {showDatePicker && travelDate && (
              <DateTimePicker
                value={travelDate}
                mode="date"
                minimumDate={minDate || undefined}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setTravelDate(selectedDate);
                }}
              />
            )}

            <Text style={styles.inputLabel}>Class</Text>
            <View style={styles.dropdownRow}>
              {CLASSES.map((cls) => (
                <TouchableOpacity
                  key={cls}
                  style={[styles.dropdownOption, trainClass === cls && styles.dropdownOptionActive]}
                  activeOpacity={0.75}
                  onPress={() => setTrainClass(cls)}
                >
                  <Text style={[styles.dropdownOptionText, trainClass === cls && styles.dropdownOptionTextActive]}>
                    {cls}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Train Number (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={trainNumber}
              onChangeText={setTrainNumber}
              placeholder="e.g. 12951"
              keyboardType="numeric"
              maxLength={6}
            />

            <TouchableOpacity
              style={styles.nextButton}
              activeOpacity={0.75}
              onPress={() => {
                if (validateStep1()) setStep(2);
              }}
            >
              <Text style={styles.nextButtonText}>Next: Passenger Details</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: Passengers */}
        {step === 2 && (
          <View style={styles.card}>
            <View style={styles.passengerHeaderRow}>
              <Text style={styles.cardTitle}>Passengers List</Text>
              <Text style={styles.passengerCount}>{passengers.length}/6</Text>
            </View>

            {passengers.map((p, idx) => (
              <View key={idx} style={styles.passengerItem}>
                <View style={styles.passengerItemHeader}>
                  <Text style={styles.passengerItemTitle}>Passenger #{idx + 1}</Text>
                  {passengers.length > 1 && (
                    <TouchableOpacity
                      onPress={() => handleRemovePassenger(idx)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={p.name}
                  onChangeText={(val) => handleUpdatePassenger(idx, 'name', val)}
                  placeholder="As in ID card"
                />

                <View style={styles.passengerGrid}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={styles.inputLabel}>Age</Text>
                    <TextInput
                      style={styles.textInput}
                      value={p.age}
                      onChangeText={(val) => handleUpdatePassenger(idx, 'age', val)}
                      placeholder="e.g. 28"
                      keyboardType="numeric"
                      maxLength={3}
                    />
                  </View>
                  <View style={{ flex: 1.5 }}>
                    <Text style={styles.inputLabel}>Gender</Text>
                    <View style={styles.miniDropdownRow}>
                      {GENDERS.map(g => (
                        <TouchableOpacity
                          key={g}
                          style={[styles.miniDropdownOption, p.gender === g && styles.miniDropdownOptionActive]}
                          activeOpacity={0.75}
                          onPress={() => handleUpdatePassenger(idx, 'gender', g)}
                        >
                          <Text style={[styles.miniDropdownText, p.gender === g && styles.miniDropdownTextActive]}>
                            {g}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                <Text style={styles.inputLabel}>Berth Preference</Text>
                <View style={styles.berthRow}>
                  {BERTHS.map(b => (
                    <TouchableOpacity
                      key={b}
                      style={[styles.berthOption, p.berth_preference === b && styles.berthOptionActive]}
                      activeOpacity={0.75}
                      onPress={() => handleUpdatePassenger(idx, 'berth_preference', b)}
                    >
                      <Text style={[styles.berthText, p.berth_preference === b && styles.berthTextActive]}>
                        {b}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={styles.addBtn}
              activeOpacity={0.75}
              onPress={handleAddPassenger}
            >
              <Text style={styles.addBtnText}>+ Add Passenger</Text>
            </TouchableOpacity>

            <View style={styles.navigationButtonsRow}>
              <TouchableOpacity
                style={styles.backButton}
                activeOpacity={0.75}
                onPress={() => setStep(1)}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.nextButtonPrimary}
                activeOpacity={0.75}
                onPress={() => {
                  if (validateStep2()) setStep(3);
                }}
              >
                <Text style={styles.nextButtonText}>Next: Urgency</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 3: Urgency */}
        {step === 3 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Urgency & Priority Details</Text>

            <View style={styles.urgentToggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Is this travel urgent?</Text>
                <Text style={styles.toggleSubtitle}>Provide details to prioritize booking queue</Text>
              </View>
              <Switch
                value={isUrgent}
                onValueChange={setIsUrgent}
                trackColor={{ false: '#DDD', true: COLORS.brandOrange }}
                thumbColor="#FFF"
              />
            </View>

            {isUrgent && (
              <View style={styles.urgencySubform}>
                <Text style={styles.inputLabel}>Urgency Reason</Text>
                {REASONS.map((r) => (
                  <TouchableOpacity
                    key={r.value}
                    style={[styles.reasonCard, urgencyReason === r.value && styles.reasonCardActive]}
                    activeOpacity={0.75}
                    onPress={() => setUrgencyReason(r.value)}
                  >
                    <Text style={[styles.reasonLabel, urgencyReason === r.value && styles.reasonLabelActive]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}

                <Text style={styles.inputLabel}>Supporting Document (Urgency Proof)</Text>
                <TouchableOpacity
                  style={styles.uploadBtn}
                  activeOpacity={0.75}
                  onPress={handlePickDocument}
                >
                  <Text style={styles.uploadBtnText}>
                    {urgencyDocUrl ? '📄 Document Selected (Change)' : '📁 Pick Urgency Document'}
                  </Text>
                </TouchableOpacity>

                {urgencyDocUrl ? (
                  <Text style={styles.docPathText}>Saved path: {urgencyDocUrl.substring(0, 45)}...</Text>
                ) : null}

                {/* Score Preview */}
                <View style={styles.scorePreviewCard}>
                  <Text style={styles.scoreTitle}>Urgency Priority Score</Text>
                  <Text style={styles.scoreVal}>{calculateUrgencyScore().toFixed(1)} / 10.0</Text>
                  <Text style={styles.scoreDesc}>
                    Based on the chosen emergency category (+1 bonus for providing verifying documents).
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.navigationButtonsRow}>
              <TouchableOpacity
                style={styles.backButton}
                activeOpacity={0.75}
                onPress={() => setStep(2)}
                disabled={loading}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                activeOpacity={0.75}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Pre-fill Details</Text>
                )}
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
  stepperContainer: {
    backgroundColor: COLORS.pageWhite,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.dividerGrey
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32
  },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center'
  },
  stepDotActive: { backgroundColor: COLORS.brandOrange },
  stepNum: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  stepBar: { flex: 1, height: 4, backgroundColor: '#DDD' },
  stepBarActive: { backgroundColor: COLORS.brandOrange },
  stepLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 8
  },
  stepLabel: { fontSize: 12, color: '#888', width: 80, textAlign: 'center' },
  stepLabelActive: { color: COLORS.brandOrange, fontWeight: '700' },
  errorBox: {
    backgroundColor: '#FFF0E6',
    borderWidth: 1,
    borderColor: COLORS.brandOrange,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16
  },
  errorText: { color: COLORS.brandOrange, fontSize: 14, fontWeight: '600' },
  card: { backgroundColor: COLORS.pageWhite, borderRadius: 14, padding: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width:0, height:2 }, shadowOpacity:0.1, shadowRadius:4 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.brandNavy, marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.brandNavy, marginBottom: 8, marginTop: 12 },
  textInput: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, fontSize: 15 },
  pickerButton: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 14, backgroundColor: '#FFF' },
  pickerButtonText: { fontSize: 15, color: '#333' },
  dropdownRow: { flexDirection: 'row', gap: 6, marginVertical: 8, flexWrap: 'wrap' },
  dropdownOption: { borderWidth: 1, borderColor: '#DDD', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#FFF' },
  dropdownOptionActive: { borderColor: COLORS.brandOrange, backgroundColor: '#FFF0E6' },
  dropdownOptionText: { fontSize: 13, color: '#555' },
  dropdownOptionTextActive: { color: COLORS.brandOrange, fontWeight: 'bold' },
  nextButton: { backgroundColor: COLORS.brandOrange, padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  nextButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  passengerHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  passengerCount: { color: COLORS.brandOrange, fontWeight: 'bold' },
  passengerItem: { borderBottomWidth: 1, borderBottomColor: '#EEE', paddingBottom: 16, marginBottom: 16 },
  passengerItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  passengerItemTitle: { fontSize: 14, fontWeight: 'bold', color: '#666' },
  removeText: { color: '#D32F2F', fontSize: 12, fontWeight: 'bold' },
  passengerGrid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  miniDropdownRow: { flexDirection: 'row', gap: 4 },
  miniDropdownOption: { borderWidth: 1, borderColor: '#DDD', borderRadius: 6, paddingVertical: 10, paddingHorizontal: 8, backgroundColor: '#FFF' },
  miniDropdownOptionActive: { borderColor: COLORS.brandOrange, backgroundColor: '#FFF0E6' },
  miniDropdownText: { fontSize: 11, color: '#555' },
  miniDropdownTextActive: { color: COLORS.brandOrange, fontWeight: 'bold' },
  berthRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  berthOption: { borderWidth: 1, borderColor: '#DDD', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: '#FFF' },
  berthOptionActive: { borderColor: COLORS.brandOrange, backgroundColor: '#FFF0E6' },
  berthText: { fontSize: 11, color: '#555' },
  berthTextActive: { color: COLORS.brandOrange, fontWeight: 'bold' },
  addBtn: { borderWidth: 1, borderColor: COLORS.brandOrange, borderRadius: 8, padding: 12, alignItems: 'center', marginVertical: 12 },
  addBtnText: { color: COLORS.brandOrange, fontWeight: '700' },
  navigationButtonsRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  backButton: { flex: 1, borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 16, alignItems: 'center', backgroundColor: '#FFF' },
  backButtonText: { color: '#555', fontSize: 16, fontWeight: '700' },
  nextButtonPrimary: { flex: 2, backgroundColor: COLORS.brandOrange, borderRadius: 8, padding: 16, alignItems: 'center' },
  submitBtn: { flex: 2, backgroundColor: COLORS.brandOrange, borderRadius: 8, padding: 16, alignItems: 'center' },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  urgentToggleRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EEE', paddingBottom: 16, marginBottom: 16 },
  toggleTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.brandNavy },
  toggleSubtitle: { fontSize: 12, color: '#666', marginTop: 2 },
  urgencySubform: { marginTop: 8 },
  reasonCard: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 14, backgroundColor: '#FFF', marginBottom: 8 },
  reasonCardActive: { borderColor: COLORS.brandOrange, backgroundColor: '#FFF0E6' },
  reasonLabel: { fontSize: 14, color: '#555' },
  reasonLabelActive: { color: COLORS.brandOrange, fontWeight: 'bold' },
  uploadBtn: { borderStyle: 'dashed', borderWidth: 2, borderColor: COLORS.brandOrange, borderRadius: 8, padding: 16, alignItems: 'center', marginVertical: 12, backgroundColor: '#FFF9F5' },
  uploadBtnText: { color: COLORS.brandOrange, fontWeight: '700' },
  docPathText: { color: '#666', fontSize: 11, fontStyle: 'italic', marginBottom: 12 },
  scorePreviewCard: { backgroundColor: '#F0F7FF', padding: 16, borderRadius: 10, borderLeftWidth: 4, borderLeftColor: '#0066CC', marginTop: 16 },
  scoreTitle: { fontSize: 14, fontWeight: 'bold', color: '#0066CC' },
  scoreVal: { fontSize: 24, fontWeight: 'bold', color: '#0066CC', marginVertical: 6 },
  scoreDesc: { fontSize: 12, color: '#555' }
});
