import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CampusEvent } from '../types';
import { StatusBadge } from './StatusBadge';
import { resolveImageUrl } from '../services/api';

interface ItemCardProps {
  item: CampusEvent;
  onPress: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  onPress,
  isFavorite = false,
  onToggleFavorite,
}) => {
  const eventDateObj = item.event_date ? new Date(item.event_date) : new Date(item.created_at);
  const formattedEventDate = eventDateObj.toLocaleDateString('th-TH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const resolvedImage = resolveImageUrl(item.image_url);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <View style={styles.imageContainer}>
        {resolvedImage ? (
          <Image
            source={{ uri: resolvedImage }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons
              name={
                item.category === 'sports'
                  ? 'football-outline'
                  : item.category === 'workshop'
                  ? 'laptop-outline'
                  : item.category === 'volunteer'
                  ? 'heart-outline'
                  : 'calendar-outline'
              }
              size={48}
              color="#3B82F6"
            />
          </View>
        )}

        <View style={styles.badgeOverlay}>
          <StatusBadge category={item.category} />
        </View>

        {/* Date Tag over Image */}
        <View style={styles.dateTagOverlay}>
          <Ionicons name="time" size={12} color="#FFFFFF" />
          <Text style={styles.dateTagText}>{formattedEventDate} น.</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          {onToggleFavorite && (
            <TouchableOpacity
              onPress={onToggleFavorite}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={isFavorite ? 'bookmark' : 'bookmark-outline'}
                size={22}
                color={isFavorite ? '#2563EB' : '#9CA3AF'}
              />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {item.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={14} color="#2563EB" />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.location_name}
            </Text>
          </View>
          <StatusBadge status={item.status} />
        </View>

        <View style={styles.footerRow}>
          <View style={styles.participantTag}>
            <Ionicons name="people-outline" size={14} color="#64748B" />
            <Text style={styles.participantText}>
              {item.participant_count || 0} คนลงทะเบียน
            </Text>
          </View>

          {item.author_name && (
            <Text style={styles.authorText} numberOfLines={1}>
              ผู้จัด: {item.author_name}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
  },
  imageContainer: {
    height: 150,
    width: '100%',
    backgroundColor: '#EFF6FF',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
  },
  badgeOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  dateTagOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dateTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  content: {
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  description: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#334155',
    marginLeft: 4,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  participantTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  participantText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  authorText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
});
