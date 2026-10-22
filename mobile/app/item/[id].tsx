import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api, { resolveImageUrl } from '../../services/api';
import { StorageService } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { CampusEvent, EventCategory } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { CampusMap } from '../../components/CampusMap';
import { CAMPUS_LOCATIONS } from '../../constants/campusLocations';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams();
  const [event, setEvent] = useState<CampusEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);

  // Edit Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState<EventCategory>('academic');
  const [editLocationName, setEditLocationName] = useState('');
  const [editLatitude, setEditLatitude] = useState(17.80902);
  const [editLongitude, setEditLongitude] = useState(102.74853);
  const [editEventDate, setEditEventDate] = useState('');
  const [editImageUri, setEditImageUri] = useState<string | null>(null);
  const [showEditMapPicker, setShowEditMapPicker] = useState(false);

  const { user } = useAuth();
  const router = useRouter();

  const categories: { key: EventCategory; label: string }[] = [
    { key: 'academic', label: '📖 วิชาการ/ติวสอบ' },
    { key: 'workshop', label: '💻 เวิร์กช็อป/อบรม' },
    { key: 'sports', label: '⚽ กีฬา/สันทนาการ' },
    { key: 'volunteer', label: '🌱 จิตอาสา' },
    { key: 'club', label: '🎭 ชมรม' },
  ];

  useEffect(() => {
    loadEventDetail();
  }, [id]);

  const loadEventDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/events/${id}`);
      const ev = res.data.event || res.data.item;
      setEvent(ev);
      setIsRegistered(!!ev.is_registered);
      setParticipantCount(ev.participant_count || 0);

      const favs = await StorageService.getFavorites();
      setIsFavorite(favs.includes(Number(id)));
    } catch (e) {
      console.warn('Error fetching event details, falling back to cache');
      const cached = await StorageService.getCachedItems();
      const found = cached.find((i) => i.id.toString() === id);
      if (found) {
        setEvent(found);
      } else {
        Alert.alert('เกิดข้อผิดพลาด', 'ไม่พบข้อมูลกิจกรรมนี้');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFav = async () => {
    if (!event) return;
    const newState = await StorageService.toggleFavorite(event.id);
    setIsFavorite(newState);
  };

  const handleToggleRegister = async () => {
    if (!event) return;
    setUpdating(true);
    try {
      const res = await api.post(`/events/${event.id}/register`);
      setIsRegistered(res.data.is_registered);
      setParticipantCount(res.data.participant_count);

      Alert.alert(
        res.data.is_registered ? 'ลงทะเบียนเข้าร่วมสำเร็จ' : 'ยกเลิกการลงทะเบียน',
        res.data.is_registered
          ? 'ระบบจะส่ง Notification แจ้งเตือนคุณล่วงหน้าก่อนเริ่มกิจกรรม!'
          : 'คุณได้ยกเลิกการเข้าร่วมกิจกรรมนี้แล้ว'
      );
    } catch (e: any) {
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกการลงทะเบียนได้');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateStatus = (newStatus: string) => {
    if (!event) return;

    Alert.alert(
      'ยืนยันการเปลี่ยนสถานะ',
      `คุณต้องการเปลี่ยนสถานะกิจกรรมเป็น "${newStatus === 'completed' ? 'สิ้นสุดกิจกรรมแล้ว' : newStatus}" ใช่หรือไม่?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ยืนยัน',
          onPress: async () => {
            setUpdating(true);
            try {
              const res = await api.patch(`/events/${event.id}/status`, { status: newStatus });
              setEvent(res.data.event || res.data.item);
              Alert.alert('สำเร็จ', 'อัปเดตสถานะกิจกรรมเรียบร้อย');
            } catch (err: any) {
              const msg = err.response?.data?.message || 'ไม่สามารถอัปเดตสถานะได้';
              Alert.alert('เกิดข้อผิดพลาด', msg);
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    if (!event) return;

    Alert.alert('ยืนยันการลบ', 'คุณแน่ใจหรือไม่ว่าต้องการลบกิจกรรมนี้?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบกิจกรรม',
        style: 'destructive',
        onPress: async () => {
          setUpdating(true);
          try {
            await api.delete(`/events/${event.id}`);
            Alert.alert('สำเร็จ', 'ลบกิจกรรมเรียบร้อย', [
              { text: 'ตกลง', onPress: () => router.back() },
            ]);
          } catch (e: any) {
            Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถลบกิจกรรมได้');
            setUpdating(false);
          }
        },
      },
    ]);
  };

  const handleOpenEdit = () => {
    if (!event) return;
    setEditTitle(event.title || '');
    setEditDescription(event.description || '');
    setEditCategory(event.category || 'academic');
    setEditLocationName(event.location_name || '');
    setEditLatitude(Number(event.latitude) || 17.80902);
    setEditLongitude(Number(event.longitude) || 102.74853);
    const d = event.event_date ? new Date(event.event_date) : new Date();
    setEditEventDate(d.toISOString().slice(0, 16));
    setEditImageUri(null);
    setShowEditModal(true);
  };

  const pickEditGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตให้เข้าถึงแกลเลอรีรูปภาพ');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0].uri) {
      setEditImageUri(result.assets[0].uri);
    }
  };

  const pickEditCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตให้เข้าถึงกล้องถ่ายภาพ');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0].uri) {
      setEditImageUri(result.assets[0].uri);
    }
  };

  const handleSaveEdit = async () => {
    if (!event) return;
    if (!editTitle.trim()) {
      Alert.alert('ข้อมูลไม่ครบ', 'กรุณากรอกชื่อกิจกรรม');
      return;
    }
    if (!editLocationName.trim()) {
      Alert.alert('ข้อมูลไม่ครบ', 'กรุณาระบุสถานที่จัดงาน');
      return;
    }

    setUpdating(true);
    try {
      const formData = new FormData();
      formData.append('title', editTitle.trim());
      formData.append('description', editDescription.trim());
      formData.append('category', editCategory);
      formData.append('locationName', editLocationName.trim());
      formData.append('latitude', editLatitude.toString());
      formData.append('longitude', editLongitude.toString());
      formData.append('eventDate', new Date(editEventDate).toISOString());

      if (editImageUri) {
        const filename = editImageUri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const fileType = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append('image', {
          uri: Platform.OS === 'ios' ? editImageUri.replace('file://', '') : editImageUri,
          name: filename,
          type: fileType,
        } as any);
      }

      const res = await api.patch(`/events/${event.id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const updated = res.data.event || res.data.item;
      setEvent(updated);
      setShowEditModal(false);
      Alert.alert('สำเร็จ', 'แก้ไขข้อมูลกิจกรรมเรียบร้อยแล้ว');
    } catch (err: any) {
      console.error('Error updating event:', err);
      const msg = err.response?.data?.message || 'ไม่สามารถแก้ไขกิจกรรมได้';
      Alert.alert('เกิดข้อผิดพลาด', msg);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={styles.loadingText}>กำลังโหลดรายละเอียดกิจกรรม...</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.notFoundText}>ไม่พบกิจกรรมที่ต้องการ</Text>
      </View>
    );
  }

  const isOwner = user && user.id === event.user_id;
  const eventDateObj = event.event_date ? new Date(event.event_date) : new Date(event.created_at);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Event Banner */}
      <View style={styles.imageContainer}>
        {resolveImageUrl(event.image_url) ? (
          <Image source={{ uri: resolveImageUrl(event.image_url)! }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="calendar-outline" size={64} color="#93C5FD" />
            <Text style={styles.placeholderText}>ไม่มีรูปโปสเตอร์ประชาสัมพันธ์</Text>
          </View>
        )}

        <TouchableOpacity style={styles.favBtn} onPress={handleToggleFav}>
          <Ionicons
            name={isFavorite ? 'bookmark' : 'bookmark-outline'}
            size={24}
            color={isFavorite ? '#2563EB' : '#64748B'}
          />
        </TouchableOpacity>
      </View>

      {/* Main Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.badgesRow}>
          <StatusBadge category={event.category} size="medium" />
          <StatusBadge status={event.status} size="medium" />
        </View>

        <Text style={styles.title}>{event.title}</Text>

        {/* Date Box Highlight */}
        <View style={styles.dateHighlightBox}>
          <Ionicons name="alarm-outline" size={24} color="#1E3A8A" />
          <View style={{ flex: 1 }}>
            <Text style={styles.dateHighlightTitle}>กำหนดการจัดกิจกรรม</Text>
            <Text style={styles.dateHighlightValue}>
              {eventDateObj.toLocaleDateString('th-TH', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })} น.
            </Text>
          </View>
        </View>

        {/* RSVP Register Action Button (Primary Feature) */}
        <TouchableOpacity
          style={[styles.rsvpBtn, isRegistered ? styles.rsvpRegisteredBtn : styles.rsvpActiveBtn]}
          onPress={handleToggleRegister}
          disabled={updating}
        >
          {updating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons
                name={isRegistered ? 'notifications-circle' : 'notifications-outline'}
                size={22}
                color="#FFFFFF"
              />
              <Text style={styles.rsvpBtnText}>
                {isRegistered ? '✓ ลงทะเบียนแล้ว (รับการแจ้งเตือน)' : '🔔 ลงทะเบียนเข้าร่วม (เตือนก่อนเริ่ม)'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.participantBanner}>
          <Ionicons name="people" size={16} color="#475569" />
          <Text style={styles.participantBannerText}>
            มีผู้ลงทะเบียนและตั้งการแจ้งเตือนแล้ว {participantCount} คน
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Description Section */}
        <Text style={styles.sectionHeader}>รายละเอียดกิจกรรม</Text>
        <Text style={styles.description}>
          {event.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
        </Text>

        <View style={styles.divider} />

        {/* Location Section */}
        <Text style={styles.sectionHeader}>สถานที่จัดกิจกรรมในมหาวิทยาลัย</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location" size={18} color="#2563EB" />
          <Text style={styles.locationName}>{event.location_name}</Text>
        </View>

        {/* Embedded Map */}
        <View style={styles.mapContainer}>
          <CampusMap
            height={200}
            items={[event]}
            selectedItem={event}
          />
        </View>

        <View style={styles.divider} />

        {/* Author Section */}
        <Text style={styles.sectionHeader}>ผู้จัดกิจกรรม</Text>
        <View style={styles.authorRow}>
          <View style={styles.authorAvatar}>
            <Ionicons name="person" size={20} color="#1E3A8A" />
          </View>
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{event.author_name || 'สมาชิก มข.'}</Text>
            {event.author_email && (
              <Text style={styles.authorEmail}>ติดต่อ: {event.author_email}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Owner Controls */}
      {isOwner && (
        <View style={styles.ownerCard}>
          <Text style={styles.ownerTitle}>จัดการกิจกรรมของคุณ</Text>

          <TouchableOpacity
            style={styles.editBtn}
            onPress={handleOpenEdit}
            disabled={updating}
          >
            <Ionicons name="create-outline" size={18} color="#1E3A8A" />
            <Text style={styles.editBtnText}>แก้ไขข้อมูลกิจกรรม</Text>
          </TouchableOpacity>

          {event.status !== 'completed' ? (
            <TouchableOpacity
              style={styles.completeBtn}
              onPress={() => handleUpdateStatus('completed')}
              disabled={updating}
            >
              <Ionicons name="checkmark-done-circle" size={20} color="#FFFFFF" />
              <Text style={styles.completeBtnText}>สิ้นสุดกิจกรรมแล้ว</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
              <Text style={styles.completedText}>กิจกรรมนี้สิ้นสุดลงแล้ว</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDelete}
            disabled={updating}
          >
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
            <Text style={styles.deleteBtnText}>ลบประกาศกิจกรรมนี้</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Edit Event Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderIconWrap}>
                <Ionicons name="create" size={22} color="#1E3A8A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalHeaderTitle}>แก้ไขประกาศกิจกรรม</Text>
                <Text style={styles.modalHeaderSubtitle}>ปรับปรุงรายละเอียดและกำหนดการ</Text>
              </View>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Category */}
              <Text style={styles.inputLabel}>หมวดหมู่กิจกรรม</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.key}
                    style={[styles.categoryChip, editCategory === c.key && styles.categoryChipActive]}
                    onPress={() => setEditCategory(c.key)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        editCategory === c.key && styles.categoryChipTextActive,
                      ]}
                    >
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Title */}
              <Text style={styles.inputLabel}>ชื่อกิจกรรม *</Text>
              <TextInput
                style={styles.textInput}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="ระบุชื่อกิจกรรม"
              />

              {/* Date & Time */}
              <Text style={styles.inputLabel}>วันและเวลาจัดกิจกรรม (YYYY-MM-DDTHH:mm) *</Text>
              <TextInput
                style={styles.textInput}
                value={editEventDate}
                onChangeText={setEditEventDate}
                placeholder="2026-10-15T09:00"
              />

              {/* Location Name */}
              <Text style={styles.inputLabel}>สถานที่จัดงาน *</Text>
              <TextInput
                style={styles.textInput}
                value={editLocationName}
                onChangeText={setEditLocationName}
                placeholder="ระบุสถานที่ เช่น อาคารเรียนรวม"
              />

              {/* Landmarks quick select */}
              <Text style={styles.subInputLabel}>เลือกพิกัดอาคารสำคัญในวิทยาเขต:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {CAMPUS_LOCATIONS.map((loc) => (
                  <TouchableOpacity
                    key={loc.id}
                    style={styles.landmarkChip}
                    onPress={() => {
                      setEditLocationName(loc.name);
                      setEditLatitude(loc.latitude);
                      setEditLongitude(loc.longitude);
                    }}
                  >
                    <Text style={styles.landmarkChipText}>{loc.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Toggle Map Picker */}
              <TouchableOpacity
                style={styles.toggleMapBtn}
                onPress={() => setShowEditMapPicker(!showEditMapPicker)}
              >
                <Ionicons name="map-outline" size={16} color="#1E3A8A" />
                <Text style={styles.toggleMapBtnText}>
                  {showEditMapPicker ? 'ซ่อนแผนที่เลือกพิกัด' : 'แตะเพื่อเลือกจุดบนแผนที่'}
                </Text>
              </TouchableOpacity>

              {showEditMapPicker && (
                <View style={styles.editMapWrapper}>
                  <CampusMap
                    height={200}
                    selectionMode={true}
                    selectedLocation={{ latitude: editLatitude, longitude: editLongitude }}
                    onLocationSelect={(loc) => {
                      setEditLatitude(loc.latitude);
                      setEditLongitude(loc.longitude);
                    }}
                  />
                  <Text style={styles.coordText}>
                    พิกัด: {editLatitude.toFixed(5)}, {editLongitude.toFixed(5)}
                  </Text>
                </View>
              )}

              {/* Description */}
              <Text style={styles.inputLabel}>รายละเอียดกิจกรรม</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="รายละเอียดเพิ่มเติมของกิจกรรม"
                multiline
                numberOfLines={4}
              />

              {/* Image Picker */}
              <Text style={styles.inputLabel}>เปลี่ยนรูปภาพโปสเตอร์</Text>
              <View style={styles.imageActionRow}>
                <TouchableOpacity style={styles.imagePickerBtn} onPress={pickEditCamera}>
                  <Ionicons name="camera" size={20} color="#1E3A8A" />
                  <Text style={styles.imagePickerBtnText}>ถ่ายรูปใหม่</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.imagePickerBtn} onPress={pickEditGallery}>
                  <Ionicons name="images" size={20} color="#1E3A8A" />
                  <Text style={styles.imagePickerBtnText}>เลือกจากคลัง</Text>
                </TouchableOpacity>
              </View>

              {editImageUri ? (
                <View style={styles.imagePreviewWrap}>
                  <Image source={{ uri: editImageUri }} style={styles.imagePreview} resizeMode="cover" />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => setEditImageUri(null)}
                  >
                    <Ionicons name="close" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : event.image_url ? (
                <View style={styles.currentImageNotice}>
                  <Ionicons name="image-outline" size={16} color="#64748B" />
                  <Text style={styles.currentImageNoticeText}>ใช้รูปโปสเตอร์เดิมที่มีอยู่แล้ว</Text>
                </View>
              ) : null}
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowEditModal(false)}
                disabled={updating}
              >
                <Text style={styles.modalCancelBtnText}>ยกเลิก</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveEdit}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.modalSaveBtnText}>บันทึกการแก้ไข</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
  },
  notFoundText: {
    color: '#64748B',
    fontSize: 16,
  },
  imageContainer: {
    height: 240,
    width: '100%',
    backgroundColor: '#DBEAFE',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
  },
  placeholderText: {
    marginTop: 8,
    color: '#60A5FA',
    fontSize: 13,
    fontWeight: '500',
  },
  favBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
  },
  dateHighlightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 14,
    borderRadius: 12,
    gap: 12,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#1E3A8A',
  },
  dateHighlightTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  dateHighlightValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E3A8A',
    marginTop: 2,
  },
  rsvpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginVertical: 4,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  rsvpActiveBtn: {
    backgroundColor: '#1E3A8A',
  },
  rsvpRegisteredBtn: {
    backgroundColor: '#059669',
  },
  rsvpBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  participantBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  participantBannerText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  locationName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  mapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorInfo: {
    marginLeft: 12,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  authorEmail: {
    fontSize: 13,
    color: '#64748B',
  },
  ownerCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    gap: 10,
  },
  ownerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  completeBtn: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  completedText: {
    color: '#15803D',
    fontWeight: '600',
    fontSize: 13,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  deleteBtnText: {
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 13,
  },
  editBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  editBtnText: {
    color: '#1E3A8A',
    fontWeight: '700',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  modalHeaderIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalHeaderSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalScroll: {
    marginTop: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 12,
    marginBottom: 6,
  },
  subInputLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    marginBottom: 6,
  },
  categoryScroll: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#1E3A8A',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  landmarkChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  landmarkChipText: {
    fontSize: 12,
    color: '#1E3A8A',
    fontWeight: '500',
  },
  toggleMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    marginBottom: 8,
  },
  toggleMapBtnText: {
    fontSize: 12,
    color: '#1E3A8A',
    fontWeight: '600',
  },
  editMapWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 12,
  },
  coordText: {
    fontSize: 11,
    color: '#475569',
    padding: 6,
    backgroundColor: '#F8FAFC',
    textAlign: 'center',
    fontWeight: '500',
  },
  imageActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  imagePickerBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  imagePickerBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  imagePreviewWrap: {
    position: 'relative',
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentImageNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  currentImageNoticeText: {
    fontSize: 12,
    color: '#64748B',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  modalSaveBtn: {
    flex: 1.5,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modalSaveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
