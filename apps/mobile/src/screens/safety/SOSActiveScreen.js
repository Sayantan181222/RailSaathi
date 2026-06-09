import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { updateSOSAudio } from './services/safetyService';

import { useRailSaathi } from '../../context/RailSaathiContext';

// Supabase imports for storage upload
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'mock-key';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function SOSActiveScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { eventPromise } = route.params || {};

  const { activeJourney: contextJourney } = useRailSaathi() || {};
  const activeJourney = contextJourney || { train_number: '12951', coach: 'B4', berth: '32', boarding_station: 'NDLS' };

  const [event, setEvent] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [recording, setRecording] = useState(null);
  const [isDone, setIsDone] = useState(false);

  // Pulse animation for "SOS ACTIVE"
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Resolve event promise
    if (eventPromise) {
      eventPromise
        .then(res => {
          if (res?.data?.data) {
            setEvent(res.data.data);
          }
        })
        .catch(err => console.error('Failed to create SOS event:', err));
    }

    // 2. Start Pulse Animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true })
      ])
    ).start();

    // 3. Setup Audio Recording
    let currentRecording = null;
    let timer = null;

    const startRecording = async () => {
      try {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording: newRec } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        currentRecording = newRec;
        setRecording(newRec);

        // 4. Start 60-second countdown
        timer = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              finishRecording(currentRecording);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

      } catch (err) {
        console.error('Failed to start recording', err);
      }
    };

    startRecording();

    return () => {
      if (timer) clearInterval(timer);
      if (currentRecording) {
        currentRecording.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  const finishRecording = async (activeRecording) => {
    if (!activeRecording) return;
    setIsDone(true);

    try {
      await activeRecording.stopAndUnloadAsync();
      const uri = activeRecording.getURI();

      if (!uri || !event) {
        // Fallback delay if event wasn't successfully resolved or no URI
        setTimeout(() => navigation.navigate('SafetyHomeScreen'), 2000);
        return;
      }

      // Read file and upload to Supabase
      const ext = uri.substring(uri.lastIndexOf('.') + 1) || 'm4a';
      const fileName = `${event.user_id}/${event.id}_${Date.now()}.${ext}`;

      const response = await fetch(uri);
      const blob = await response.blob();

      const { data, error } = await supabase.storage
        .from('sos-audio')
        .upload(fileName, blob, { contentType: `audio/${ext}` });

      if (data) {
        const { data: publicUrlData } = supabase.storage
          .from('sos-audio')
          .getPublicUrl(fileName);

        if (publicUrlData?.publicUrl) {
          await updateSOSAudio(event.id, publicUrlData.publicUrl);
        }
      } else if (error) {
        console.error('Supabase upload error:', error);
      }
    } catch (e) {
      console.error('Upload process failed:', e);
    } finally {
      setTimeout(() => {
        navigation.navigate('SafetyHomeScreen');
      }, 2000);
    }
  };

  const handleCancel = async () => {
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch (e) {}
    }
    navigation.navigate('SafetyHomeScreen', { cancelCooldown: true });
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        
        {/* Pulsing Header */}
        <View style={styles.headerContainer}>
          <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]} />
          <Text style={styles.titleText}>SOS ACTIVE</Text>
        </View>

        {isDone ? (
          <View style={styles.doneContainer}>
            <Text style={styles.doneIcon}>✓</Text>
            <Text style={styles.doneText}>Evidence recorded and secured</Text>
          </View>
        ) : (
          <View style={styles.recordingContainer}>
            <Text style={styles.countdown}>
              0:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
            </Text>
            <Text style={styles.recordingLabel}>Recording ends in</Text>
          </View>
        )}

        {/* Status Text */}
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>RPF has been alerted</Text>
          <Text style={styles.statusText}>
            SMS sent to {event?.sms_contacts_count ?? 'emergency'} contacts
          </Text>
        </View>

        {/* Journey Info */}
        <View style={styles.infoRow}>
          <Text style={styles.infoText}>Train: {activeJourney.train_number}</Text>
          <Text style={styles.infoText}>Coach: {activeJourney.coach}</Text>
          <Text style={styles.infoText}>Berth: {activeJourney.berth}</Text>
        </View>
      </View>

      {/* Cancel Button */}
      {!isDone && (
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
          <Text style={styles.cancelBtnText}>Cancel Alert</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#CC0000',
    padding: 24,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    height: 150,
    marginBottom: 40,
  },
  pulseCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  titleText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 2,
    zIndex: 10,
  },
  recordingContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  countdown: {
    fontFamily: 'monospace',
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  recordingLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    textTransform: 'uppercase',
  },
  doneContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  doneIcon: {
    fontSize: 64,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  doneText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statusBox: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginVertical: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
    paddingTop: 16,
  },
  infoText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  cancelBtn: {
    width: '100%',
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 20,
  },
  cancelBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  }
});
