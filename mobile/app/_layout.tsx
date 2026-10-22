import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../context/AuthContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: '#1E3A8A',
            },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: {
              fontWeight: '700',
            },
            headerBackTitle: 'ย้อนกลับ',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="item/[id]"
            options={{
              title: 'รายละเอียดกิจกรรม',
              headerShown: true,
            }}
          />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
