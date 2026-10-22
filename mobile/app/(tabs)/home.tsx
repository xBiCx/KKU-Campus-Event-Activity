import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { StorageService } from '../../services/storage';
import { CampusEvent, EventCategory } from '../../types';
import { ItemCard } from '../../components/ItemCard';

export default function HomeScreen() {
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | EventCategory>('all');
  const [favorites, setFavorites] = useState<number[]>([]);

  const router = useRouter();

  const fetchEvents = async () => {
    try {
      const params: any = {};
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await api.get('/events', { params });
      const fetchedEvents = res.data.events || res.data.items || [];
      setEvents(fetchedEvents);
      setIsOffline(false);

      // Cache offline
      await StorageService.cacheItems(fetchedEvents);
    } catch (error) {
      console.warn('Network error or server unreachable, falling back to cache:', error);
      setIsOffline(true);
      const cached = await StorageService.getCachedItems();

      let filtered = cached;
      if (selectedCategory !== 'all') {
        filtered = filtered.filter((i) => i.category === selectedCategory);
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (i) =>
            i.title.toLowerCase().includes(query) ||
            i.description.toLowerCase().includes(query) ||
            i.location_name.toLowerCase().includes(query)
        );
      }
      setEvents(filtered);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadFavorites = async () => {
    const favs = await StorageService.getFavorites();
    setFavorites(favs);
  };

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
      loadFavorites();
    }, [selectedCategory])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
    loadFavorites();
  };

  const handleToggleFavorite = async (itemId: number) => {
    await StorageService.toggleFavorite(itemId);
    loadFavorites();
  };

  const categories: { key: 'all' | EventCategory; label: string; icon: string }[] = [
    { key: 'all', label: 'ทั้งหมด', icon: 'grid-outline' },
    { key: 'academic', label: 'วิชาการ/ติวสอบ', icon: 'book-outline' },
    { key: 'workshop', label: 'เวิร์กช็อป/อบรม', icon: 'laptop-outline' },
    { key: 'sports', label: 'กีฬา/สันทนาการ', icon: 'football-outline' },
    { key: 'volunteer', label: 'จิตอาสา', icon: 'heart-outline' },
  ];

  return (
    <View style={styles.container}>
      {/* Offline Banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#991B1B" />
          <Text style={styles.offlineText}>
            โหมดออฟไลน์: กำลังแสดงข้อมูลกิจกรรมจากแคชในเครื่อง
          </Text>
        </View>
      )}

      {/* Search Header */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="ค้นหาชื่อกิจกรรม, อาคารจัดงาน, สัมมนา..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={fetchEvents}
            returnKeyType="search"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Horizontal Category Scroll */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.filterChip, isActive && styles.activeFilterChip]}
                onPress={() => setSelectedCategory(cat.key)}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={15}
                  color={isActive ? '#FFFFFF' : '#64748B'}
                />
                <Text style={[styles.filterText, isActive && styles.activeFilterText]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Events List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>กำลังดึงข้อมูลกิจกรรมในมหาวิทยาลัย...</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              onPress={() => router.push(`/item/${item.id}`)}
              isFavorite={favorites.includes(item.id)}
              onToggleFavorite={() => handleToggleFavorite(item.id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1E3A8A']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={56} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>ไม่พบกิจกรรมที่ค้นหา</Text>
              <Text style={styles.emptySub}>
                ยังไม่มีกิจกรรมในหมวดนี้ หรือคุณสามารถสร้างกิจกรรมใหม่ได้ที่แท็บด้านล่าง
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  offlineText: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: '600',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  filterSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  activeFilterChip: {
    backgroundColor: '#1E3A8A',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 24,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
  },
});
