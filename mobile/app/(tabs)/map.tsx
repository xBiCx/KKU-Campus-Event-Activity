import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api, { resolveImageUrl } from '../../services/api';
import { StorageService } from '../../services/storage';
import { CampusEvent } from '../../types';
import { CampusMap } from '../../components/CampusMap';
import { StatusBadge } from '../../components/StatusBadge';

const { width } = Dimensions.get('window');

export default function MapScreen() {
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CampusEvent | null>(null);
  const router = useRouter();

  const loadEvents = async () => {
    try {
      const res = await api.get('/events');
      setEvents(res.data.events || res.data.items || []);
    } catch (e) {
      console.warn('Map: failed to load events from server, using offline cache');
      const cached = await StorageService.getCachedItems();
      setEvents(cached);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [])
  );

  return (
    <View style={styles.container}>
      <CampusMap
        items={events}
        selectedItem={selectedEvent}
        onSelectItem={(item) => setSelectedEvent(item)}
      />

      {/* Selected Event Preview Floating Card */}
      {selectedEvent && (
        <View style={styles.previewCard}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setSelectedEvent(null)}
          >
            <Ionicons name="close-circle" size={24} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.cardContent}>
            {resolveImageUrl(selectedEvent.image_url) ? (
              <Image source={{ uri: resolveImageUrl(selectedEvent.image_url)! }} style={styles.previewImage} />
            ) : (
              <View style={styles.previewPlaceholder}>
                <Ionicons
                  name="calendar"
                  size={28}
                  color="#2563EB"
                />
              </View>
            )}

            <View style={styles.previewInfo}>
              <View style={styles.badgeRow}>
                <StatusBadge category={selectedEvent.category} />
                <StatusBadge status={selectedEvent.status} />
              </View>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {selectedEvent.title}
              </Text>
              <Text style={styles.previewLocation} numberOfLines={1}>
                📍 {selectedEvent.location_name}
              </Text>
              {selectedEvent.event_date && (
                <Text style={styles.previewDate} numberOfLines={1}>
                  ⏰ {new Date(selectedEvent.event_date).toLocaleString('th-TH')}
                </Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={styles.detailButton}
            onPress={() => router.push(`/item/${selectedEvent.id}`)}
          >
            <Text style={styles.detailButtonText}>ดูรายละเอียดกิจกรรม & ลงทะเบียน</Text>
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E5E7EB',
  },
  previewCard: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  previewPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewInfo: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 24,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  previewLocation: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  previewDate: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 2,
  },
  detailButton: {
    backgroundColor: '#1E3A8A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  detailButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
