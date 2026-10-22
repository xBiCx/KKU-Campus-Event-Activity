import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Image, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function IndexScreen() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [user, isLoading]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#882D17" />
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <Image
            source={require('../assets/kku_nong_logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.appTitle}>KKU Campus Event</Text>
        <Text style={styles.campusSubtitle}>มหาวิทยาลัยขอนแก่น วิทยาเขตหนองคาย</Text>
      </View>

      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.text}>กำลังเข้าสู่ระบบ...</Text>
      </View>

      <Text style={styles.footerText}>Khon Kaen University • Nong Khai Campus</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#A73B24', // สีดินแดง มข. (KKU Brick Orange / Red)
    paddingVertical: 50,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: '25%',
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    padding: 10,
    marginBottom: 20,
  },
  logoImage: {
    width: 85,
    height: 85,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  campusSubtitle: {
    fontSize: 14,
    color: '#FED7AA',
    fontWeight: '600',
    marginTop: 6,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 12,
  },
  text: {
    fontSize: 14,
    color: '#FFE4E6',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '400',
  },
});
