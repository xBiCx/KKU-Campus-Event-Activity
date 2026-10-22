import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Vibration,
  Image,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api, { updateActiveBaseUrl } from '../../services/api';
import { StorageService } from '../../services/storage';
import { CampusEvent, NotificationItem } from '../../types';
import { ItemCard } from '../../components/ItemCard';

export default function ProfileScreen() {
  const { user, logout, refreshProfile, updateUser } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'registered' | 'my' | 'favorites'>('registered');
  const [myEvents, setMyEvents] = useState<CampusEvent[]>([]);
  const [registeredEvents, setRegisteredEvents] = useState<CampusEvent[]>([]);
  const [favoriteEvents, setFavoriteEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  // Notifications modal
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifModal, setShowNotifModal] = useState(false);

  // Server IP Modal
  const [showIpModal, setShowIpModal] = useState(false);
  const [serverIp, setServerIp] = useState('10.238.177.249');

  // Test Notification Modal & Countdown State
  const [showTestModal, setShowTestModal] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState('10');
  const [targetUsername, setTargetUsername] = useState('xBiCx');
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);

  // In-App Pop-up Banner for Forced Notification
  const [popupNotification, setPopupNotification] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  const router = useRouter();

  const loadUserData = async () => {
    setLoading(true);
    try {
      await refreshProfile();

      // Fetch user's created events
      const res = await api.get('/events/my');
      setMyEvents(res.data.events || res.data.items || []);

      // Fetch user's registered events (with pre-event alerts)
      const regRes = await api.get('/events/registered');
      setRegisteredEvents(regRes.data.events || regRes.data.items || []);

      // Fetch bookmarked favorites
      const favIds = await StorageService.getFavorites();
      if (favIds.length > 0) {
        const allRes = await api.get('/events');
        const allEvents: CampusEvent[] = allRes.data.events || allRes.data.items || [];
        setFavoriteEvents(allEvents.filter((i) => favIds.includes(i.id)));
      } else {
        setFavoriteEvents([]);
      }

      // Fetch notifications
      const notifRes = await api.get('/notifications');
      setNotifications(notifRes.data.notifications || []);
    } catch (e) {
      console.warn('Error loading profile data', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadUserData();
      StorageService.getServerIp().then((ip) => {
        if (ip) setServerIp(ip);
      });
    }, [])
  );

  const handleLogout = () => {
    Alert.alert('ออกจากระบบ', 'คุณต้องการออกจากระบบใช่หรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ออกจากระบบ',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleSaveIp = async () => {
    const trimmed = serverIp.trim();
    await StorageService.setServerIp(trimmed);
    updateActiveBaseUrl(trimmed);
    setShowIpModal(false);
    Alert.alert('สำเร็จ', `บันทึก IP Server: ${trimmed} เรียบร้อย`);
  };

  // Upload avatar image file to backend
  const uploadAvatarImage = async (uri: string) => {
    setUpdatingAvatar(true);
    try {
      const filename = uri.split('/').pop() || 'avatar.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const fileType = match ? `image/${match[1]}` : `image/jpeg`;

      const formData = new FormData();
      formData.append('image', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: filename,
        type: fileType,
      } as any);

      const res = await api.post('/auth/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data?.user) {
        await updateUser(res.data.user);
        Alert.alert('สำเร็จ', 'เปลี่ยนรูปโปรไฟล์เรียบร้อยแล้ว!');
      }
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      const msg = error.response?.data?.message || 'ไม่สามารถอัปโหลดรูปโปรไฟล์ได้ โปรดลองอีกครั้ง';
      Alert.alert('เกิดข้อผิดพลาด', msg);
    } finally {
      setUpdatingAvatar(false);
    }
  };

  const handlePickFromGallery = async () => {
    setShowAvatarModal(false);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตให้แอปเข้าถึงแกลเลอรีรูปภาพ');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        await uploadAvatarImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Gallery picker error:', err);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเลือกรูปภาพจากคลังได้');
    }
  };

  const handleTakeWithCamera = async () => {
    setShowAvatarModal(false);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตให้แอปเข้าถึงกล้องถ่ายภาพ');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        await uploadAvatarImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Camera error:', err);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถถ่ายรูปได้');
    }
  };

  // Helper to force display in-app notification popup with vibration
  const triggerInAppNotification = (title: string, message: string) => {
    try {
      Vibration.vibrate([0, 400, 200, 400]);
    } catch (e) {
      // Ignore vibration error on unsupported platforms
    }

    setPopupNotification({
      visible: true,
      title,
      message,
    });
  };

  // Trigger test notification with countdown
  const handleStartTestNotification = async () => {
    const sec = parseInt(countdownSeconds, 10);
    if (isNaN(sec) || sec < 0) {
      Alert.alert('ข้อผิดพลาด', 'กรุณาระบุจำนวนวินาทีเป็นตัวเลข');
      return;
    }

    const notifTitle = `⏰ [แจ้งเตือนทดสอบ] กิจกรรมกำลังจะเริ่มแล้ว!`;
    const notifMessage = `สวัสดีคุณ ${targetUsername}, กิจกรรม "ติวเข้มก่อนสอบ Midterm" จะเริ่มในอีกไม่กี่นาที ที่อาคารเรียนรวม!`;

    try {
      // 1. Call Backend to save in database with countdown
      await api.post('/notifications/test', {
        username: targetUsername.trim(),
        seconds: sec,
        title: notifTitle,
        message: notifMessage,
      });

      setShowTestModal(false);

      if (sec === 0) {
        // Immediate force notification
        triggerInAppNotification(notifTitle, notifMessage);
        loadUserData();
      } else {
        // Start Countdown
        setIsCountingDown(true);
        setRemainingTime(sec);

        const interval = setInterval(() => {
          setRemainingTime((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              setIsCountingDown(false);

              // Force display notification popup on screen!
              triggerInAppNotification(
                `⏰ [ครบเวลานับถอยหลัง ${sec}s] กิจกรรมกำลังจะเริ่มแล้ว!`,
                notifMessage
              );

              // Refresh list
              setTimeout(loadUserData, 1000);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        Alert.alert(
          'เริ่มนับถอยหลังแล้ว!',
          `กำลังนับถอยหลัง ${sec} วินาทีเพื่อส่งการแจ้งเตือนไปยังผู้ใช้ "${targetUsername}"`
        );
      }
    } catch (error: any) {
      console.error('Error starting test notification:', error);
      const msg = error.response?.data?.message || 'ไม่สามารถเริ่มการแจ้งเตือนทดสอบได้';
      Alert.alert('เกิดข้อผิดพลาด', msg);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getActiveData = () => {
    if (activeSubTab === 'registered') return registeredEvents;
    if (activeSubTab === 'my') return myEvents;
    return favoriteEvents;
  };

  return (
    <View style={styles.container}>
      {/* Forced In-App Notification Popup (Head-Up Banner) */}
      {popupNotification.visible && (
        <View style={styles.popupNotificationCard}>
          <View style={styles.popupLeftIcon}>
            <Ionicons name="notifications" size={26} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.popupTag}>CAMPUS EVENT ALERT</Text>
              <TouchableOpacity onPress={() => setPopupNotification((p) => ({ ...p, visible: false }))}>
                <Ionicons name="close" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.popupTitle}>{popupNotification.title}</Text>
            <Text style={styles.popupMessage}>{popupNotification.message}</Text>
          </View>
        </View>
      )}

      {/* Active Countdown Banner */}
      {isCountingDown && (
        <View style={styles.countdownBanner}>
          <Ionicons name="timer-outline" size={20} color="#FFFFFF" />
          <Text style={styles.countdownBannerText}>
            กำลังนับถอยหลังแจ้งเตือน ({targetUsername}): เหลืออีก {remainingTime} วินาที...
          </Text>
        </View>
      )}

      {/* Profile Header */}
      <View style={styles.headerCard}>
        <View style={styles.userRow}>
          <TouchableOpacity
            style={styles.avatarTouchable}
            activeOpacity={0.8}
            onPress={() => setShowAvatarModal(true)}
            disabled={updatingAvatar}
          >
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
            <View style={styles.avatarBadge}>
              {updatingAvatar ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>
          <View style={styles.userInfo}>
            <Text style={styles.username}>{user?.username || 'ผู้ใช้'}</Text>
            <Text style={styles.email}>{user?.email || 'email@kku.ac.th'}</Text>
            <Text style={styles.roleText}>มหาวิทยาลัยขอนแก่น วิทยาเขตหนองคาย</Text>
          </View>

          {/* Notification Bell */}
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => setShowNotifModal(true)}
          >
            <Ionicons name="notifications-outline" size={24} color="#1E3A8A" />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: '#2563EB' }]}>
              {user?.stats?.registered_count || registeredEvents.length || 0}
            </Text>
            <Text style={styles.statLabel}>ลงทะเบียนไว้</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: '#059669' }]}>
              {user?.stats?.my_events_count || myEvents.length || 0}
            </Text>
            <Text style={styles.statLabel}>กิจกรรมที่จัด</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: '#7C3AED' }]}>
              {user?.stats?.completed_count || 0}
            </Text>
            <Text style={styles.statLabel}>เสร็จสิ้นแล้ว</Text>
          </View>
        </View>
      </View>

      {/* Sub tabs selector */}
      <View style={styles.tabSelector}>
        <TouchableOpacity
          style={[styles.subTab, activeSubTab === 'registered' && styles.activeSubTab]}
          onPress={() => setActiveSubTab('registered')}
        >
          <Text
            style={[styles.subTabText, activeSubTab === 'registered' && styles.activeSubTabText]}
          >
            รอเข้าร่วม ({registeredEvents.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTab, activeSubTab === 'my' && styles.activeSubTab]}
          onPress={() => setActiveSubTab('my')}
        >
          <Text
            style={[styles.subTabText, activeSubTab === 'my' && styles.activeSubTabText]}
          >
            งานที่ฉันจัด ({myEvents.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTab, activeSubTab === 'favorites' && styles.activeSubTab]}
          onPress={() => setActiveSubTab('favorites')}
        >
          <Text
            style={[styles.subTabText, activeSubTab === 'favorites' && styles.activeSubTabText]}
          >
            บันทึกไว้ ({favoriteEvents.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
        </View>
      ) : (
        <FlatList
          data={getActiveData()}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              onPress={() => router.push(`/item/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name={
                  activeSubTab === 'registered'
                    ? 'notifications-off-outline'
                    : activeSubTab === 'my'
                    ? 'calendar-clear-outline'
                    : 'bookmark-outline'
                }
                size={48}
                color="#CBD5E1"
              />
              <Text style={styles.emptyText}>
                {activeSubTab === 'registered'
                  ? 'คุณยังไม่ได้ลงทะเบียนกิจกรรมใดๆ\n(กดปุ่มลงทะเบียนในหน้ากิจกรรมเพื่อรับการแจ้งเตือน)'
                  : activeSubTab === 'my'
                  ? 'คุณยังไม่ได้สร้างประกาศกิจกรรม'
                  : 'ยังไม่มีกิจกรรมที่คุณกดบันทึกไว้'}
              </Text>
            </View>
          }
          ListFooterComponent={
            <View style={styles.footerSection}>
              {/* Special Test Notification Button */}
              <TouchableOpacity
                style={styles.testNotifBtn}
                onPress={() => setShowTestModal(true)}
              >
                <Ionicons name="timer" size={20} color="#FFFFFF" />
                <Text style={styles.testNotifBtnText}>
                  🔔 ทดสอบการแจ้งเตือน (ตั้งเวลานับถอยหลังให้ xBiCx)
                </Text>
              </TouchableOpacity>

              {/* Settings / Change Server IP */}
              <TouchableOpacity
                style={styles.settingBtn}
                onPress={() => setShowIpModal(true)}
              >
                <Ionicons name="settings-outline" size={18} color="#475569" />
                <Text style={styles.settingBtnText}>ตั้งค่า IP Backend ({serverIp})</Text>
              </TouchableOpacity>

              {/* Logout Button */}
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#DC2626" />
                <Text style={styles.logoutBtnText}>ออกจากระบบ</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Test Notification Countdown Modal */}
      <Modal visible={showTestModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="timer-outline" size={24} color="#2563EB" />
                <Text style={styles.modalTitle}>ทดสอบการแจ้งเตือนกิจกรรม</Text>
              </View>
              <TouchableOpacity onPress={() => setShowTestModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 12, lineHeight: 18 }}>
              ระบบจะจำลองการส่งแจ้งเตือนก่อนกิจกรรมเริ่ม โดยนับถอยหลังตามเวลาที่กำหนด และส่ง Notification เข้ากระดิ่งและเด้งป๊อปอัปแจ้งเตือนทันที
            </Text>

            {/* Target Username */}
            <Text style={styles.fieldLabel}>ผู้ใช้เป้าหมาย:</Text>
            <TextInput
              style={styles.inputField}
              value={targetUsername}
              onChangeText={setTargetUsername}
              placeholder="xBiCx"
            />

            {/* Countdown seconds */}
            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
              ตั้งเวลานับถอยหลัง (วินาที):
            </Text>
            <TextInput
              style={styles.inputField}
              value={countdownSeconds}
              onChangeText={setCountdownSeconds}
              keyboardType="numeric"
              placeholder="เช่น 10 (วินาที)"
            />

            {/* Quick Presets */}
            <View style={styles.quickPresetRow}>
              {[5, 10, 30, 60].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.quickChip,
                    countdownSeconds === s.toString() && styles.quickChipActive,
                  ]}
                  onPress={() => setCountdownSeconds(s.toString())}
                >
                  <Text
                    style={[
                      styles.quickChipText,
                      countdownSeconds === s.toString() && styles.quickChipTextActive,
                    ]}
                  >
                    {s} วินาที
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
              <TouchableOpacity
                onPress={() => setShowTestModal(false)}
                style={{ padding: 10 }}
              >
                <Text style={{ color: '#64748B', fontWeight: '600' }}>ยกเลิก</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleStartTestNotification}
                style={styles.startCountdownBtn}
              >
                <Ionicons name="play" size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
                  เริ่มนับถอยหลัง & ยิงแจ้งเตือน
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Notifications Modal */}
      <Modal visible={showNotifModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>การแจ้งเตือนกิจกรรม</Text>
              <TouchableOpacity onPress={() => setShowNotifModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.notifItem,
                    !item.is_read && styles.notifItemUnread,
                  ]}
                >
                  <Ionicons
                    name="alarm-outline"
                    size={24}
                    color="#2563EB"
                    style={{ marginRight: 10 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifTitle}>{item.title}</Text>
                    <Text style={styles.notifMsg}>{item.message}</Text>
                    <Text style={styles.notifTime}>
                      {new Date(item.created_at).toLocaleString('th-TH')}
                    </Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={{ padding: 30, alignItems: 'center' }}>
                  <Text style={{ color: '#94A3B8' }}>ไม่มีการแจ้งเตือนในขณะนี้</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Change IP Modal */}
      <Modal visible={showIpModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>ตั้งค่า IP คอมพิวเตอร์ Backend</Text>
            <Text style={{ fontSize: 13, color: '#64748B', marginVertical: 8 }}>
              เปลี่ยน IP ให้ตรงกับเครื่องคอมพิวเตอร์ที่รัน backend (Wi-Fi วงเดียวกัน)
            </Text>
            <TextInput
              style={styles.ipInput}
              value={serverIp}
              onChangeText={setServerIp}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
              <TouchableOpacity
                onPress={() => setShowIpModal(false)}
                style={{ padding: 8 }}
              >
                <Text style={{ color: '#64748B' }}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveIp}
                style={{ backgroundColor: '#1E3A8A', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>บันทึก</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Avatar Picker Modal */}
      <Modal
        visible={showAvatarModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAvatarModal(false)}
      >
        <TouchableOpacity
          style={styles.actionSheetOverlay}
          activeOpacity={1}
          onPress={() => setShowAvatarModal(false)}
        >
          <View style={styles.actionSheetContent}>
            <View style={styles.actionSheetHandle} />
            <Text style={styles.actionSheetTitle}>เปลี่ยนรูปโปรไฟล์</Text>
            <Text style={styles.actionSheetSubtitle}>เลือกวิธีการเปลี่ยนรูปประจำตัวของคุณ</Text>

            <TouchableOpacity
              style={styles.actionSheetOption}
              onPress={handleTakeWithCamera}
            >
              <View style={[styles.actionOptionIcon, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="camera" size={24} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionOptionText}>ถ่ายรูปใหม่</Text>
                <Text style={styles.actionOptionSubtext}>เปิดกล้องเพื่อถ่ายรูปทันที</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionSheetOption}
              onPress={handlePickFromGallery}
            >
              <View style={[styles.actionOptionIcon, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="images" size={24} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionOptionText}>เลือกจากคลังภาพ</Text>
                <Text style={styles.actionOptionSubtext}>เลือกรูปภาพจากอัลบั้มในอุปกรณ์</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionSheetCancelBtn}
              onPress={() => setShowAvatarModal(false)}
            >
              <Text style={styles.actionSheetCancelText}>ยกเลิก</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  popupNotificationCard: {
    position: 'absolute',
    top: 10,
    left: 16,
    right: 16,
    zIndex: 999,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
    borderLeftWidth: 5,
    borderLeftColor: '#2563EB',
  },
  popupLeftIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupTag: {
    color: '#93C5FD',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  popupTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  popupMessage: {
    color: '#CBD5E1',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  countdownBanner: {
    backgroundColor: '#EA580C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  countdownBannerText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarTouchable: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E2E8F0',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#2563EB',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
  },
  username: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  email: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  roleText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 2,
  },
  notifBtn: {
    position: 'relative',
    padding: 8,
  },
  notifBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
  },
  tabSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  subTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
  },
  activeSubTab: {
    backgroundColor: '#1E3A8A',
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  activeSubTabText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 30,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    marginTop: 10,
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  footerSection: {
    paddingHorizontal: 16,
    marginTop: 20,
    gap: 12,
  },
  testNotifBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  testNotifBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  settingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  settingBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  inputField: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
  },
  quickPresetRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  quickChip: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  quickChipActive: {
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  quickChipText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  quickChipTextActive: {
    color: '#1E3A8A',
    fontWeight: '700',
  },
  startCountdownBtn: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  notifItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  notifItemUnread: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  notifMsg: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
  },
  notifTime: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  ipInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  actionSheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 20,
  },
  actionSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  actionSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  actionSheetSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 20,
  },
  actionSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 14,
  },
  actionOptionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionOptionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  actionOptionSubtext: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  actionSheetCancelBtn: {
    marginTop: 18,
    paddingVertical: 14,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
  },
  actionSheetCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
});
