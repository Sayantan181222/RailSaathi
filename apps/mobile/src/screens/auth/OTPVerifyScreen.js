import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRailSaathi } from '../../context/RailSaathiContext';
import { COLORS, SCREENS } from '../../constants';
import apiClient from '../../services/apiClient';

export default function OTPVerifyScreen({ route, navigation }) {
  const { phone } = route.params || { phone: '' };
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useRailSaathi();

  const handleVerify = async () => {
    if (code.length !== 6 || isNaN(code)) {
      setError('Please enter a 6-digit verification code.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      // Hit OTP verification endpoint
      const response = await apiClient.post('/auth/verify-otp', {
        phone,
        firebase_id_token: `mock_firebase_otp_token_for_${code}`
      });

      const { data } = response.data;
      if (data && data.token) {
        // If user is brand new (doesn't have a name), go to profile setup
        if (data.user && !data.user.name) {
          // Navigate to Profile Setup stack
          navigation.navigate(SCREENS.PROFILE_SETUP, { token: data.token, user: data.user });
        } else {
          // Expose to context and complete login
          await login(data.token, data.user);
        }
      }
    } catch (err) {
      console.warn('Verify OTP failed:', err.message);
      const isNetErr = err.code === 'ECONNABORTED' || !err.response;
      setError(isNetErr ? 'Could not connect. Check your connection.' : 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Verification Code</Text>
      <Text style={styles.subheading}>Enter the 6-digit code sent to +91 {phone}</Text>

      <TextInput
        style={styles.input}
        keyboardType="numeric"
        maxLength={6}
        placeholder="123456"
        placeholderTextColor={COLORS.placeholderText}
        value={code}
        onChangeText={(val) => {
          setCode(val);
          if (error) setError('');
        }}
      />

      {error ? (
        <View style={{ width: '100%', marginBottom: 16 }}>
          <Text style={styles.errorText}>{error}</Text>
          {error === 'Could not connect. Check your connection.' && (
            <TouchableOpacity style={styles.retryBtn} onPress={handleVerify}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.button}
        disabled={loading}
        activeOpacity={0.75}
        onClick={handleVerify}
        onPress={handleVerify}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Verify & Proceed</Text>
        )}
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
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.dividerGrey,
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 54,
    fontSize: 20,
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: 16,
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
  retryBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.brandOrange,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 4,
  },
  retryBtnText: {
    color: COLORS.brandOrange,
    fontSize: 15,
    fontWeight: '700',
  },
});
