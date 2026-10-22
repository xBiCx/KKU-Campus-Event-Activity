export type EventCategory = 'academic' | 'workshop' | 'sports' | 'volunteer' | 'club' | 'general';
export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

export interface User {
  id: number;
  username: string;
  email: string;
  avatar_url?: string | null;
  createdAt?: string;
  stats?: {
    my_events_count: string | number;
    registered_count: string | number;
    completed_count: string | number;
  };
}

export interface CampusEvent {
  id: number;
  user_id: number;
  category: EventCategory;
  title: string;
  description: string;
  image_url: string | null;
  latitude: number | string;
  longitude: number | string;
  location_name: string;
  event_date: string;
  status: EventStatus;
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_email?: string;
  participant_count?: number;
  is_registered?: boolean;
}

// Alias Item to CampusEvent for complete backward compatibility
export type Item = CampusEvent;
export type ItemType = EventCategory;
export type ItemStatus = EventStatus;

export interface NotificationItem {
  id: number;
  user_id: number;
  event_id?: number;
  item_id?: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  event_title?: string;
}

export interface CampusLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  description: string;
}
