import React from 'react';
import { RailSaathiProvider } from '../context/RailSaathiContext';
import AppNavigator from '../navigation/AppNavigator';

export default function RootLayout() {
  return (
    <RailSaathiProvider>
      <AppNavigator />
    </RailSaathiProvider>
  );
}
