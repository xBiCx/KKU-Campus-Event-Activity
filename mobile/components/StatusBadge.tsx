import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EventCategory, EventStatus } from '../types';

interface StatusBadgeProps {
  status?: EventStatus | string;
  category?: EventCategory | string;
  type?: any;
  size?: 'small' | 'medium';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  category,
  type,
  size = 'small',
}) => {
  const cat = category || (type !== 'lost' && type !== 'found' ? type : undefined);

  if (cat) {
    const getCategoryConfig = (c: string) => {
      switch (c) {
        case 'academic':
          return { label: '📖 วิชาการ/ติวสอบ', bg: '#EFF6FF', color: '#1D4ED8' };
        case 'workshop':
          return { label: '💻 เวิร์กช็อป/อบรม', bg: '#F5F3FF', color: '#6D28D9' };
        case 'sports':
          return { label: '⚽ กีฬา/สันทนาการ', bg: '#ECFDF5', color: '#047857' };
        case 'volunteer':
          return { label: '🌱 จิตอาสา/บำเพ็ญประโยชน์', bg: '#FEF3C7', color: '#B45309' };
        case 'club':
          return { label: '🎭 ชมรม/กิจกรรมนักศึกษา', bg: '#FDF2F8', color: '#BE185D' };
        default:
          return { label: '📢 กิจกรรมทั่วไป', bg: '#F1F5F9', color: '#475569' };
      }
    };

    const config = getCategoryConfig(cat);

    return (
      <View
        style={[
          styles.badge,
          { backgroundColor: config.bg },
          size === 'medium' && styles.mediumBadge,
        ]}
      >
        <Text
          style={[
            styles.text,
            { color: config.color },
            size === 'medium' && styles.mediumText,
          ]}
        >
          {config.label}
        </Text>
      </View>
    );
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'upcoming':
        return { label: '⏳ เร็วๆ นี้', bg: '#EFF6FF', color: '#2563EB' };
      case 'ongoing':
        return { label: '🔴 กำลังดำเนินกิจกรรม', bg: '#FEF2F2', color: '#DC2626' };
      case 'completed':
        return { label: '✅ สิ้นสุดกิจกรรมแล้ว', bg: '#ECFDF5', color: '#059669' };
      case 'cancelled':
        return { label: '❌ ยกเลิกกิจกรรม', bg: '#F3F4F6', color: '#6B7280' };
      default:
        return { label: status || 'ทั่วไป', bg: '#F3F4F6', color: '#4B5563' };
    }
  };

  const config = getStatusConfig();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg },
        size === 'medium' && styles.mediumBadge,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: config.color },
          size === 'medium' && styles.mediumText,
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  mediumBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  mediumText: {
    fontSize: 14,
  },
});
