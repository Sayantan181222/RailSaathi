// Set EXPO_PUBLIC_API_BASE_URL in .env for the deployed Render URL
// Use .env.local for local development (localhost:3000)
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

export const SCREENS = {
  LOGIN: 'Login',
  OTP_VERIFY: 'OTPVerify',
  PROFILE_SETUP: 'ProfileSetup',
  HOME: 'Home',
  TATKAL: 'Tatkal',
  COMPLAINTS: 'Complaints',
  SAFETY: 'Safety',
  STATION: 'Station',
};

export const COLORS = {
  brandOrange: '#E8621A',
  brandNavy: '#1A3557',
  pageWhite: '#FFFFFF',
  surfaceGrey: '#F5F5F5',
  dividerGrey: '#E0E0E0',
  textPrimary: '#111111',
  textSecondary: '#555555',
  placeholderText: '#AAAAAA',
};
