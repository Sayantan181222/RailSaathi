import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, Animated, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { AlertCircle } from 'lucide-react-native';
import { postSOS } from '../services/safetyService';

// Assuming the context is exported from a central provider in the app
// Fallback mock if not physically present in this scaffold yet
import { useRailSaathi } from '../../../context/RailSaathiContext'; 

const SOSButton = () => {
  const navigation = useNavigation();
  const { currentUser, activeJourney } = useRailSaathi() || {};

  const [isActive, setIsActive] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [isDisabled, setIsDisabled] = useState(false);

  // Animation values for the 3 concentric rings
  const anim1 = useRef(new Animated.Value(1)).current;
  const anim2 = useRef(new Animated.Value(1)).current;
  const anim3 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isDisabled) {
      anim1.setValue(1);
      anim2.setValue(1);
      anim3.setValue(1);
      return;
    }

    const createLoop = (anim, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 1.0, duration: 800, useNativeDriver: true })
        ])
      );
    };

    const a1 = createLoop(anim1, 0);
    const a2 = createLoop(anim2, 300);
    const a3 = createLoop(anim3, 600);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [isDisabled]);

  const handlePress = () => {
    if (isDisabled) return;

    Alert.alert(
      "Send SOS Alert?",
      "RPF will be notified and your emergency contacts will receive SMS.",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            setIsDisabled(true);
            setTimeout(() => {
              setIsDisabled(false);
            }, 5000);
          }
        },
        {
          text: "Send Alert",
          style: "destructive",
          onPress: handleSendAlert
        }
      ]
    );
  };

  const handleSendAlert = async () => {
    setIsActive(true);
    let lat = null;
    let lng = null;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        lat = location.coords.latitude;
        lng = location.coords.longitude;
      }
    } catch (error) {
      console.warn("Location fetch failed:", error);
    }

    const payload = {
      lat: lat || 0,
      lng: lng || 0,
      alert_subtype: 'PERSONAL_SAFETY',
      train_number: activeJourney?.train_number,
      coach: activeJourney?.coach,
      berth: activeJourney?.berth
    };

    // Do NOT await before navigating
    const eventPromise = postSOS(payload);
    
    navigation.navigate('SOSActive', { eventPromise });
  };

  return (
    <View style={styles.container}>
      <View style={styles.buttonWrapper}>
        {/* Pulsing Rings */}
        {!isDisabled && (
          <>
            <Animated.View style={[styles.ring, { transform: [{ scale: anim1 }], backgroundColor: 'rgba(204, 0, 0, 0.3)' }]} />
            <Animated.View style={[styles.ring, { transform: [{ scale: anim2 }], backgroundColor: 'rgba(204, 0, 0, 0.2)' }]} />
            <Animated.View style={[styles.ring, { transform: [{ scale: anim3 }], backgroundColor: 'rgba(204, 0, 0, 0.1)' }]} />
          </>
        )}

        {/* Core Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.button, isDisabled && styles.buttonDisabled]}
          onPress={handlePress}
          disabled={isDisabled}
        >
          {isDisabled ? (
            <Text style={styles.cooldownText}>COOLDOWN</Text>
          ) : (
            <AlertCircle stroke="#FFFFFF" width={48} height={48} />
          )}
        </TouchableOpacity>
      </View>

      <Text style={[styles.label, isDisabled && styles.labelDisabled]}>
        SOS — EMERGENCY ASSISTANCE
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  buttonWrapper: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  ring: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#CC0000',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#CC0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 10,
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
    shadowColor: '#000',
    elevation: 0,
  },
  cooldownText: {
    color: '#888888',
    fontWeight: 'bold',
    fontSize: 12,
  },
  label: {
    marginTop: 16,
    color: '#CC0000',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelDisabled: {
    color: '#888888',
  }
});

export default SOSButton;
