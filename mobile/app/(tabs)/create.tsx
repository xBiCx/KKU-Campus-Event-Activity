import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import api from '../../services/api';
import { StorageService } from '../../services/storage';
import { EventCategory } from '../../types';
import { CAMPUS_LOCATIONS, CAMPUS_CENTER } from '../../constants/campusLocations';
import { CampusMap } from '../../components/CampusMap';

export default function CreateEventScreen() {
  const [category, setCategory] = useState<EventCategory>('academic');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('อาคารเรียนรวม');
  const [latitude, setLatitude] = useState(CAMPUS_CENTER.latitude);
  const [longitude, setLongitude] = useState(CAMPUS_CENTER.longitude);
  const [eventDate, setEventDate] = useState(() => {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
  });
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const router = useRouter();

  useEffect(() => {
    checkDraft();
  }, []);

  const checkDraft = async () => {
    const draft = await StorageService.getDraft();
    if (draft && draft.title) {
      Alert.alert(
        'พบแบบร่างที่บันทึกไว้',
        `คุณมีแบบร่างกิจกรรม "${draft.title}" ต้องการนำข้อมูลกลับมาใช้หรือไม่?`,
        [
          { text: 'ลบแบบร่าง', style: 'destructive', onPress: () => StorageService.clearDraft() },
          {
            text: 'นำมาใช้',
            onPress: () => {
              if (draft.type) setCategory(draft.type as EventCategory);
              setTitle(draft.title || '');
              setDescription(draft.description || '');
              setLocationName(draft.locationName || '');
              if (draft.latitude) setLatitude(draft.latitude);
              if (draft.longitude) setLongitude(draft.longitude);
              if (draft.imageUri) setImageUri(draft.imageUri);
            },
          },
        ]
      );
    }
  };

  const handleSaveDraft = async () => {
    await StorageService.saveDraft({
      type: category,
      title,
      description,
      locationName,
      latitude,
      longitude,
      imageUri,
    });
    Alert.alert('สำเร็จ', 'บันทึกแบบร่างกิจกรรมไว้ในเครื่องเรียบร้อยแล้ว');
  };

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตให้แอปเข้าถึงแกลเลอรีรูปภาพ');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhotoWithCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตให้แอปเข้าถึงกล้องถ่ายภาพ');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  const getCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('ต้องการสิทธิ์', 'กรุณาเปิดการเข้าถึงตำแหน่ง GPS');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);
      Alert.alert('สำเร็จ', `ดึงพิกัด GPS สำเร็จ: ${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`);
    } catch (e) {
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถดึงตำแหน่งพิกัดได้');
    } finally {
      setGettingLocation(false);
    }
  };

  const handleSelectLandmark = (landmark: typeof CAMPUS_LOCATIONS[0]) => {
    setLocationName(landmark.name);
    setLatitude(landmark.latitude);
    setLongitude(landmark.longitude);
  };

  const categories: { key: EventCategory; label: string }[] = [
    { key: 'academic', label: '📖 วิชาการ/ติวสอบ' },
    { key: 'workshop', label: '💻 เวิร์กช็อป/อบรม' },
    { key: 'sports', label: '⚽ กีฬา/สันทนาการ' },
    { key: 'volunteer', label: '🌱 จิตอาสา' },
    { key: 'club', label: '🎭 ชมรม' },
  ];

  const handlePressSubmit = () => {
    if (!title.trim()) {
      Alert.alert('ข้อมูลไม่ครบ', 'กรุณากรอกชื่อกิจกรรม');
      return;
    }
    if (!locationName.trim()) {
      Alert.alert('ข้อมูลไม่ครบ', 'กรุณาระบุสถานที่จัดงาน');
      return;
    }
    // Open verification review modal
    setShowConfirmModal(true);
  };

  const handleConfirmPublish = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('category', category);
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('locationName', locationName.trim());
      formData.append('latitude', latitude.toString());
      formData.append('longitude', longitude.toString());
      formData.append('eventDate', new Date(eventDate).toISOString());

      if (imageUri) {
        const filename = imageUri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const fileType = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append('image', {
          uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
          name: filename,
          type: fileType,
        } as any);
      }

      await api.post('/events', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      await StorageService.clearDraft();

      Alert.alert('สำเร็จ', 'ประชาสัมพันธ์กิจกรรมเรียบร้อยแล้ว! ระบบจะแจ้งเตือนผู้เข้าร่วมก่อนเริ่มงาน', [
        {
          text: 'ตกลง',
          onPress: () => {
            setTitle('');
            setDescription('');
            setImageUri(null);
            router.replace('/(tabs)/home');
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error creating event:', error);
      const msg = error.response?.data?.message || 'ไม่สามารถสร้างกิจกรรมได้ โปรดลองอีกครั้ง';
      Alert.alert('เกิดข้อผิดพลาด', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Category Select */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          หมวดหมู่กิจกรรม <Text style={styles.required}>*</Text>
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map((c) => {
            const isSelected = category === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                style={[styles.categoryBtn, isSelected && styles.activeCategoryBtn]}
                onPress={() => setCategory(c.key)}
              >
                <Text style={[styles.categoryBtnText, isSelected && styles.activeCategoryBtnText]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Title */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          ชื่อกิจกรรม / หัวข้องาน <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="เช่น ติว Midterm Data Structures, แข่งขันแบดมินตัน"
          value={title}
          onChangeText={setTitle}
        />
      </View>

      {/* Date & Time */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          วันและเวลาเริ่มกิจกรรม (YYYY-MM-DDTHH:mm) <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="2026-09-28T13:00"
          value={eventDate}
          onChangeText={setEventDate}
        />
        <Text style={styles.helperText}>
          * ระบบจะตรวจสอบและส่ง Notification แจ้งเตือนผู้ลงทะเบียนล่วงหน้าก่อนถึงเวลานี้
        </Text>
      </View>

      {/* Description */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>รายละเอียดและกำหนดการ</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="ระบุวัตถุประสงค์ คุณสมบัติผู้เข้าร่วม สิ่งที่ต้องเตรียมมา หรือลิงก์เพิ่มเติม..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Image Poster */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>รูปโปสเตอร์ / แบนเนอร์กิจกรรม</Text>
        {imageUri ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
            <TouchableOpacity
              style={styles.removeImageBtn}
              onPress={() => setImageUri(null)}
            >
              <Ionicons name="trash" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.imageActionRow}>
            <TouchableOpacity style={styles.imageBtn} onPress={takePhotoWithCamera}>
              <Ionicons name="camera-outline" size={24} color="#1E3A8A" />
              <Text style={styles.imageBtnText}>ถ่ายภาพ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.imageBtn} onPress={pickFromGallery}>
              <Ionicons name="images-outline" size={24} color="#1E3A8A" />
              <Text style={styles.imageBtnText}>เลือกโปสเตอร์</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Location */}
      <View style={styles.inputGroup}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>
            สถานที่ / ห้องจัดกิจกรรม <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.gpsBtn}
            onPress={getCurrentLocation}
            disabled={gettingLocation}
          >
            {gettingLocation ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <>
                <Ionicons name="locate" size={14} color="#2563EB" />
                <Text style={styles.gpsText}>GPS ปัจจุบัน</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder="ระบุสถานที่ เช่น อาคารเรียนรวม ห้อง 301, โรงยิม"
          value={locationName}
          onChangeText={setLocationName}
        />

        <Text style={styles.subLabel}>เลือกจุดสำคัญใน มข. วิทยาเขตหนองคาย:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
          {CAMPUS_LOCATIONS.map((loc) => (
            <TouchableOpacity
              key={loc.id}
              style={[
                styles.locationChip,
                locationName === loc.name && styles.activeLocationChip,
              ]}
              onPress={() => handleSelectLandmark(loc)}
            >
              <Text
                style={[
                  styles.locationChipText,
                  locationName === loc.name && styles.activeLocationChipText,
                ]}
              >
                {loc.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={styles.toggleMapBtn}
          onPress={() => setShowMapPicker(!showMapPicker)}
        >
          <Ionicons
            name={showMapPicker ? 'chevron-up' : 'map-outline'}
            size={16}
            color="#1E3A8A"
          />
          <Text style={styles.toggleMapText}>
            {showMapPicker ? 'ซ่อนแผนที่ปักหมุด' : 'ปักหมุดจุดจัดงานบนแผนที่'}
          </Text>
        </TouchableOpacity>

        {showMapPicker && (
          <View style={styles.mapPickerWrapper}>
            <Text style={styles.mapHint}>* แตะบนแผนที่เพื่อเปลี่ยนจุดจัดกิจกรรม</Text>
            <CampusMap
              height={240}
              selectionMode={true}
              selectedLocation={{ latitude, longitude }}
              onLocationSelect={(loc) => {
                setLatitude(loc.latitude);
                setLongitude(loc.longitude);
              }}
            />
            <Text style={styles.coordText}>
              พิกัด: {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </Text>
          </View>
        )}
      </View>

      {/* Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.draftBtn} onPress={handleSaveDraft}>
          <Ionicons name="bookmark-outline" size={18} color="#475569" />
          <Text style={styles.draftBtnText}>บันทึกแบบร่าง</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.disabledBtn]}
          onPress={handlePressSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="megaphone" size={20} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>ตรวจสอบและประกาศ</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Confirmation & Review Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderIconWrap}>
                <Ionicons name="clipboard-outline" size={24} color="#1E3A8A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalHeaderTitle}>ตรวจสอบข้อมูลก่อนประกาศ</Text>
                <Text style={styles.modalHeaderSubtitle}>โปรดตรวจสอบความถูกต้องของกิจกรรม</Text>
              </View>
              <TouchableOpacity onPress={() => setShowConfirmModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Image Preview if selected */}
              {imageUri && (
                <View style={styles.reviewImageWrap}>
                  <Image source={{ uri: imageUri }} style={styles.reviewImage} resizeMode="cover" />
                </View>
              )}

              {/* Category */}
              <View style={styles.reviewField}>
                <Text style={styles.reviewLabel}>หมวดหมู่</Text>
                <View style={styles.reviewBadge}>
                  <Text style={styles.reviewBadgeText}>
                    {categories.find((c) => c.key === category)?.label || category}
                  </Text>
                </View>
              </View>

              {/* Title */}
              <View style={styles.reviewField}>
                <Text style={styles.reviewLabel}>ชื่อกิจกรรม</Text>
                <Text style={styles.reviewTitleText}>{title}</Text>
              </View>

              {/* Date & Time */}
              <View style={styles.reviewField}>
                <Text style={styles.reviewLabel}>กำหนดการจัดกิจกรรม</Text>
                <View style={styles.reviewRow}>
                  <Ionicons name="calendar-outline" size={16} color="#2563EB" />
                  <Text style={styles.reviewValueText}>
                    {new Date(eventDate).toLocaleString('th-TH', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })} น.
                  </Text>
                </View>
              </View>

              {/* Location */}
              <View style={styles.reviewField}>
                <Text style={styles.reviewLabel}>สถานที่จัดงาน</Text>
                <View style={styles.reviewRow}>
                  <Ionicons name="location-outline" size={16} color="#DC2626" />
                  <Text style={styles.reviewValueText}>{locationName}</Text>
                </View>
                <Text style={styles.reviewSubValue}>
                  พิกัด: {latitude.toFixed(5)}, {longitude.toFixed(5)}
                </Text>
              </View>

              {/* Description */}
              <View style={styles.reviewField}>
                <Text style={styles.reviewLabel}>รายละเอียด</Text>
                <Text style={styles.reviewDescText}>
                  {description.trim() ? description.trim() : '(ไม่มีรายละเอียดเพิ่มเติม)'}
                </Text>
              </View>

              <View style={styles.reviewNoticeBox}>
                <Ionicons name="information-circle-outline" size={18} color="#2563EB" />
                <Text style={styles.reviewNoticeText}>
                  เมื่อประกาศแล้ว สมาชิกจะสามารถกดลงทะเบียนและรับการแจ้งเตือนได้ทันที คุณสามารถแก้ไขหรือลบโพสต์ได้ภายหลัง
                </Text>
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>แก้ไขข้อมูล</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleConfirmPublish}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.modalConfirmBtnText}>ยืนยันการประกาศ</Text>
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
    padding: 16,
    paddingBottom: 40,
  },
  inputGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  activeCategoryBtn: {
    backgroundColor: '#1E3A8A',
  },
  categoryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  activeCategoryBtnText: {
    color: '#FFFFFF',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 11,
    color: '#2563EB',
    marginTop: 6,
    fontWeight: '500',
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 12,
    marginBottom: 6,
  },
  required: {
    color: '#EF4444',
  },
  input: {
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
  },
  imageActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  imageBtn: {
    flex: 1,
    height: 90,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    gap: 4,
  },
  imageBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  imagePreviewContainer: {
    position: 'relative',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  gpsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  presetScroll: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  locationChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  activeLocationChip: {
    backgroundColor: '#1E3A8A',
  },
  locationChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
  },
  activeLocationChipText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  toggleMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    marginTop: 8,
    gap: 6,
  },
  toggleMapText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  mapPickerWrapper: {
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  mapHint: {
    fontSize: 11,
    color: '#64748B',
    padding: 6,
    backgroundColor: '#F1F5F9',
    textAlign: 'center',
  },
  coordText: {
    fontSize: 11,
    color: '#475569',
    padding: 6,
    backgroundColor: '#F8FAFC',
    textAlign: 'center',
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  draftBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  draftBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E3A8A',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
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
    maxHeight: '85%',
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
  reviewImageWrap: {
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 14,
    backgroundColor: '#F1F5F9',
  },
  reviewImage: {
    width: '100%',
    height: '100%',
  },
  reviewField: {
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
  },
  reviewLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  reviewBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reviewBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  reviewTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewValueText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  reviewSubValue: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    paddingLeft: 22,
  },
  reviewDescText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  reviewNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 6,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#2563EB',
  },
  reviewNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 17,
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
  modalConfirmBtn: {
    flex: 1.5,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modalConfirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
