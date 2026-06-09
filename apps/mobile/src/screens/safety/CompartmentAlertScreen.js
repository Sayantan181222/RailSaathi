import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { postCompartmentAlert } from './services/safetyService';
import { CheckCircle2 } from 'lucide-react-native';

// Mock context fallback
import { useRailSaathi } from '../../context/RailSaathiContext'; 

const ALERT_TYPES = [
  { id: 'MALE_OCCUPANT', label: 'Male Occupant' },
  { id: 'HARASSMENT', label: 'Harassment' },
  { id: 'THREATENING_BEHAVIOUR', label: 'Threatening Behaviour' },
];

export default function CompartmentAlertScreen() {
  const navigation = useNavigation();
  const { activeJourney } = useRailSaathi() || {};

  const [trainNumber, setTrainNumber] = useState(activeJourney?.train_number || '');
  const [coach, setCoach] = useState(activeJourney?.coach || '');
  const [alertSubtype, setAlertSubtype] = useState(ALERT_TYPES[0].id);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (activeJourney) {
      setTrainNumber(activeJourney.train_number || '');
      setCoach(activeJourney.coach || '');
    }
  }, [activeJourney]);

  const handleSubmit = async () => {
    if (!trainNumber || !coach) return;
    setLoading(true);

    try {
      await postCompartmentAlert({
        train_number: trainNumber,
        coach: coach,
        alert_subtype: alertSubtype,
        berth: activeJourney?.berth || ''
      });
      
      setSuccess(true);
      setTimeout(() => {
        navigation.goBack();
      }, 3000);
    } catch (e) {
      console.warn('Failed to post compartment alert:', e);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.successContainer}>
        <CheckCircle2 color="#2E7D32" size={80} />
        <Text style={styles.successText}>Alert sent to RPF at next station</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Compartment Alert</Text>

      <View style={styles.card}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Train Number</Text>
          <TextInput
            style={styles.input}
            value={trainNumber}
            onChangeText={setTrainNumber}
            placeholder="e.g. 12951"
            editable={!activeJourney?.train_number}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Coach</Text>
          <TextInput
            style={styles.input}
            value={coach}
            onChangeText={setCoach}
            placeholder="e.g. S4, B2"
            editable={!activeJourney?.coach}
          />
        </View>

        <Text style={styles.label}>Issue Type</Text>
        {ALERT_TYPES.map(type => (
          <TouchableOpacity 
            key={type.id} 
            style={styles.radioRow}
            onPress={() => setAlertSubtype(type.id)}
          >
            <View style={styles.radioOuter}>
              {alertSubtype === type.id && <View style={styles.radioInner} />}
            </View>
            <Text style={styles.radioLabel}>{type.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity 
        style={[styles.submitBtn, (!trainNumber || !coach) && styles.submitBtnDisabled]} 
        onPress={handleSubmit}
        disabled={loading || !trainNumber || !coach}
      >
        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitBtnText}>Submit Alert</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111111',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#555555',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111111',
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  radioOuter: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E8621A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioInner: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: '#E8621A',
  },
  radioLabel: {
    fontSize: 16,
    color: '#111111',
  },
  submitBtn: {
    backgroundColor: '#E8621A',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: '#CCCCCC',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  successContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  successText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
  }
});
