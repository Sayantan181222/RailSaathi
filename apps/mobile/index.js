import { registerRootComponent } from 'expo';
import React from 'react';
import { RailSaathiProvider } from './src/context/RailSaathiContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function RootLayout() {
  return (
    <RailSaathiProvider>
      <AppNavigator />
    </RailSaathiProvider>
  );
}

registerRootComponent(RootLayout);
