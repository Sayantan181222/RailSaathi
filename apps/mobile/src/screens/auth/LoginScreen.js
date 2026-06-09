import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SCREENS } from '../../constants';

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const handleSendOTP = () => {
    if (phone.length !== 10 || isNaN(phone)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setError('');
    navigation.navigate(SCREENS.OTP_VERIFY, { phone });
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoIcon}>🚆</Text>
        <Text style={styles.logoText}>
          <Text style={styles.logoRail}>Rail</Text>
          <Text style={styles.logoSaathi}>Saathi</Text>
        </Text>
      </View>

      <Text style={styles.heading}>Enter Mobile Number</Text>
      <Text style={styles.subheading}>We will send a 6-digit OTP code to verify your identity</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.countryCode}>+91</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          maxLength={10}
          placeholder="98765 43210"
          placeholderTextColor={COLORS.placeholderText}
          value={phone}
          onChangeText={(val) => {
            setPhone(val);
            if (error) setError('');
          }}
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} activeOpacity={0.75} onClick={handleSendOTP} onPress={handleSendOTP}>
        <Text style={styles.buttonText}>Send OTP</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 48,
    justifyContent: 'center',
  },
  logoIcon: {
    fontSize: 28,
    marginRight: 8,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
  },
  logoRail: {
    color: COLORS.brandNavy,
  },
  logoSaathi: {
    color: COLORS.brandOrange,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.dividerGrey,
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 16,
  },
  countryCode: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  errorText: {
    color: '#CC0000',
    fontSize: 13,
    marginBottom: 16,
    fontWeight: '500',
  },
  button: {
    backgroundColor: COLORS.brandOrange,
    borderRadius: 12,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
