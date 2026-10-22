import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1E3A8A',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '700',
        },
        tabBarActiveTintColor: '#1E3A8A',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'กิจกรรม มข. หนองคาย',
          tabBarLabel: 'หน้าหลัก',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'แผนที่กิจกรรม มหาวิทยาลัย',
          tabBarLabel: 'แผนที่',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'ประชาสัมพันธ์กิจกรรม',
          tabBarLabel: 'สร้างกิจกรรม',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size + 6} color="#1E3A8A" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'ข้อมูลส่วนตัว & กิจกรรม',
          tabBarLabel: 'โปรไฟล์',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
