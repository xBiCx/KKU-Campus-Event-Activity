import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import { updateActiveBaseUrl } from '../../services/api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Server IP Modal state
  const [showIpModal, setShowIpModal] = useState(false);
  const [serverIp, setServerIp] = useState('10.238.177.249');

  const { login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    StorageService.getServerIp().then((ip) => {
      if (ip) setServerIp(ip);
    });
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password.trim());
      router.replace('/(tabs)/home');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'ไม่สามารถเข้าสู่ระบบได้ โปรดตรวจสอบอีเมล/รหัสผ่าน หรือ IP Server';
      Alert.alert('เข้าสู่ระบบไม่สำเร็จ', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('student@kku.ac.th');
    setPassword('123456');
  };

  const handleSaveIp = async () => {
    const trimmed = serverIp.trim();
    await StorageService.setServerIp(trimmed);
    updateActiveBaseUrl(trimmed);
    setShowIpModal(false);
    Alert.alert('สำเร็จ', `บันทึก IP Server: ${trimmed} เรียบร้อย`);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header & Logo */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Ionicons name="compass" size={48} color="#1E3A8A" />
          </View>
          <Text style={styles.appTitle}>KKU Campus Event Activity</Text>
          <Text style={styles.campusSubtitle}>มหาวิทยาลัยขอนแก่น วิทยาเขตหนองคาย</Text>
          <Text style={styles.subText}>ระบบค้นหาและประชาสัมพันธ์กิจกรรมในมหาวิทยาลัย</Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>เข้าสู่ระบบ</Text>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>อีเมล (Email)</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="เช่น student@kku.ac.th"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>รหัสผ่าน (Password)</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="กรอกรหัสผ่าน"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#94A3B8"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Demo Fill Button */}
          <TouchableOpacity style={styles.demoButton} onPress={handleFillDemo}>
            <Ionicons name="flash-outline" size={16} color="#2563EB" />
            <Text style={styles.demoText}>กรอกบัญชีทดสอบ (student@kku.ac.th)</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>เข้าสู่ระบบ</Text>
            )}
          </TouchableOpacity>

          {/* Go to Register */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>ยังไม่มีบัญชีผู้ใช้? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.registerLink}>สมัครสมาชิกที่นี่</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Server IP Config Link */}
        <TouchableOpacity style={styles.ipConfigBtn} onPress={() => setShowIpModal(true)}>
          <Ionicons name="settings-outline" size={14} color="#64748B" />
          <Text style={styles.ipConfigText}>ตั้งค่า IP Backend (ปัจจุบัน: {serverIp})</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal Configure Server IP */}
      <Modal visible={showIpModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>ตั้งค่า IP คอมพิวเตอร์ Backend</Text>
            <Text style={styles.modalDesc}>
              ใส่ IP เครื่องคอมพิวเตอร์ของคุณที่รัน Backend (บน Wi-Fi เดียวกัน)
            </Text>
            <TextInput
              style={styles.ipInput}
              value={serverIp}
              onChangeText={setServerIp}
              placeholder="เช่น 192.168.1.17"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowIpModal(false)}
              >
                <Text style={styles.cancelText}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleSaveIp}>
                <Text style={styles.saveText}>บันทึก</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  scrollContent: {
    padding: 24,
    justifyContent: 'center',
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  campusSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563EB',
    marginTop: 4,
  },
  subText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 18,
    gap: 6,
  },
  demoText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
  },
  footerText: {
    fontSize: 14,
    color: '#64748B',
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  ipConfigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 6,
  },
  ipConfigText: {
    fontSize: 12,
    color: '#64748B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  modalDesc: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 14,
  },
  ipInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancel: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelText: {
    color: '#64748B',
    fontWeight: '600',
  },
  modalSave: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
